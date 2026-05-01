import { z } from "zod";
import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/http/async-handler";
import { validateBody } from "../../shared/http/validate";
import { prisma } from "../../shared/prisma/client";
import { notificationService } from "./notification.service";

const markReadSchema = z.object({
  ids: z.array(z.string()).optional()
});

export const notificationRoutes = Router();
notificationRoutes.use(authMiddleware);

notificationRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: request.auth!.userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    response.json({ notifications });
  })
);

notificationRoutes.patch(
  "/read",
  validateBody(markReadSchema),
  asyncHandler(async (request, response) => {
    await notificationService.markRead(request.auth!.userId, request.body.ids);
    response.status(204).send();
  })
);
