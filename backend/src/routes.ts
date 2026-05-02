import { Router } from "express";

import { achievementRoutes } from "./modules/achievements/achievement.routes";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { healthRoutes } from "./modules/health-monitor/health.routes";
import { musicRoutes } from "./modules/music/music.routes";
import { notificationRoutes } from "./modules/notifications/notification.routes";
import { reflectionRoutes } from "./modules/reflections/reflection.routes";
import { taskRoutes } from "./modules/task-system/task.routes";
import { timerRoutes } from "./modules/timer-system/timer.routes";
import { userRoutes } from "./modules/users/user.routes";

export const routes = Router();

routes.use("/health", healthRoutes);
routes.use("/auth", authRoutes);
routes.use("/users", userRoutes);
routes.use("/tasks", taskRoutes);
routes.use("/timer", timerRoutes);
routes.use("/reflections", reflectionRoutes);
routes.use("/analytics", analyticsRoutes);
routes.use("/achievements", achievementRoutes);
routes.use("/notifications", notificationRoutes);
routes.use("/music", musicRoutes);
