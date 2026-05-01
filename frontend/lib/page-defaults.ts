import type { ProgressDTO, SettingsDTO } from "@/lib/types";

export const shellProgress: ProgressDTO = {
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

export const shellUser = {
  fullName: "ProCast User",
  username: "connected",
  progress: shellProgress
};

export const shellSettings: SettingsDTO = {
  dailyFocusGoal: 3,
  deepFocusMinutes: 45,
  remindersEnabled: true,
  focusSoundsEnabled: true,
  lockBackEnabled: true,
  notificationHour: 19,
  preferredAmbientSound: "rain"
};
