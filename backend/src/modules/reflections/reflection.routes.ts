import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { writeRateLimit } from "../../middleware/rate-limit.middleware";
import { validateBody } from "../../shared/http/validate";
import { reflectionController } from "./reflection.controller";
import { createReflectionSchema } from "./reflection.validation";

export const reflectionRoutes = Router();
reflectionRoutes.use(authMiddleware);
reflectionRoutes.get("/", reflectionController.list);
reflectionRoutes.post("/", writeRateLimit, validateBody(createReflectionSchema), reflectionController.create);
reflectionRoutes.delete("/:reflectionId", writeRateLimit, reflectionController.softDelete);
reflectionRoutes.post("/:reflectionId/restore", writeRateLimit, reflectionController.restore);
reflectionRoutes.delete("/:reflectionId/permanent", writeRateLimit, reflectionController.permanentlyDelete);
