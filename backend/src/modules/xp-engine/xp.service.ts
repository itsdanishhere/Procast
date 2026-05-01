import { prisma } from "../../shared/prisma/client";
import type { DbClient } from "../../shared/prisma/types";
import { jsonInput } from "../../shared/prisma/types";
import { worldProgressionService } from "../world-progression/world.service";

const focusXp: Record<string, number> = {
  POMODORO: 35,
  SHORT_BREAK: 0,
  LONG_BREAK: 0,
  DEEP_FOCUS_45: 80,
  DEEP_FOCUS_60: 110,
  CUSTOM: 60
};

export class XpService {
  sessionXp(mode: string, plannedSeconds: number) {
    const base = focusXp[mode] ?? 35;
    const enduranceBonus = plannedSeconds >= 45 * 60 ? 20 : 0;
    return base + enduranceBonus;
  }

  async grant(input: {
    userId: string;
    focusSessionId?: string;
    sourceType: string;
    sourceId: string;
    reason: string;
    amount: number;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.$transaction(async (tx) => this.grantInTransaction(input, tx));
  }

  async grantInTransaction(
    input: {
      userId: string;
      focusSessionId?: string;
      sourceType: string;
      sourceId: string;
      reason: string;
      amount: number;
      idempotencyKey: string;
      metadata?: Record<string, unknown>;
    },
    tx: DbClient
  ) {
    const existing = await tx.xpLedger.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (existing) return existing;

    const progress =
      (await tx.userProgress.findUnique({ where: { userId: input.userId } })) ??
      (await tx.userProgress.create({ data: { userId: input.userId } }));
    const balanceAfter = Math.max(0, progress.totalXp + input.amount);

    const ledger = await tx.xpLedger.create({
      data: {
        userId: input.userId,
        focusSessionId: input.focusSessionId,
        sourceType: input.sourceType as never,
        sourceId: input.sourceId,
        reason: input.reason,
        amount: input.amount,
        balanceAfter,
        idempotencyKey: input.idempotencyKey,
        metadata: jsonInput(input.metadata ?? {})
      }
    });

    await tx.userProgress.update({
      where: { userId: input.userId },
      data: {
        totalXp: balanceAfter,
        version: { increment: 1 }
      }
    });

    await worldProgressionService.reconcile(input.userId, tx);
    return ledger;
  }
}

export const xpService = new XpService();
