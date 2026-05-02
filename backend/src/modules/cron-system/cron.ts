import cron from "node-cron";

import { analyticsQueue, backupQueue } from "../queue-system/queues";
import { reflectionService } from "../reflections/reflection.service";
import { selfHealingService } from "../self-healing-engine/self-healing.service";
import { prisma } from "../../shared/prisma/client";
import { logger } from "../../shared/logger";

async function trackedRun(jobName: string, run: () => Promise<void>) {
  const cronRun = await prisma.cronRun.create({ data: { jobName, status: "RUNNING" } });
  const started = Date.now();
  try {
    await run();
    await prisma.cronRun.update({
      where: { id: cronRun.id },
      data: { status: "SUCCEEDED", finishedAt: new Date(), durationMs: Date.now() - started }
    });
  } catch (error) {
    logger.error({ error, jobName }, "Cron job failed");
    await prisma.cronRun.update({
      where: { id: cronRun.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }
}

export function registerCronJobs() {
  cron.schedule("*/2 * * * *", () =>
    trackedRun("self-heal-stuck-sessions", async () => {
      await selfHealingService.detectAndRecoverStuckSessions();
    })
  );

  cron.schedule("10 * * * *", () =>
    trackedRun("analytics-hourly", async () => {
      await analyticsQueue.add("aggregate-daily", { date: new Date().toISOString() });
    })
  );

  cron.schedule("0 3 * * *", () =>
    trackedRun("backup-daily", async () => {
      await backupQueue.add("database-backup", { requestedAt: new Date().toISOString() });
    })
  );

  cron.schedule("30 3 * * *", () =>
    trackedRun("purge-deleted-reflections", async () => {
      await reflectionService.purgeExpiredDeleted();
    })
  );
}
