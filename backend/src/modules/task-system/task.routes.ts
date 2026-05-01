import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { writeRateLimit } from "../../middleware/rate-limit.middleware";
import { validateBody } from "../../shared/http/validate";
import { taskController } from "./task.controller";
import { createTaskSchema, updateTaskSchema } from "./task.validation";

export const taskRoutes = Router();
taskRoutes.use(authMiddleware);
taskRoutes.get("/", taskController.list);
taskRoutes.post("/", writeRateLimit, validateBody(createTaskSchema), taskController.create);
taskRoutes.patch("/:taskId", writeRateLimit, validateBody(updateTaskSchema), taskController.update);
