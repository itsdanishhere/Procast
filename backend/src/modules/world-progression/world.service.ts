import { prisma } from "../../shared/prisma/client";
import type { DbClient } from "../../shared/prisma/types";
import { stageAt, stageForXp, stageIndex } from "./world.constants";

export class WorldProgressionService {
  async reconcile(userId: string, tx: DbClient = prisma) {
    const progress =
      (await tx.userProgress.findUnique({ where: { userId } })) ??
      (await tx.userProgress.create({ data: { userId } }));

    const target = stageForXp(progress.totalXp);
    const currentIndex = stageIndex(progress.currentWorldStage);
    const targetIndex = stageIndex(target.stage);
    const highestIndex = Math.max(stageIndex(progress.highestWorldStage), targetIndex);
    const lockedIndex = Math.max(stageIndex(progress.lockedWorldStage), Math.min(targetIndex, targetIndex - progress.lockStrikes));
    const updated = await tx.userProgress.update({
      where: { userId },
      data: {
        currentLevel: target.level,
        currentWorldStage: target.stage,
        highestWorldStage: stageAt(highestIndex).stage,
        lockedWorldStage: stageAt(lockedIndex).stage,
        version: { increment: 1 }
      }
    });

    if (targetIndex > currentIndex) {
      await tx.worldUnlock.upsert({
        where: { userId_stage: { userId, stage: target.stage } },
        update: {
          unlockedAt: new Date(),
          lockedAt: null,
          reason: "XP threshold reached"
        },
        create: {
          userId,
          stage: target.stage,
          unlockedAt: new Date(),
          reason: "XP threshold reached"
        }
      });
    }

    return updated;
  }

  async applyLockBack(userId: string, missedDays: number, tx: DbClient = prisma) {
    if (missedDays < 3) return tx.userProgress.findUnique({ where: { userId } });
    const progress =
      (await tx.userProgress.findUnique({ where: { userId } })) ??
      (await tx.userProgress.create({ data: { userId } }));
    const newStrikes = progress.lockStrikes + Math.floor(missedDays / 3);
    const currentIndex = stageIndex(progress.currentWorldStage);
    const lockedStage = stageAt(currentIndex - newStrikes);

    const updated = await tx.userProgress.update({
      where: { userId },
      data: {
        lockStrikes: newStrikes,
        lockedWorldStage: lockedStage.stage,
        version: { increment: 1 }
      }
    });

    await tx.worldUnlock.updateMany({
      where: {
        userId,
        stage: { in: progress.currentWorldStage === lockedStage.stage ? [] : [progress.currentWorldStage] }
      },
      data: {
        lockedAt: new Date(),
        reason: `Lock-back after ${missedDays} missed days`
      }
    });

    return updated;
  }
}

export const worldProgressionService = new WorldProgressionService();
