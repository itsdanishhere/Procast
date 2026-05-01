import { endOfDay, startOfDay, subDays } from "date-fns";

import { prisma } from "../../shared/prisma/client";

export class AnalyticsService {
  async dashboard(userId: string) {
    const progress = await prisma.userProgress.findUnique({ where: { userId } });
    const streak = await prisma.userStreak.findUnique({ where: { userId } });
    const since = startOfDay(subDays(new Date(), 29));
    const sessions = await prisma.focusSession.findMany({
      where: { userId, createdAt: { gte: since }, deletedAt: null },
      orderBy: { createdAt: "asc" }
    });
    const snapshots = await prisma.analyticsDailySnapshot.findMany({
      where: { userId, snapshotDate: { gte: since } },
      orderBy: { snapshotDate: "asc" }
    });

    const daily = Array.from({ length: 30 }, (_, index) => {
      const day = startOfDay(subDays(new Date(), 29 - index));
      const snapshot = snapshots.find((item) => item.snapshotDate >= day && item.snapshotDate <= endOfDay(day));
      const daySessions = sessions.filter((session) => session.createdAt >= day && session.createdAt <= endOfDay(day));
      return {
        day: day.toISOString().slice(0, 10),
        focusSeconds: snapshot?.focusSeconds ?? daySessions.reduce((sum, session) => sum + session.accumulatedFocusSeconds, 0),
        completedSessions: snapshot?.completedSessions ?? daySessions.filter((session) => session.status === "COMPLETED").length
      };
    });

    return {
      summary: {
        totalXp: progress?.totalXp ?? 0,
        currentLevel: progress?.currentLevel ?? 1,
        currentWorldStage: progress?.currentWorldStage ?? "EMPTY_LAND",
        lockedWorldStage: progress?.lockedWorldStage ?? "EMPTY_LAND",
        dailyStreak: streak?.dailyStreak ?? 0,
        bestDailyStreak: streak?.bestDailyStreak ?? 0
      },
      daily
    };
  }

  async aggregateDaily(date = new Date()) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const users = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, profile: true } });

    for (const user of users) {
      const [sessions, completedTasks, xp] = await Promise.all([
        prisma.focusSession.findMany({ where: { userId: user.id, createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.task.count({ where: { userId: user.id, completedAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.xpLedger.aggregate({ where: { userId: user.id, createdAt: { gte: dayStart, lte: dayEnd } }, _sum: { amount: true } })
      ]);

      const completed = sessions.filter((session) => session.status === "COMPLETED");
      const byHour = new Map<number, number>();
      for (const session of completed) {
        const hour = session.createdAt.getHours();
        byHour.set(hour, (byHour.get(hour) ?? 0) + session.accumulatedFocusSeconds);
      }
      const bestHour = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

      await prisma.analyticsDailySnapshot.upsert({
        where: { userId_snapshotDate: { userId: user.id, snapshotDate: dayStart } },
        update: {
          focusSeconds: completed.reduce((sum, session) => sum + session.accumulatedFocusSeconds, 0),
          completedSessions: completed.length,
          abandonedSessions: sessions.filter((session) => session.status === "ABANDONED").length,
          completedTasks,
          xpEarned: xp._sum.amount ?? 0,
          bestProductivityHour: bestHour,
          burnoutRiskScore: sessions.length > 8 ? 70 : 20
        },
        create: {
          userId: user.id,
          snapshotDate: dayStart,
          timezone: user.profile?.timezone ?? "UTC",
          focusSeconds: completed.reduce((sum, session) => sum + session.accumulatedFocusSeconds, 0),
          completedSessions: completed.length,
          abandonedSessions: sessions.filter((session) => session.status === "ABANDONED").length,
          completedTasks,
          xpEarned: xp._sum.amount ?? 0,
          bestProductivityHour: bestHour,
          burnoutRiskScore: sessions.length > 8 ? 70 : 20
        }
      });
    }
  }
}

export const analyticsService = new AnalyticsService();
