import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/http/async-handler";
import { prisma } from "../../shared/prisma/client";

export const achievementRoutes = Router();
achievementRoutes.use(authMiddleware);

achievementRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const [definitions, awards] = await Promise.all([
      prisma.achievement.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
      prisma.userAchievement.findMany({ where: { userId: request.auth!.userId } })
    ]);
    response.json({
      achievements: definitions.map((achievement) => ({
        ...achievement,
        unlocked: awards.some((award) => award.achievementId === achievement.id),
        unlockedAt: awards.find((award) => award.achievementId === achievement.id)?.unlockedAt ?? null
      }))
    });
  })
);
