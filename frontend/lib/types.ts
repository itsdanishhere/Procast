export type ProgressDTO = {
  totalXp: number;
  currentLevel: number;
  unlockedStage: number;
  lockedStage: number;
  dailyStreak: number;
  bestStreak: number;
  lockStrikes: number;
  weeklySessions: number;
  lastFocusDate: string | null;
};

export type SettingsDTO = {
  dailyFocusGoal: number;
  deepFocusMinutes: number;
  remindersEnabled: boolean;
  focusSoundsEnabled: boolean;
  lockBackEnabled: boolean;
  notificationHour: number;
  preferredAmbientSound: string;
};

export type TaskDTO = {
  id: string;
  title: string;
  avoidance: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: string | null;
  tags: string[];
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  completedAt: string | null;
  createdAt: string;
};

export type SessionDTO = {
  id: string;
  taskId: string | null;
  mode: string;
  status: string;
  durationMinutes: number;
  actualSeconds: number;
  xpEarned: number;
  startedAt: string;
  endedAt: string;
  task?: { title: string } | null;
  distractionReason?: string | null;
};

export type ReflectionDTO = {
  id: string;
  sessionId: string | null;
  focusRating: number | null;
  distraction: string;
  wentWell: string;
  improve: string;
  notes: string | null;
  createdAt: string;
};

export type MotivationDTO = {
  messageType: "encouragement" | "warning" | "locked" | "neutral";
  message: string;
  missedDays: number | null;
};

export type UnlockedElementDTO = {
  stage: string;
  stageName: string;
  elementName: string;
  locked: boolean;
  unlockedAt: string | null;
  lockedAt: string | null;
};

export type BehavioralInsightsDTO = {
  completionRate: number;
  topDistraction: string;
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  environmentStatus: "active" | "locked";
  unlockedElements: UnlockedElementDTO[];
  motivation: MotivationDTO;
};
