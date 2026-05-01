import { endOfDay, startOfDay, subDays } from "date-fns";

import { prisma } from "../../shared/prisma/client";

export class AnalyticsService {
  async dashboard(userId: string) {
    const since = startOfDay(subDays(new Date(), 29));
    const [
      progress,
      streak,
      sessions,
      snapshots,
      completedSessionsTotal,
      completedTasks,
      activeTasks,
      archivedTasks
    ] = await Promise.all([
      prisma.userProgress.findUnique({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.focusSession.findMany({
        where: { userId, createdAt: { gte: since }, deletedAt: null },
        orderBy: { createdAt: "asc" }
      }),
      prisma.analyticsDailySnapshot.findMany({
        where: { userId, snapshotDate: { gte: since } },
        orderBy: { snapshotDate: "asc" }
      }),
      prisma.focusSession.count({ where: { userId, status: "COMPLETED", deletedAt: null } }),
      prisma.task.count({ where: { userId, status: "COMPLETED", deletedAt: null } }),
      prisma.task.count({ where: { userId, status: "ACTIVE", deletedAt: null } }),
      prisma.task.count({ where: { userId, status: "ARCHIVED", deletedAt: null } })
    ]);

    const daily = Array.from({ length: 30 }, (_, index) => {
      const day = startOfDay(subDays(new Date(), 29 - index));
      const snapshot = snapshots.find((item) => item.snapshotDate >= day && item.snapshotDate <= endOfDay(day));
      const daySessions = sessions.filter((session) => session.createdAt >= day && session.createdAt <= endOfDay(day));
      const focusSeconds = snapshot?.focusSeconds ?? daySessions.reduce((sum, session) => sum + session.accumulatedFocusSeconds, 0);
      const completedSessions = snapshot?.completedSessions ?? daySessions.filter((session) => session.status === "COMPLETED").length;
      return {
        day: day.toISOString().slice(0, 10),
        focusSeconds,
        completedSessions,
        minutes: Math.round(focusSeconds / 60),
        sessions: completedSessions
      };
    });

    const completedSessions = sessions.filter((session) => session.status === "COMPLETED");
    const focusSeconds30 = completedSessions.reduce((sum, session) => sum + session.accumulatedFocusSeconds, 0);
    const byHour = new Map<number, number>();
    for (const session of completedSessions) {
      const hour = session.startedAt?.getHours() ?? session.createdAt.getHours();
      byHour.set(hour, (byHour.get(hour) ?? 0) + session.accumulatedFocusSeconds);
    }
    const bestHours = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      score: Math.round((byHour.get(hour) ?? 0) / 60)
    }));
    const peakHour = [...bestHours].sort((a, b) => b.score - a.score)[0];

    return {
      summary: {
        totalXp: progress?.totalXp ?? 0,
        xp: progress?.totalXp ?? 0,
        currentLevel: progress?.currentLevel ?? 1,
        currentWorldStage: progress?.currentWorldStage ?? "EMPTY_LAND",
        highestWorldStage: progress?.highestWorldStage ?? "EMPTY_LAND",
        lockedWorldStage: progress?.lockedWorldStage ?? "EMPTY_LAND",
        dailyStreak: streak?.dailyStreak ?? 0,
        bestDailyStreak: streak?.bestDailyStreak ?? 0,
        bestStreak: streak?.bestDailyStreak ?? 0,
        weeklyStreak: streak?.weeklyStreak ?? 0,
        totalFocusMinutes: Math.round(focusSeconds30 / 60),
        completedSessions: completedSessionsTotal,
        completedTasks,
        activeTasks
      },
      daily,
      bestHours,
      taskTrend: { completed: completedTasks, active: activeTasks, archived: archivedTasks },
      insights: [
        completedSessionsTotal > 0
          ? `${completedSessionsTotal} completed sessions have protected your world so far.`
          : "Start one focused session to generate your first productivity pattern.",
        peakHour && peakHour.score > 0
          ? `Your strongest focus hour is currently ${peakHour.hour}.`
          : "Complete more sessions to identify your best productivity hour.",
        (streak?.dailyStreak ?? 0) > 0
          ? `Your current streak is ${streak?.dailyStreak ?? 0} day${streak?.dailyStreak === 1 ? "" : "s"}.`
          : "A completed session today will restart streak pressure."
      ]
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
