import { prisma } from "../../shared/prisma/client";
import { badRequest, conflict, notFound } from "../../shared/errors/app-error";
import { achievementService } from "../achievements/achievement.service";
import { notificationService } from "../notifications/notification.service";
import { streakService } from "../streak-engine/streak.service";
import { xpService } from "../xp-engine/xp.service";

function isActiveStatus(status: string) {
  return status === "CREATED" || status === "RUNNING" || status === "PAUSED";
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
  async start(input: {
    userId: string;
    taskId?: string;
    mode: string;
    plannedSeconds: number;
    clientStartedAt?: string;
    idempotencyKey: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const existingByKey = await tx.focusSession.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });
      if (existingByKey) return existingByKey;

      const active = await tx.focusSession.findFirst({
        where: {
          userId: input.userId,
          status: { in: ["CREATED", "RUNNING", "PAUSED"] },
          deletedAt: null
        }
      });
      if (active) throw conflict("An active timer already exists. Resume or abandon it before starting another.");

      if (input.taskId) {
        const task = await tx.task.findFirst({
          where: { id: input.taskId, userId: input.userId, deletedAt: null }
        });
        if (!task) throw notFound("Task not found.");
      }

      const now = new Date();
      const session = await tx.focusSession.create({
        data: {
          userId: input.userId,
          taskId: input.taskId,
          mode: input.mode as never,
          status: "RUNNING",
          plannedSeconds: input.plannedSeconds,
          startedAt: now,
          expectedEndAt: new Date(now.getTime() + input.plannedSeconds * 1000),
          lastHeartbeatAt: now,
          clientStartedAt: input.clientStartedAt ? new Date(input.clientStartedAt) : undefined,
          idempotencyKey: input.idempotencyKey
        }
      });

      await tx.timerEvent.create({
        data: {
          userId: input.userId,
          focusSessionId: session.id,
          eventType: "STARTED",
          clientTime: input.clientStartedAt ? new Date(input.clientStartedAt) : undefined,
          metadata: { mode: input.mode }
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
      const updated = await tx.focusSession.update({
        where: { id: sessionId },
        data: {
          status: "RUNNING",
          startedAt: now,
          pausedAt: null,
          expectedEndAt: new Date(now.getTime() + remaining * 1000),
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

      const accumulatedFocusSeconds = Math.min(session.plannedSeconds, computeAccumulatedSeconds(session));
      const minimumTrustSeconds = Math.floor(session.plannedSeconds * 0.9);
      if (session.mode !== "SHORT_BREAK" && session.mode !== "LONG_BREAK" && accumulatedFocusSeconds < minimumTrustSeconds) {
        throw badRequest("Timer completion rejected. Server-confirmed focus time is too short.");
      }

      const completedAt = new Date();
      const updated = await tx.focusSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          accumulatedFocusSeconds,
          completedAt,
          lastHeartbeatAt: completedAt
        }
      });
      await tx.timerEvent.create({
        data: { userId, focusSessionId: sessionId, eventType: "COMPLETED", metadata: { accumulatedFocusSeconds } }
      });

      const amount = xpService.sessionXp(session.mode, session.plannedSeconds);
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
        await streakService.applyCompletedSession(userId, completedAt, tx);
        await achievementService.evaluate(userId, tx);
      }

      return updated;
    });
  }

  async abandon(userId: string, sessionId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
      if (!session) throw notFound("Focus session not found.");
      if (!isActiveStatus(session.status)) throw badRequest("Session is already closed.");
      const accumulatedFocusSeconds = computeAccumulatedSeconds(session);
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
      await tx.timerEvent.create({
        data: { userId, focusSessionId: sessionId, eventType: "ABANDONED", metadata: { reason, accumulatedFocusSeconds } }
      });
      await notificationService.createInTransaction(
        {
          userId,
          type: "STREAK_WARNING",
          title: "Focus session ended early",
          body: "Your world grows only from completed focus sessions."
        },
        tx
      );
      return updated;
    });
  }
}

export const timerService = new TimerService();
