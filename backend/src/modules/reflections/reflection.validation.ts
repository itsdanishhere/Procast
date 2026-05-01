import { z } from "zod";

export const createReflectionSchema = z.object({
  focusSessionId: z.string().optional(),
  distraction: z.string().min(2).max(600),
  wentWell: z.string().min(2).max(600),
  improveTomorrow: z.string().min(2).max(600),
  emotionalTone: z.string().max(80).optional(),
  patternTags: z.array(z.string().min(1).max(40)).max(8).default([])
});
