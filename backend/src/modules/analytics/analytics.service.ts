import { endOfDay, startOfDay, subDays } from "date-fns";

import { prisma } from "../../shared/prisma/client";
import { localDateKey } from "../streak-engine/streak.service";
import { stageIndex, worldStages } from "../world-progression/world.constants";

const dayMs = 24 * 60 * 60 * 1000;

const stageLabels: Record<string, string> = {
  EMPTY_LAND: "Empty Land",
  SMALL_HOUSE: "Small House",
  BETTER_HOUSE: "Better House",
  GARDEN: "Garden",
  STREET: "Street",
  TOWN: "Town",
  VILLAGE: "Village",
  LARGE_TOWN: "Large Town",
  CITY: "City",
  KINGDOM: "Kingdom"
};

const worldElementRewards: Record<string, string> = {
  EMPTY_LAND: "Foundation Plot",
  SMALL_HOUSE: "First Shelter",
  BETTER_HOUSE: "Reinforced House",
  GARDEN: "Discipline Garden",
  STREET: "Focus Path",
  TOWN: "Town Center",
  VILLAGE: "Habit Village",
  LARGE_TOWN: "Momentum District",
  CITY: "Focus City",
  KINGDOM: "Discipline Kingdom"
};

function daysBetween(previousKey: string, nextKey: string) {
  return Math.round((Date.parse(`${nextKey}T00:00:00.000Z`) - Date.parse(`${previousKey}T00:00:00.000Z`)) / dayMs);
}

function buildMotivation(input: {
  dailyStreak: number;
  lastQualifiedDate: Date | null | undefined;
  timezone: string;
  environmentStatus: "active" | "locked";
}) {
  if (!input.lastQualifiedDate) {
    return {
      messageType: "encouragement",
      message: "Welcome to ProCast. Complete your first focus session to start building your world.",
      missedDays: null
    };
  }

  const todayKey = localDateKey(new Date(), input.timezone);
  const lastKey = localDateKey(input.lastQualifiedDate, input.timezone);
  const missedDays = Math.max(0, daysBetween(lastKey, todayKey));

  if (missedDays === 0) {
    return {
      messageType: "encouragement",
      message: `Great job today. Your ${input.dailyStreak}-day streak is protecting your world.`,
      missedDays
    };
  }

  if (missedDays === 1) {
    return {
      messageType: "warning",
      message: `Your world was quiet yesterday. Complete one session today to keep your ${input.dailyStreak}-day streak alive.`,
      missedDays
    };
  }

  return {
    messageType: input.environmentStatus === "locked" ? "locked" : "warning",
    message:
      input.environmentStatus === "locked"
        ? "Your world has lock pressure now. Complete a session to restart discipline and begin recovering protection."
        : "You have been away for more than a day. A completed session today restarts progress pressure.",
    missedDays
  };
}

export class AnalyticsService {
  async dashboard(userId: string) {
    const since = startOfDay(subDays(new Date(), 29));
    const [
      progress,
      streak,
      profile,
      sessions,
      snapshots,
      completedSessionsTotal,
      attemptedSessionsTotal,
      abandonedSessionsTotal,
      completedTasks,
      activeTasks,
      archivedTasks,
      distractionLogs,
      worldUnlocks
    ] = await Promise.all([
      prisma.userProgress.findUnique({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.focusSession.findMany({
        where: { userId, createdAt: { gte: since }, deletedAt: null },
        orderBy: { createdAt: "asc" }
      }),
      prisma.analyticsDailySnapshot.findMany({
        where: { userId, snapshotDate: { gte: since } },
        orderBy: { snapshotDate: "asc" }
      }),
      prisma.focusSession.count({ where: { userId, status: "COMPLETED", deletedAt: null } }),
      prisma.focusSession.count({
        where: { userId, status: { in: ["COMPLETED", "ABANDONED", "EXPIRED"] }, deletedAt: null }
      }),
      prisma.focusSession.count({ where: { userId, status: "ABANDONED", deletedAt: null } }),
      prisma.task.count({ where: { userId, status: "COMPLETED", deletedAt: null } }),
      prisma.task.count({ where: { userId, status: "ACTIVE", deletedAt: null } }),
      prisma.task.count({ where: { userId, status: "ARCHIVED", deletedAt: null } }),
      prisma.distractionLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 200
      }),
      prisma.worldUnlock.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" }
      })
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
    const completionRate = attemptedSessionsTotal > 0 ? Math.round((completedSessionsTotal / attemptedSessionsTotal) * 100) : 0;
    const distractionCounts = new Map<string, number>();
    for (const log of distractionLogs) {
      const key = log.reasonCategory.trim() || "Unspecified";
      distractionCounts.set(key, (distractionCounts.get(key) ?? 0) + 1);
    }
    const topDistraction =
      [...distractionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None yet";
    const highestIndex = stageIndex(progress?.highestWorldStage ?? "EMPTY_LAND");
    const lockedIndex = stageIndex(progress?.lockedWorldStage ?? "EMPTY_LAND");
    const environmentStatus: "active" | "locked" = lockedIndex < highestIndex ? "locked" : "active";
    const unlockedElements = worldStages
      .filter((stage) => stageIndex(stage.stage) <= highestIndex)
      .map((stage) => {
        const unlock = worldUnlocks.find((item) => item.stage === stage.stage);
        return {
          stage: stage.stage,
          stageName: stageLabels[stage.stage],
          elementName: worldElementRewards[stage.stage],
          locked: stageIndex(stage.stage) > lockedIndex,
          unlockedAt: unlock?.unlockedAt ?? null,
          lockedAt: unlock?.lockedAt ?? null
        };
      });
    const motivation = buildMotivation({
      dailyStreak: streak?.dailyStreak ?? 0,
      lastQualifiedDate: streak?.lastQualifiedDate,
      timezone: profile?.timezone ?? streak?.timezone ?? "UTC",
      environmentStatus
    });

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
        totalSessions: attemptedSessionsTotal,
        abandonedSessions: abandonedSessionsTotal,
        completionRate,
        topDistraction,
        environmentStatus,
        completedTasks,
        activeTasks
      },
      daily,
      bestHours,
      taskTrend: { completed: completedTasks, active: activeTasks, archived: archivedTasks },
      behavioralInsights: {
        completionRate,
        topDistraction,
        totalSessions: attemptedSessionsTotal,
        completedSessions: completedSessionsTotal,
        abandonedSessions: abandonedSessionsTotal,
        environmentStatus,
        unlockedElements,
        motivation
      },
      motivation,
      unlockedElements,
      insights: [
        completedSessionsTotal > 0
          ? `${completedSessionsTotal} completed sessions have protected your world so far.`
          : "Start one focused session to generate your first productivity pattern.",
        attemptedSessionsTotal > 0
          ? `Your session completion rate is ${completionRate}%.`
          : "Completion rate appears after your first attempted focus block.",
        topDistraction !== "None yet"
          ? `Your most repeated distraction is ${topDistraction}.`
          : "Log early exits or reflections to reveal your main distraction pattern.",
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
