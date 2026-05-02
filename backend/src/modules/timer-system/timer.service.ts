import { prisma } from "../../shared/prisma/client";
import type { DbClient } from "../../shared/prisma/types";
import { badRequest, conflict, notFound } from "../../shared/errors/app-error";
import { achievementService } from "../achievements/achievement.service";
import { notificationService } from "../notifications/notification.service";
import { streakService } from "../streak-engine/streak.service";
import { xpService } from "../xp-engine/xp.service";

function isActiveStatus(status: string) {
  return status === "CREATED" || status === "RUNNING" || status === "PAUSED";
}

function isStopwatchSession(session: { antiCheatFlags: unknown }) {
  return Array.isArray(session.antiCheatFlags)
    ? session.antiCheatFlags.some((flag) => flag && typeof flag === "object" && (flag as { type?: unknown }).type === "stopwatch_mode")
    : false;
}

function computeAccumulatedSeconds(session: {
  status: string;
  startedAt: Date | null;
  pausedAt: Date | null;
  accumulatedFocusSeconds: number;
}) {
  if (!session.startedAt) return session.accumulatedFocusSeconds;
  if (session.status === "RUNNING") {
    return session.accumulatedFocusSeconds + Math.max(0, Math.floor((Date.now() - session.startedAt.getTime()) / 1000));
  }
  return session.accumulatedFocusSeconds;
}

export class TimerService {
  private async progressSnapshot(userId: string, tx: DbClient = prisma) {
    const progress = await tx.userProgress.findUnique({ where: { userId } });
    const streak = await tx.userStreak.findUnique({ where: { userId } });

    return { progress, streak };
  }

  async start(input: {
    userId: string;
    taskId?: string;
    mode: string;
    plannedSeconds: number;
    clientStartedAt?: string;
    idempotencyKey: string;
    replaceExisting?: boolean;
    isStopwatch?: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      const existingByKey = await tx.focusSession.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });
      if (existingByKey) return existingByKey;

      const activeSessions = await tx.focusSession.findMany({
        where: {
          userId: input.userId,
          status: { in: ["CREATED", "RUNNING", "PAUSED"] },
          deletedAt: null
        },
        orderBy: { createdAt: "desc" }
      });
      const now = new Date();
      if (activeSessions.length > 0 && !input.replaceExisting) {
        throw conflict("An active timer already exists. Start a new timer only with explicit replacement.");
      }

      for (const active of activeSessions) {
        const accumulatedFocusSeconds = computeAccumulatedSeconds(active);
        await tx.focusSession.update({
          where: { id: active.id },
          data: {
            status: "ABANDONED",
            accumulatedFocusSeconds,
            abandonedAt: now,
            expectedEndAt: null,
            pausedAt: null,
            lastHeartbeatAt: now,
            integrityScore: Math.max(0, active.integrityScore - 5),
            antiCheatFlags: [
              ...(Array.isArray(active.antiCheatFlags) ? active.antiCheatFlags : []),
              {
                type: "auto_abandoned_on_new_start",
                reason: "New timer started before previous timer closed.",
                at: now.toISOString()
              }
            ]
          }
        });
        await tx.timerEvent.create({
          data: {
            userId: input.userId,
            focusSessionId: active.id,
            eventType: "ABANDONED",
            metadata: {
              reason: "auto_abandoned_on_new_start",
              replacedByMode: input.mode,
              replacedByIdempotencyKey: input.idempotencyKey,
              accumulatedFocusSeconds
            }
          }
        });
      }

      if (input.taskId) {
        const task = await tx.task.findFirst({
          where: { id: input.taskId, userId: input.userId, deletedAt: null }
        });
        if (!task) throw notFound("Task not found.");
      }

      const session = await tx.focusSession.create({
        data: {
          userId: input.userId,
          taskId: input.taskId,
          mode: input.mode as never,
          status: "RUNNING",
          plannedSeconds: input.plannedSeconds,
          startedAt: now,
          expectedEndAt: input.isStopwatch ? null : new Date(now.getTime() + input.plannedSeconds * 1000),
          lastHeartbeatAt: now,
          clientStartedAt: input.clientStartedAt ? new Date(input.clientStartedAt) : undefined,
          idempotencyKey: input.idempotencyKey,
          antiCheatFlags: input.isStopwatch
            ? [
                {
                  type: "stopwatch_mode",
                  reason: "Open-ended stopwatch session; completion uses server-confirmed elapsed time.",
                  at: now.toISOString()
                }
              ]
            : undefined
        }
      });

