import { achievements, timerModes, worldStages } from "@/lib/constants";

type ProgressInput = {
  xp: number;
  level: number;
  unlockedStage: number;
  lockedStage: number;
  dailyStreak: number;
  bestStreak: number;
  lockStrikes: number;
  lastFocusDate: Date | null;
  weeklySessions: number;
};

type SessionInput = {
  mode: keyof typeof timerModes;
  status: "COMPLETED" | "ABANDONED" | "INTERRUPTED";
  durationMinutes: number;
  actualSeconds: number;
  startedAt: Date;
};

const dayMs = 24 * 60 * 60 * 1000;

export function getLevelForXp(xp: number) {
  return [...worldStages].reverse().find((stage) => xp >= stage.threshold)?.level ?? 1;
}

export function getStage(level: number) {
  return worldStages.find((stage) => stage.level === level) ?? worldStages[0];
}

export function getNextStage(xp: number) {
  return worldStages.find((stage) => stage.threshold > xp) ?? worldStages[worldStages.length - 1];
}

export function getXpToNextLevel(xp: number) {
  const next = getNextStage(xp);
  return Math.max(0, next.threshold - xp);
}

export function getStageProgressPercent(xp: number) {
  const level = getLevelForXp(xp);
  const current = getStage(level);
  const next = getNextStage(xp);
  if (current.level === next.level) return 100;
  const span = next.threshold - current.threshold;
  return Math.min(100, Math.round(((xp - current.threshold) / span) * 100));
}

export function calculateSessionXp(session: SessionInput) {
  if (session.status !== "COMPLETED") {
    return session.status === "ABANDONED" ? -15 : -8;
  }

  const base = timerModes[session.mode]?.xp ?? 35;
  const completionRatio = session.actualSeconds / Math.max(1, session.durationMinutes * 60);
  const enduranceBonus = session.durationMinutes >= 45 ? 20 : 0;

  return Math.max(0, Math.round(base * Math.min(1.15, completionRatio) + enduranceBonus));
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDayGap(previous: Date | null, current: Date) {
  if (!previous) return 0;
  const prevDay = normalizeDate(previous).getTime();
  const currentDay = normalizeDate(current).getTime();
  return Math.max(0, Math.round((currentDay - prevDay) / dayMs));
}

export function applySessionProgress(progress: ProgressInput, session: SessionInput) {
  const xpEarned = calculateSessionXp(session);
  const nextXp = Math.max(0, progress.xp + xpEarned);
  const nextLevel = getLevelForXp(nextXp);
  const dayGap = getDayGap(progress.lastFocusDate, session.startedAt);
  const completed = session.status === "COMPLETED";

  let dailyStreak = progress.dailyStreak;
  let lockStrikes = progress.lockStrikes;
  let lockedStage = progress.lockedStage;
  let weeklySessions = progress.weeklySessions;

  if (completed) {
    if (dayGap === 1) dailyStreak += 1;
    if (dayGap > 1) dailyStreak = 1;
    if (dayGap === 0 && dailyStreak === 0) dailyStreak = 1;
    weeklySessions += 1;
  }

  if (dayGap >= 3) {
    lockStrikes += 1;
    lockedStage = Math.max(1, Math.min(nextLevel, nextLevel - lockStrikes));
  } else if (completed) {
    lockStrikes = Math.max(0, lockStrikes - 1);
    lockedStage = Math.max(1, nextLevel - Math.floor(lockStrikes / 3));
  }

  return {
    xpEarned,
    progress: {
      xp: nextXp,
      level: nextLevel,
      unlockedStage: Math.max(progress.unlockedStage, nextLevel),
      lockedStage,
      dailyStreak,
      bestStreak: Math.max(progress.bestStreak, dailyStreak),
      lockStrikes,
      lastFocusDate: completed ? session.startedAt : progress.lastFocusDate,
      weeklySessions
    }
  };
}

export function getAchievementCandidates(input: {
  completedSessions: number;
  dailyStreak: number;
  level: number;
  mode: string;
  weeklySessions: number;
}) {
  const codes: string[] = [];

  if (input.completedSessions >= 1) codes.push("first_session");
  if (input.dailyStreak >= 7) codes.push("seven_day_streak");
  if (input.mode === "DEEP_FOCUS") codes.push("deep_focus_master");
  if (input.level >= 6) codes.push("town_builder");
  if (input.completedSessions >= 25) codes.push("consistency_champion");
  if (input.weeklySessions >= 7) codes.push("no_skip_week");
  if (input.completedSessions >= 100) codes.push("hundred_sessions");

  return achievements.filter((achievement) => codes.includes(achievement.code));
}
