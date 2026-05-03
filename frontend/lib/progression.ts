import { worldStages } from "@/lib/constants";

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
  const currentLevel = getLevelForXp(xp);
  const current = getStage(currentLevel);
  const currentIndex = worldStages.findIndex((stage) => stage.level === current.level);
  const next = worldStages[currentIndex + 1];

  if (!next) return 100;

  const span = Math.max(1, next.threshold - current.threshold);
  return Math.max(0, Math.min(100, Math.round(((xp - current.threshold) / span) * 100)));
}
