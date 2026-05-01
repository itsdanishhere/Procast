import { z } from "zod";

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const signupSchema = z.object({
  fullName: z.string().min(2).max(100),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.email().max(160),
  password: passwordSchema,
  timezone: z.string().min(2).max(80).default("UTC")
});

export const loginSchema = z.object({
  identifier: z.string().min(3).max(160),
  password: z.string().min(1),
  deviceId: z.string().max(120).optional()
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional()
});

export const forgotPasswordSchema = z.object({
  email: z.email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: passwordSchema
});

export const verifyEmailSchema = z.object({
  token: z.string().min(32)
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
