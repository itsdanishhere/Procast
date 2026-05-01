import { prisma } from "../../shared/prisma/client";
import { xpService } from "../xp-engine/xp.service";

export class ReflectionService {
  list(userId: string) {
    return prisma.reflection.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async create(userId: string, input: any) {
    return prisma.$transaction(async (tx) => {
      const reflection = await tx.reflection.create({
        data: {
          userId,
          focusSessionId: input.focusSessionId,
          distraction: input.distraction,
          wentWell: input.wentWell,
          improveTomorrow: input.improveTomorrow,
          emotionalTone: input.emotionalTone,
          patternTags: input.patternTags
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
}

export const reflectionService = new ReflectionService();
