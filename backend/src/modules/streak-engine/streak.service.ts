import { prisma } from "../../shared/prisma/client";
import type { DbClient } from "../../shared/prisma/types";
import { worldProgressionService } from "../world-progression/world.service";

const dayMs = 24 * 60 * 60 * 1000;

export function localDateKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function dayDiff(previousKey: string, nextKey: string) {
  const previous = Date.parse(`${previousKey}T00:00:00.000Z`);
  const next = Date.parse(`${nextKey}T00:00:00.000Z`);
  return Math.round((next - previous) / dayMs);
}

function isoWeekKey(date: Date, timezone: string) {
  const key = localDateKey(date, timezone);
  const utc = new Date(`${key}T00:00:00.000Z`);
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / dayMs + 1) / 7);
  return `${utc.getUTCFullYear()}-W${week.toString().padStart(2, "0")}`;
}

export class StreakService {
  async applyCompletedSession(userId: string, completedAt: Date, tx: DbClient = prisma) {
    const profile = await tx.userProfile.findUnique({ where: { userId } });
    const timezone = profile?.timezone || "UTC";
    const todayKey = localDateKey(completedAt, timezone);
    const weekKey = isoWeekKey(completedAt, timezone);
    const streak =
      (await tx.userStreak.findUnique({ where: { userId } })) ??
      (await tx.userStreak.create({ data: { userId, timezone } }));

    const previousKey = streak.lastQualifiedDate
      ? localDateKey(streak.lastQualifiedDate, timezone)
      : null;
    const gap = previousKey ? dayDiff(previousKey, todayKey) : 0;

    const dailyStreak = !previousKey
      ? 1
      : gap === 0
        ? streak.dailyStreak
        : gap === 1
          ? streak.dailyStreak + 1
          : 1;

    const weeklyStreak = !streak.lastQualifiedWeek
      ? 1
      : streak.lastQualifiedWeek === weekKey
        ? streak.weeklyStreak
        : streak.weeklyStreak + 1;

    if (gap >= 3) {
      await worldProgressionService.applyLockBack(userId, gap, tx);
    } else if (gap === 1) {
      await tx.userProgress.updateMany({
        where: { userId, lockStrikes: { gt: 0 } },
        data: { lockStrikes: { decrement: 1 } }
      });
      await worldProgressionService.reconcile(userId, tx);
    }

    const updated = await tx.userStreak.update({
      where: { userId },
      data: {
        dailyStreak,
        weeklyStreak,
        bestDailyStreak: Math.max(streak.bestDailyStreak, dailyStreak),
        bestWeeklyStreak: Math.max(streak.bestWeeklyStreak, weeklyStreak),
        lastQualifiedDate: new Date(`${todayKey}T00:00:00.000Z`),
        lastQualifiedWeek: weekKey,
        timezone,
        consistencyScore: Math.min(100, dailyStreak * 5)
      }
    });

    await tx.streakEvent.create({
      data: {
        userId,
        eventDate: completedAt,
        timezone,
        action: "completed_session",
        previous: streak,
        next: updated,
        reason: "Completed qualifying focus session"
      }
    });

    return updated;
  }
}

export const streakService = new StreakService();
