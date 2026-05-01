import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { env } from "../../config/env";
import { prisma } from "../../shared/prisma/client";

export class BackupService {
  async createLogicalManifest() {
    await mkdir(env.BACKUP_DIRECTORY, { recursive: true });
    const started = new Date();
    const run = await prisma.backupRun.create({
      data: {
        status: "RUNNING",
        target: env.BACKUP_DIRECTORY,
        metadata: { strategy: "logical-manifest" }
      }
    });

    try {
      const counts = {
        users: await prisma.user.count(),
        focusSessions: await prisma.focusSession.count(),
        xpLedger: await prisma.xpLedger.count(),
        tasks: await prisma.task.count(),
        notifications: await prisma.notification.count()
      };
      const content = JSON.stringify({ createdAt: started.toISOString(), counts }, null, 2);
      const target = join(env.BACKUP_DIRECTORY, `backup-manifest-${started.toISOString().replace(/[:.]/g, "-")}.json`);
      await writeFile(target, content, "utf8");
      await prisma.backupRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCEEDED",
          finishedAt: new Date(),
          sizeBytes: BigInt(Buffer.byteLength(content)),
          metadata: { strategy: "logical-manifest", target }
        }
      });
    } catch (error) {
      await prisma.backupRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }
}

export const backupService = new BackupService();
