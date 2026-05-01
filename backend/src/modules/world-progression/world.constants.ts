export const worldStages = [
  { stage: "EMPTY_LAND", level: 1, threshold: 0 },
  { stage: "SMALL_HOUSE", level: 2, threshold: 120 },
  { stage: "BETTER_HOUSE", level: 3, threshold: 280 },
  { stage: "GARDEN", level: 4, threshold: 480 },
  { stage: "STREET", level: 5, threshold: 720 },
  { stage: "TOWN", level: 6, threshold: 1020 },
  { stage: "VILLAGE", level: 7, threshold: 1380 },
  { stage: "LARGE_TOWN", level: 8, threshold: 1800 },
  { stage: "CITY", level: 9, threshold: 2300 },
  { stage: "KINGDOM", level: 10, threshold: 2900 }
] as const;

export type WorldStageCode = (typeof worldStages)[number]["stage"];

export function stageForXp(xp: number) {
  return [...worldStages].reverse().find((stage) => xp >= stage.threshold) ?? worldStages[0];
}

export function stageIndex(stage: string) {
  return worldStages.findIndex((item) => item.stage === stage);
}

export function stageAt(index: number) {
  return worldStages[Math.max(0, Math.min(worldStages.length - 1, index))];
}
