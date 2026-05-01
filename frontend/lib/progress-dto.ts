import type { ProgressDTO } from "@/lib/types";

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

const stageLevels: Record<string, number> = {
  EMPTY_LAND: 1,
  SMALL_HOUSE: 2,
  BETTER_HOUSE: 3,
  GARDEN: 4,
  STREET: 5,
  TOWN: 6,
  VILLAGE: 7,
  LARGE_TOWN: 8,
  CITY: 9,
  KINGDOM: 10
};

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

export function normalizeProgress(
  progress?: BackendProgress | null,
  streak?: BackendStreak | null,
  fallback: ProgressDTO = defaultProgress
): ProgressDTO {
  const totalXp = progress?.totalXp ?? fallback.totalXp;
  const currentLevel = progress?.currentLevel ?? stageLevel(progress?.currentWorldStage, fallback.currentLevel);
  const unlockedStage =
    progress?.unlockedStage ?? stageLevel(progress?.highestWorldStage, Math.max(fallback.unlockedStage, currentLevel));
  const lockedStage = progress?.lockedStage ?? stageLevel(progress?.lockedWorldStage, fallback.lockedStage);

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
