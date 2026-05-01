import { subMinutes } from "date-fns";

import { prisma } from "../../shared/prisma/client";
import type { DbClient } from "../../shared/prisma/types";
import { recoveryQueue } from "../queue-system/queues";
import { achievementService } from "../achievements/achievement.service";
import { streakService } from "../streak-engine/streak.service";
import { worldProgressionService } from "../world-progression/world.service";
import { xpService } from "../xp-engine/xp.service";

export class SelfHealingService {
  private isBreakMode(mode: string) {
    return mode === "SHORT_BREAK" || mode === "LONG_BREAK";
  }

  private minimumTrustSeconds(plannedSeconds: number) {
    return Math.floor(plannedSeconds * 0.9);
  }

  private async finalizeRecoveredSession(
    tx: DbClient,
    session: {
      id: string;
      userId: string;
      mode: string;
      plannedSeconds: number;
      accumulatedFocusSeconds: number;
      startedAt: Date | null;
      integrityScore: number;
      antiCheatFlags: unknown;
    },
    reason: string,
    recoveryId?: string
  ) {
    const now = new Date();
    const extraSeconds = session.startedAt ? Math.max(0, Math.floor((Date.now() - session.startedAt.getTime()) / 1000)) : 0;
    const totalAccumulated = Math.max(0, session.accumulatedFocusSeconds + extraSeconds);
    const cappedAccumulated = Math.min(session.plannedSeconds, totalAccumulated);
    const trusted = this.isBreakMode(session.mode) || cappedAccumulated >= this.minimumTrustSeconds(session.plannedSeconds);

    if (trusted) {
      const completed = await tx.focusSession.update({
        where: { id: session.id },
        data: {
          status: "COMPLETED",
          accumulatedFocusSeconds: cappedAccumulated,
          completedAt: now,
          expectedEndAt: null,
          pausedAt: null,
          lastHeartbeatAt: now
        }
      });
      await tx.timerEvent.create({
        data: {
          userId: session.userId,
          focusSessionId: session.id,
          eventType: "COMPLETED",
          metadata: { reason, recoveryId, extraSeconds, recovered: true, accumulatedFocusSeconds: cappedAccumulated }
        }
      });

      if (!this.isBreakMode(session.mode)) {
        const amount = xpService.sessionXp(session.mode, session.plannedSeconds);
        if (amount > 0) {
          await xpService.grantInTransaction(
            {
              userId: session.userId,
              focusSessionId: session.id,
              sourceType: "FOCUS_SESSION",
              sourceId: session.id,
              reason: `Recovered completion for ${session.mode} focus session`,
              amount,
              idempotencyKey: `focus-session:${session.id}`
            },
            tx
          );
          await streakService.applyCompletedSession(session.userId, now, tx);
          await achievementService.evaluate(session.userId, tx);
        }
      }

      return { completed, trusted: true, accumulatedFocusSeconds: cappedAccumulated, extraSeconds };
    }

    const abandoned = await tx.focusSession.update({
      where: { id: session.id },
      data: {
        status: "ABANDONED",
        accumulatedFocusSeconds: cappedAccumulated,
        abandonedAt: now,
        expectedEndAt: null,
        pausedAt: null,
        lastHeartbeatAt: now,
        integrityScore: Math.max(0, session.integrityScore - 10),
        antiCheatFlags: [
          ...(Array.isArray(session.antiCheatFlags) ? session.antiCheatFlags : []),
          {
            type: "recovery_abandon",
            reason,
            at: now.toISOString(),
            accumulatedFocusSeconds: cappedAccumulated
          }
        ]
      }
    });
    await tx.timerEvent.create({
      data: {
        userId: session.userId,
        focusSessionId: session.id,
        eventType: "ABANDONED",
        metadata: { reason, recoveryId, extraSeconds, recovered: true, accumulatedFocusSeconds: cappedAccumulated }
      }
    });
    return { completed: abandoned, trusted: false, accumulatedFocusSeconds: cappedAccumulated, extraSeconds };
  }

  async detectAndRecoverStuckSessions() {
    const cutoff = subMinutes(new Date(), 3);
    const sessions = await prisma.focusSession.findMany({
      where: {
        status: "RUNNING",
        lastHeartbeatAt: { lt: cutoff },
        deletedAt: null
      },
      take: 100
    });

    for (const session of sessions) {
      const recovery = await prisma.recoveryLog.create({
        data: {
          userId: session.userId,
          failureType: "stuck_timer",
          cause: "No heartbeat received within recovery window",
          affectedEntity: session.id,
          recoveryAction: "Finalize session as COMPLETED or ABANDONED based on server-trusted elapsed time",
          status: "QUEUED",
          metadata: { lastHeartbeatAt: session.lastHeartbeatAt }
        }
      });
      await recoveryQueue.add("recover-stuck-session", { recoveryId: recovery.id, sessionId: session.id });
    }
    return sessions.length;
  }

  async recoverStuckSession(recoveryId: string, sessionId: string) {
    await prisma.$transaction(async (tx) => {
      const session = await tx.focusSession.findUnique({ where: { id: sessionId } });
      if (!session || session.status !== "RUNNING") {
        await tx.recoveryLog.update({
          where: { id: recoveryId },
          data: { status: "SUCCEEDED", success: true, resolvedAt: new Date(), metadata: { skipped: true } }
        });
        return;
      }

      const result = await this.finalizeRecoveredSession(tx, session, "stuck_timer_recovery", recoveryId);
      await tx.recoveryLog.update({
        where: { id: recoveryId },
        data: {
          status: "SUCCEEDED",
          success: true,
          resolvedAt: new Date(),
          metadata: {
            trustedCompletion: result.trusted,
            accumulatedFocusSeconds: result.accumulatedFocusSeconds,
            extraSeconds: result.extraSeconds
          }
        }
      });
    });
  }

  async repairRecoveredSessions(limit = 200) {
    const sessions = await prisma.focusSession.findMany({
      where: {
        status: "RECOVERED",
        deletedAt: null,
        completedAt: null,
        abandonedAt: null
      },
      orderBy: { updatedAt: "asc" },
      take: limit
    });

    for (const session of sessions) {
      await prisma.$transaction(async (tx) => {
        const live = await tx.focusSession.findUnique({ where: { id: session.id } });
        if (!live || live.status !== "RECOVERED") return;

        await this.finalizeRecoveredSession(tx, live, "repair_recovered_session");
      });
    }
    return sessions.length;
  }

  async repairProgress(userId: string) {
    return prisma.$transaction(async (tx) => {
      const aggregate = await tx.xpLedger.aggregate({
        where: { userId, reversedAt: null },
        _sum: { amount: true }
      });
      await tx.userProgress.upsert({
        where: { userId },
        update: { totalXp: Math.max(0, aggregate._sum.amount ?? 0), version: { increment: 1 } },
        create: { userId, totalXp: Math.max(0, aggregate._sum.amount ?? 0) }
      });
      return worldProgressionService.reconcile(userId, tx);
    });
  }
}

export const selfHealingService = new SelfHealingService();
