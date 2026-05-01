import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  dueAt: z.string().datetime().optional(),
  tags: z.array(z.string().min(1).max(32)).max(10).default([]),
  category: z.string().max(80).optional(),
  avoidancePrompt: z.string().min(2).max(280).optional()
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED", "DELETED"]).optional()
});
