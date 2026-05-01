import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { authRateLimit } from "../../middleware/rate-limit.middleware";
import { validateBody } from "../../shared/http/validate";
import { authController } from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema
} from "./auth.validation";

export const authRoutes = Router();

authRoutes.post("/signup", authRateLimit, validateBody(signupSchema), authController.signup);
authRoutes.post("/login", authRateLimit, validateBody(loginSchema), authController.login);
authRoutes.post("/refresh", authRateLimit, validateBody(refreshSchema), authController.refresh);
authRoutes.post("/logout", authMiddleware, authController.logout);
authRoutes.get("/me", authMiddleware, authController.me);
authRoutes.post("/forgot-password", authRateLimit, validateBody(forgotPasswordSchema), authController.forgotPassword);
authRoutes.post("/reset-password", authRateLimit, validateBody(resetPasswordSchema), authController.resetPassword);
authRoutes.post("/verify-email", authRateLimit, validateBody(verifyEmailSchema), authController.verifyEmail);
