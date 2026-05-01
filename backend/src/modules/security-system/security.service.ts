import { createHash } from "node:crypto";

import { prisma } from "../../shared/prisma/client";
import { jsonInput } from "../../shared/prisma/types";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getClientIp(headers: { [key: string]: unknown }, fallback?: string) {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0].trim();
  return fallback ?? "unknown";
}

export class SecurityService {
  async recordEvent(input: {
    userId?: string | null;
    eventType: string;
    severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
    ipAddress?: string | null;
    userAgent?: string | null;
    fingerprint?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.securityEvent.create({
      data: {
        userId: input.userId ?? null,
        eventType: input.eventType,
        severity: input.severity,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        fingerprint: input.fingerprint ?? null,
        metadata: jsonInput(input.metadata ?? {})
      }
    });
  }

  isPasswordStrong(password: string) {
    return password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password);
  }
}

export const securityService = new SecurityService();
