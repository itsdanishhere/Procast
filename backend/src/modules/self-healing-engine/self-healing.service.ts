import { subMinutes } from "date-fns";

import { prisma } from "../../shared/prisma/client";
import { recoveryQueue } from "../queue-system/queues";
import { worldProgressionService } from "../world-progression/world.service";

export class SelfHealingService {
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
          recoveryAction: "Mark session RECOVERED and preserve accumulated server time",
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

      const extraSeconds = session.startedAt ? Math.max(0, Math.floor((Date.now() - session.startedAt.getTime()) / 1000)) : 0;
      await tx.focusSession.update({
        where: { id: sessionId },
        data: {
          status: "RECOVERED",
          accumulatedFocusSeconds: session.accumulatedFocusSeconds + extraSeconds,
          lastHeartbeatAt: new Date()
        }
      });
      await tx.timerEvent.create({
        data: {
          userId: session.userId,
          focusSessionId: session.id,
          eventType: "RECOVERED",
          metadata: { recoveryId, extraSeconds }
        }
      });
      await tx.recoveryLog.update({
        where: { id: recoveryId },
        data: { status: "SUCCEEDED", success: true, resolvedAt: new Date() }
      });
    });
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
