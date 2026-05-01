import { Worker } from "bullmq";

import { analyticsService } from "../modules/analytics/analytics.service";
import { backupService } from "../modules/backup-system/backup.service";
import { selfHealingService } from "../modules/self-healing-engine/self-healing.service";
import { prisma } from "../shared/prisma/client";
import { logger } from "../shared/logger";
import { redis } from "../shared/redis/client";

function auditWorker(queueName: string, jobName: string, status: "ACTIVE" | "COMPLETED" | "FAILED", jobId?: string, error?: unknown) {
  return prisma.queueJobAudit.create({
    data: {
      queueName,
      jobName,
      jobId,
      status,
      error: error instanceof Error ? error.message : error ? String(error) : undefined
    }
  });
}

new Worker(
  "notifications",
  async (job) => {
    await auditWorker("notifications", job.name, "ACTIVE", job.id);
    const notificationId = job.data.notificationId as string;
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "SENT", sentAt: new Date() }
    });
    await prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel: "in_app",
        status: "SENT",
        metadata: { title: notification.title }
      }
    });
    await auditWorker("notifications", job.name, "COMPLETED", job.id);
  },
  { connection: redis }
);

new Worker(
  "analytics",
  async (job) => {
    await auditWorker("analytics", job.name, "ACTIVE", job.id);
    await analyticsService.aggregateDaily(job.data.date ? new Date(job.data.date) : new Date());
    await auditWorker("analytics", job.name, "COMPLETED", job.id);
  },
  { connection: redis }
);

new Worker(
  "recovery",
  async (job) => {
    await auditWorker("recovery", job.name, "ACTIVE", job.id);
    if (job.name === "recover-stuck-session") {
      await selfHealingService.recoverStuckSession(job.data.recoveryId, job.data.sessionId);
    }
    await auditWorker("recovery", job.name, "COMPLETED", job.id);
  },
  { connection: redis }
);

new Worker(
  "backups",
  async (job) => {
    await auditWorker("backups", job.name, "ACTIVE", job.id);
    await backupService.createLogicalManifest();
    await auditWorker("backups", job.name, "COMPLETED", job.id);
  },
  { connection: redis }
);

logger.info("ProCast workers started");
