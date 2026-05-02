import type { ProgressDTO } from "@/lib/types";
import { worldStages } from "@/lib/constants";

type BackendProgress = Partial<ProgressDTO> & {
  currentWorldStage?: string | null;
  highestWorldStage?: string | null;
  lockedWorldStage?: string | null;
};

type BackendStreak = {
  dailyStreak?: number | null;
  bestDailyStreak?: number | null;
  weeklyStreak?: number | null;
  lastQualifiedDate?: string | null;
};

const stageLevels = Object.fromEntries(worldStages.map((stage) => [stage.code, stage.level])) as Record<string, number>;

const defaultProgress: ProgressDTO = {
  totalXp: 0,
  currentLevel: 1,
  unlockedStage: 1,
  lockedStage: 1,
  dailyStreak: 0,
  bestStreak: 0,
  lockStrikes: 0,
  weeklySessions: 0,
  lastFocusDate: null
};

function stageLevel(stage: unknown, fallback: number) {
  if (typeof stage === "number" && Number.isFinite(stage)) return stage;
  if (typeof stage !== "string") return fallback;
  return stageLevels[stage] ?? fallback;
}

function levelForXp(xp: number) {
  return [...worldStages].reverse().find((stage) => xp >= stage.threshold)?.level ?? 1;
}

export function normalizeProgress(
  progress?: BackendProgress | null,
  streak?: BackendStreak | null,
  fallback: ProgressDTO = defaultProgress
): ProgressDTO {
  const totalXp = progress?.totalXp ?? fallback.totalXp;
  const currentLevel = levelForXp(totalXp);
  const rawUnlockedStage =
    progress?.unlockedStage ?? stageLevel(progress?.highestWorldStage, Math.max(fallback.unlockedStage, currentLevel));
  const unlockedStage = Math.min(rawUnlockedStage, currentLevel);
  const lockedStage = Math.min(progress?.lockedStage ?? stageLevel(progress?.lockedWorldStage, fallback.lockedStage), unlockedStage);

  return {
    totalXp,
    currentLevel,
    unlockedStage,
    lockedStage,
    dailyStreak: streak?.dailyStreak ?? progress?.dailyStreak ?? fallback.dailyStreak,
    bestStreak: streak?.bestDailyStreak ?? progress?.bestStreak ?? fallback.bestStreak,
    lockStrikes: progress?.lockStrikes ?? fallback.lockStrikes,
    weeklySessions: streak?.weeklyStreak ?? progress?.weeklySessions ?? fallback.weeklySessions,
    lastFocusDate: streak?.lastQualifiedDate ?? progress?.lastFocusDate ?? fallback.lastFocusDate
  };
}

export function emitProgressUpdate(progress: ProgressDTO) {
  window.dispatchEvent(new CustomEvent<ProgressDTO>("procast:progress-updated", { detail: progress }));
}
