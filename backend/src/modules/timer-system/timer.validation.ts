import { z } from "zod";

export const startTimerSchema = z.object({
  taskId: z.string().optional(),
  mode: z.enum(["POMODORO", "SHORT_BREAK", "LONG_BREAK", "DEEP_FOCUS_45", "DEEP_FOCUS_60", "CUSTOM"]),
  plannedSeconds: z.number().int().min(60).max(4 * 60 * 60),
  clientStartedAt: z.string().datetime().optional(),
  idempotencyKey: z.string().min(12).max(160)
});

export const sessionIdSchema = z.object({
  sessionId: z.string().min(1)
});

export const heartbeatSchema = z.object({
  clientTime: z.string().datetime().optional(),
  accumulatedFocusSeconds: z.number().int().min(0).optional()
});

export const abandonSchema = z.object({
  reason: z.string().max(240).optional()
});
