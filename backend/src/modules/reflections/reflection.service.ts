import { prisma } from "../../shared/prisma/client";
import { notFound } from "../../shared/errors/app-error";
import { xpService } from "../xp-engine/xp.service";

export class ReflectionService {
  private recycleBinRetentionMs = 3 * 24 * 60 * 60 * 1000;

  async purgeExpiredDeleted() {
    const cutoff = new Date(Date.now() - this.recycleBinRetentionMs);
    return prisma.reflection.deleteMany({
      where: {
        deletedAt: { lt: cutoff }
      }
    });
  }

  async list(userId: string) {
    await this.purgeExpiredDeleted();
    return prisma.reflection.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async listDeleted(userId: string) {
    await this.purgeExpiredDeleted();
    return prisma.reflection.findMany({
      where: { userId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 100
    });
  }

  async create(userId: string, input: any) {
    return prisma.$transaction(async (tx) => {
      const reflection = await tx.reflection.create({
        data: {
          userId,
          focusSessionId: input.focusSessionId,
          focusRating: input.focusRating,
          distraction: input.distraction,
          wentWell: input.wentWell,
          improveTomorrow: input.improveTomorrow,
          reflectionNotes: input.reflectionNotes,
          emotionalTone: input.emotionalTone,
          patternTags: input.patternTags
        }
      });

      await tx.distractionLog.create({
        data: {
          userId,
          focusSessionId: input.focusSessionId,
          reasonCategory: input.distraction.slice(0, 80),
          customReason: input.distraction,
          source: "reflection"
        }
      });

      for (const tag of input.patternTags ?? []) {
        const existing = await tx.reflectionPattern.findFirst({ where: { userId, pattern: tag } });
        if (existing) {
          await tx.reflectionPattern.update({
            where: { id: existing.id },
            data: { frequency: { increment: 1 }, lastSeenAt: new Date() }
          });
        } else {
          await tx.reflectionPattern.create({ data: { userId, pattern: tag } });
        }
      }

      await xpService.grantInTransaction(
        {
          userId,
          sourceType: "REFLECTION",
          sourceId: reflection.id,
          reason: "Completed reflection",
          amount: 8,
          idempotencyKey: `reflection:${reflection.id}`
        },
        tx
      );
      return reflection;
    });
  }

  async softDelete(userId: string, reflectionId: string) {
    const reflection = await prisma.reflection.findFirst({
      where: { id: reflectionId, userId }
    });
    if (!reflection) throw notFound("Reflection not found.");
    if (reflection.deletedAt) return reflection;

    return prisma.reflection.update({
      where: { id: reflectionId },
      data: { deletedAt: new Date() }
    });
  }

  async restore(userId: string, reflectionId: string) {
    const reflection = await prisma.reflection.findFirst({
      where: { id: reflectionId, userId, deletedAt: { not: null } }
    });
    if (!reflection) throw notFound("Deleted reflection not found.");

    return prisma.reflection.update({
      where: { id: reflectionId },
      data: { deletedAt: null }
    });
  }

  async permanentlyDelete(userId: string, reflectionId: string) {
    const reflection = await prisma.reflection.findFirst({
      where: { id: reflectionId, userId }
    });
    if (!reflection) throw notFound("Reflection not found.");

    await prisma.reflection.delete({ where: { id: reflectionId } });
    return { deleted: true };
  }
}

export const reflectionService = new ReflectionService();
