import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { writeRateLimit } from "../../middleware/rate-limit.middleware";
import { validateBody } from "../../shared/http/validate";
import { abandonSchema, heartbeatSchema, startTimerSchema } from "./timer.validation";
import { timerController } from "./timer.controller";

export const timerRoutes = Router();

timerRoutes.use(authMiddleware);
timerRoutes.get("/active", timerController.active);
timerRoutes.post("/sessions", writeRateLimit, validateBody(startTimerSchema), timerController.start);
timerRoutes.post("/sessions/:sessionId/pause", writeRateLimit, timerController.pause);
timerRoutes.post("/sessions/:sessionId/resume", writeRateLimit, timerController.resume);
timerRoutes.post("/sessions/:sessionId/heartbeat", writeRateLimit, validateBody(heartbeatSchema), timerController.heartbeat);
timerRoutes.post("/sessions/:sessionId/complete", writeRateLimit, timerController.complete);
timerRoutes.post("/sessions/:sessionId/abandon", writeRateLimit, validateBody(abandonSchema), timerController.abandon);