      await tx.timerEvent.create({
        data: {
          userId: input.userId,
          focusSessionId: session.id,
          eventType: "STARTED",
          clientTime: input.clientStartedAt ? new Date(input.clientStartedAt) : undefined,
          metadata: { mode: input.mode, isStopwatch: Boolean(input.isStopwatch) }
        }
      });

      return session;
    });
  }

  async active(userId: string) {
    return prisma.focusSession.findFirst({
      where: { userId, status: { in: ["CREATED", "RUNNING", "PAUSED"] }, deletedAt: null },
      include: { task: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async list(userId: string, limit = 25) {
    const sessions = await prisma.focusSession.findMany({
      where: { userId, deletedAt: null },
      include: {
        task: { select: { title: true } },
        xpEntries: { where: { reversedAt: null }, select: { amount: true } },
        distractionLogs: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100)
    });

    return sessions.map((session) => ({
      id: session.id,
      taskId: session.taskId,
      mode: isStopwatchSession(session) ? "STOPWATCH" : session.mode,
      status: session.status,
      durationMinutes: Math.round(session.plannedSeconds / 60),
      actualSeconds: session.accumulatedFocusSeconds,
      xpEarned: session.xpEntries.reduce((sum, entry) => sum + entry.amount, 0),
      startedAt: session.startedAt ?? session.createdAt,
      endedAt: session.completedAt ?? session.abandonedAt ?? session.updatedAt,
      task: session.task,
      distractionReason: session.distractionLogs[0]?.reasonCategory ?? null
    }));
  }

  async pause(userId: string, sessionId: string) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
      if (!session) throw notFound("Focus session not found.");
      if (session.status !== "RUNNING") throw badRequest("Only running sessions can be paused.");
      const accumulatedFocusSeconds = computeAccumulatedSeconds(session);
      const updated = await tx.focusSession.update({
        where: { id: sessionId },
        data: {
          status: "PAUSED",
          accumulatedFocusSeconds,
          pausedAt: new Date(),
          pauseCount: { increment: 1 },
          lastHeartbeatAt: new Date()
        }
      });
      await tx.timerEvent.create({
        data: { userId, focusSessionId: sessionId, eventType: "PAUSED", metadata: { accumulatedFocusSeconds } }
      });
      return updated;
    });
  }

  async resume(userId: string, sessionId: string) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
      if (!session) throw notFound("Focus session not found.");
      if (session.status !== "PAUSED") throw badRequest("Only paused sessions can be resumed.");
      const now = new Date();
      const remaining = Math.max(0, session.plannedSeconds - session.accumulatedFocusSeconds);
      const isStopwatch = isStopwatchSession(session);
      const updated = await tx.focusSession.update({
        where: { id: sessionId },
        data: {
          status: "RUNNING",
          startedAt: now,
          pausedAt: null,
          expectedEndAt: isStopwatch ? null : new Date(now.getTime() + remaining * 1000),
          lastHeartbeatAt: now
        }
      });
      await tx.timerEvent.create({
        data: { userId, focusSessionId: sessionId, eventType: "RESUMED" }
      });
      return updated;
    });
  }

  async heartbeat(userId: string, sessionId: string, input: { clientTime?: string; accumulatedFocusSeconds?: number }) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
      if (!session) throw notFound("Focus session not found.");
      if (!isActiveStatus(session.status)) throw badRequest("Session is not active.");

      const serverAccumulated = computeAccumulatedSeconds(session);
      const clientAccumulated = input.accumulatedFocusSeconds ?? serverAccumulated;
      const drift = Math.abs(clientAccumulated - serverAccumulated);
      const antiCheatFlags = Array.isArray(session.antiCheatFlags) ? session.antiCheatFlags : [];
      if (drift > 90) antiCheatFlags.push({ type: "timer_drift", drift, at: new Date().toISOString() });

      const updated = await tx.focusSession.update({
        where: { id: sessionId },
        data: {
          lastHeartbeatAt: new Date(),
          integrityScore: drift > 90 ? Math.max(0, session.integrityScore - 15) : session.integrityScore,
          antiCheatFlags
        }
      });
      await tx.timerEvent.create({
        data: {
          userId,
          focusSessionId: sessionId,
          eventType: drift > 90 ? "ANTI_CHEAT_FLAGGED" : "HEARTBEAT",
          clientTime: input.clientTime ? new Date(input.clientTime) : undefined,
          metadata: { clientAccumulated, serverAccumulated, drift }
        }
      });
      return updated;
    });
  }

  async complete(userId: string, sessionId: string) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
      if (!session) throw notFound("Focus session not found.");
      if (!isActiveStatus(session.status)) throw badRequest("Session cannot be completed.");

      const isStopwatch = isStopwatchSession(session);
      const serverAccumulatedSeconds = computeAccumulatedSeconds(session);
      const accumulatedFocusSeconds = isStopwatch ? serverAccumulatedSeconds : Math.min(session.plannedSeconds, serverAccumulatedSeconds);
      const completedPlannedSeconds = isStopwatch ? Math.max(1, accumulatedFocusSeconds) : session.plannedSeconds;
      const minimumTrustSeconds = Math.floor(session.plannedSeconds * 0.9);
      if (!isStopwatch && session.mode !== "SHORT_BREAK" && session.mode !== "LONG_BREAK" && accumulatedFocusSeconds < minimumTrustSeconds) {
        throw badRequest("Timer completion rejected. Server-confirmed focus time is too short.");
      }

      const completedAt = new Date();
      const updated = await tx.focusSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          plannedSeconds: completedPlannedSeconds,
          accumulatedFocusSeconds,
          completedAt,
          lastHeartbeatAt: completedAt
        }
      });
      await tx.timerEvent.create({
        data: { userId, focusSessionId: sessionId, eventType: "COMPLETED", metadata: { accumulatedFocusSeconds } }
      });

      const amount = xpService.sessionXp(session.mode, completedPlannedSeconds);
      let xpEarned = 0;
      if (amount > 0) {
        await xpService.grantInTransaction(
          {
            userId,
            focusSessionId: session.id,
            sourceType: "FOCUS_SESSION",
            sourceId: session.id,
            reason: `Completed ${session.mode} focus session`,
            amount,
            idempotencyKey: `focus-session:${session.id}`
          },
          tx
        );
        xpEarned = amount;
        await streakService.applyCompletedSession(userId, completedAt, tx);
        await achievementService.evaluate(userId, tx);
      }

      const snapshot = await this.progressSnapshot(userId, tx);
      return {
        session: { ...updated, mode: isStopwatch ? "STOPWATCH" : updated.mode, xpEarned },
        ...snapshot
      };
    });
  }

  async abandon(
    userId: string,
    sessionId: string,
    input: { reason?: string; reasonCategory?: string; customReason?: string } = {}
  ) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
      if (!session) throw notFound("Focus session not found.");
      if (!isActiveStatus(session.status)) throw badRequest("Session is already closed.");
      const accumulatedFocusSeconds = computeAccumulatedSeconds(session);
      const reasonCategory = input.reasonCategory?.trim() || "Unspecified";
      const reason = input.reason?.trim() || reasonCategory;
      const updated = await tx.focusSession.update({
        where: { id: sessionId },
        data: {
          status: "ABANDONED",
          abandonedAt: new Date(),
          accumulatedFocusSeconds,
          integrityScore: Math.max(0, session.integrityScore - 20),
          antiCheatFlags: [...(Array.isArray(session.antiCheatFlags) ? session.antiCheatFlags : []), { type: "early_exit", reason }]
        }
      });
      await tx.distractionLog.create({
        data: {
          userId,
          focusSessionId: sessionId,
          reasonCategory,
          customReason: input.customReason?.trim() || undefined,
          source: "early_exit"
        }
      });
      await tx.timerEvent.create({
        data: {
          userId,
          focusSessionId: sessionId,
          eventType: "ABANDONED",
          metadata: { reason, reasonCategory, customReason: input.customReason, accumulatedFocusSeconds }
        }
      });
      await notificationService.createInTransaction(
        {
          userId,
          type: "STREAK_WARNING",
          title: "Focus session ended early",
          body: `Logged distraction: ${reasonCategory}. Your world grows only from completed focus sessions.`
        },
        tx
      );
      return updated;
    });
  }
}

export const timerService = new TimerService();
