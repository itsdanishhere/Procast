import { prisma } from "../../shared/prisma/client";
import { jsonInput } from "../../shared/prisma/types";

type AuditInput = {
  userId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  severity?: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export class AuditService {
  async record(input: AuditInput) {
    return prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        severity: input.severity ?? "INFO",
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: jsonInput(input.metadata ?? {})
      }
    });
  }
}

export const auditService = new AuditService();
