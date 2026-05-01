import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/http/async-handler";
import { prisma } from "../../shared/prisma/client";
import { notFound } from "../../shared/errors/app-error";

export const userRoutes = Router();
userRoutes.use(authMiddleware);

userRoutes.get(
  "/me",
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findFirst({
      where: { id: request.auth!.userId, deletedAt: null },
      include: { profile: true, settings: true, progress: true, streak: true }
    });
    if (!user) throw notFound("User not found.");
    response.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        accountStatus: user.accountStatus,
        emailVerified: Boolean(user.emailVerifiedAt),
        profile: user.profile,
        settings: user.settings,
        progress: user.progress,
        streak: user.streak
      }
    });
  })
);
