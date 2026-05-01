import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/http/async-handler";
import { analyticsService } from "./analytics.service";

export const analyticsRoutes = Router();
analyticsRoutes.use(authMiddleware);
analyticsRoutes.get(
  "/dashboard",
  asyncHandler(async (request, response) => {
    response.json(await analyticsService.dashboard(request.auth!.userId));
  })
);
