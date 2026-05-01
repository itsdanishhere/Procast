import { prisma } from "../../shared/prisma/client";
import type { DbClient } from "../../shared/prisma/types";
import { jsonInput } from "../../shared/prisma/types";
import { notificationQueue } from "../queue-system/queues";

export class NotificationService {
  async create(input: { userId: string; type: string; title: string; body: string; payload?: Record<string, unknown>; scheduledAt?: Date }) {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type as never,
        title: input.title,
        body: input.body,
        payload: jsonInput(input.payload ?? {}),
        scheduledAt: input.scheduledAt,
        status: "QUEUED"
      }
    });
    await notificationQueue.add("deliver", { notificationId: notification.id }, { delay: input.scheduledAt ? Math.max(0, input.scheduledAt.getTime() - Date.now()) : 0 });
    return notification;
  }

  async createInTransaction(
    input: { userId: string; type: string; title: string; body: string; payload?: Record<string, unknown>; scheduledAt?: Date },
    tx: DbClient
  ) {
    return tx.notification.create({
      data: {
        userId: input.userId,
        type: input.type as never,
        title: input.title,
        body: input.body,
        payload: jsonInput(input.payload ?? {}),
        scheduledAt: input.scheduledAt,
        status: "PENDING"
      }
    });
  }

  async markRead(userId: string, notificationIds?: string[]) {
    return prisma.notification.updateMany({
      where: {
        userId,
        id: notificationIds?.length ? { in: notificationIds } : undefined,
        deletedAt: null
      },
      data: { status: "READ", readAt: new Date() }
    });
  }
}

export const notificationService = new NotificationService();
