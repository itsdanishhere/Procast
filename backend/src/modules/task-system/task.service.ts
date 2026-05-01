import { prisma } from "../../shared/prisma/client";
import { notFound } from "../../shared/errors/app-error";
import { xpService } from "../xp-engine/xp.service";

export class TaskService {
  list(userId: string) {
    return prisma.task.findMany({
      where: { userId, deletedAt: null, status: { not: "DELETED" } },
      include: { avoidancePrompts: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }]
    });
  }

  async create(userId: string, input: any) {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          userId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
          tags: input.tags,
          category: input.category,
          createdBy: userId
        }
      });
      if (input.avoidancePrompt) {
        await tx.taskAvoidancePrompt.create({
          data: { userId, taskId: task.id, prompt: input.avoidancePrompt }
        });
      }
      return task;
    });
  }

  async update(userId: string, taskId: string, input: any) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
      if (!existing) throw notFound("Task not found.");
      const completing = input.status === "COMPLETED" && existing.status !== "COMPLETED";
      const task = await tx.task.update({
        where: { id: taskId },
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueAt: input.dueAt ? new Date(input.dueAt) : input.dueAt === null ? null : undefined,
          tags: input.tags,
          category: input.category,
          status: input.status,
          completedAt: completing ? new Date() : input.status === "ACTIVE" ? null : undefined,
          deletedAt: input.status === "DELETED" ? new Date() : undefined
        }
      });

      if (completing) {
        await xpService.grantInTransaction(
          {
            userId,
            sourceType: "TASK_COMPLETION",
            sourceId: task.id,
            reason: "Completed task",
            amount: 12,
            idempotencyKey: `task-completion:${task.id}`
          },
          tx
        );
      }
      return task;
    });
  }
}

export const taskService = new TaskService();
