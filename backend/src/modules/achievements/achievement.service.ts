import { prisma } from "../../shared/prisma/client";
import type { DbClient } from "../../shared/prisma/types";
import { notificationService } from "../notifications/notification.service";
import { stageIndex } from "../world-progression/world.constants";
import { xpService } from "../xp-engine/xp.service";
import { achievementDefinitions } from "./achievement.definitions";

export class AchievementService {
  async seedDefinitions() {
    for (const achievement of achievementDefinitions) {
      await prisma.achievement.upsert({
        where: { code: achievement.code },
        update: {
          title: achievement.title,
          description: achievement.description,
          xpReward: achievement.xpReward,
          rule: { code: achievement.code },
          active: true
        },
        create: {
          ...achievement,
          rule: { code: achievement.code },
          active: true
        }
      });
    }
  }

  async evaluate(userId: string, tx: DbClient = prisma) {
    const completedSessions = await tx.focusSession.count({ where: { userId, status: "COMPLETED" } });
    const deepSessions = await tx.focusSession.count({
      where: { userId, status: "COMPLETED", mode: { in: ["DEEP_FOCUS_45", "DEEP_FOCUS_60"] } }
    });
    const progress = await tx.userProgress.findUnique({ where: { userId } });
    const streak = await tx.userStreak.findUnique({ where: { userId } });

    const eligible = new Set<string>();
    if (completedSessions >= 1) eligible.add("first_session");
    if ((streak?.dailyStreak ?? 0) >= 7) eligible.add("seven_day_streak");
    if (deepSessions >= 1) eligible.add("deep_focus_master");
    if (stageIndex(progress?.currentWorldStage ?? "") >= stageIndex("TOWN")) eligible.add("town_builder");
    if ((streak?.weeklyStreak ?? 0) >= 1 && completedSessions >= 7) eligible.add("no_skip_week");
    if (completedSessions >= 100) eligible.add("hundred_sessions");

    const unlocked = [];
    for (const code of eligible) {
      const achievement = await tx.achievement.findUnique({ where: { code } });
      if (!achievement) continue;
      const existing = await tx.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: achievement.id } }
      });
      if (existing) continue;

      const award = await tx.userAchievement.create({
        data: { userId, achievementId: achievement.id, metadata: { source: "engine" } }
      });
      await xpService.grantInTransaction(
        {
          userId,
          sourceType: "ACHIEVEMENT",
          sourceId: achievement.id,
          reason: `Achievement unlocked: ${achievement.title}`,
          amount: achievement.xpReward,
          idempotencyKey: `achievement:${userId}:${achievement.code}`
        },
        tx
      );
      await notificationService.createInTransaction(
        {
          userId,
          type: "ACHIEVEMENT_REWARD",
          title: `Achievement unlocked: ${achievement.title}`,
          body: `${achievement.description} +${achievement.xpReward} XP.`
        },
        tx
      );
      unlocked.push(award);
    }
    return unlocked;
  }
}

export const achievementService = new AchievementService();
