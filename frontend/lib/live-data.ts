import { apiFetch } from "@/lib/api-client";
import { emitProgressUpdate, normalizeProgress } from "@/lib/progress-dto";
import type { BehavioralInsightsDTO, MotivationDTO, ProgressDTO, ReflectionDTO, SessionDTO, SettingsDTO, TaskDTO } from "@/lib/types";

export const defaultSettings: SettingsDTO = {
  dailyFocusGoal: 3,
  deepFocusMinutes: 45,
  remindersEnabled: true,
  focusSoundsEnabled: true,
  lockBackEnabled: true,
  notificationHour: 19,
  preferredAmbientSound: "rain"
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function normalizeSettings(raw: unknown, profile?: unknown, fallback: SettingsDTO = defaultSettings): SettingsDTO {
  const settings = objectValue(raw);
  const profileObject = objectValue(profile);
  const reminderPreferences = objectValue(settings.reminderPreferences);
  const timerPreferences = objectValue(settings.timerPreferences);
  const focusModePreferences = objectValue(settings.focusModePreferences);

  return {
    dailyFocusGoal: numberValue(settings.dailyFocusGoal, numberValue(profileObject.currentFocusGoal, fallback.dailyFocusGoal)),
    deepFocusMinutes: numberValue(settings.deepFocusMinutes, numberValue(timerPreferences.deepFocus, fallback.deepFocusMinutes)),
    remindersEnabled: booleanValue(settings.remindersEnabled, booleanValue(reminderPreferences.enabled, fallback.remindersEnabled)),
    focusSoundsEnabled: booleanValue(
      settings.focusSoundsEnabled,
      booleanValue(focusModePreferences.focusSoundsEnabled, fallback.focusSoundsEnabled)
    ),
    lockBackEnabled: booleanValue(settings.lockBackEnabled, booleanValue(focusModePreferences.lockBackEnabled, fallback.lockBackEnabled)),
    notificationHour: numberValue(settings.notificationHour, numberValue(reminderPreferences.hour, fallback.notificationHour)),
    preferredAmbientSound: stringValue(
      settings.preferredAmbientSound,
      stringValue(focusModePreferences.preferredAmbientSound, fallback.preferredAmbientSound)
    )
  };
}

export function normalizeTask(task: any): TaskDTO {
  return {
    id: String(task.id),
    title: String(task.title ?? "Untitled task"),
    avoidance: task.avoidance ?? task.avoidancePrompts?.[0]?.prompt ?? null,
    priority: task.priority ?? "MEDIUM",
    dueDate: task.dueDate ?? task.dueAt ?? null,
    tags: Array.isArray(task.tags) ? task.tags : [],
    status: task.status ?? "ACTIVE",
    completedAt: task.completedAt ?? null,
    createdAt: task.createdAt ?? new Date().toISOString()
  };
}

export function normalizeSession(session: any): SessionDTO {
  return {
    id: String(session.id),
    taskId: session.taskId ?? null,
    mode: String(session.mode ?? "POMODORO"),
    status: String(session.status ?? "COMPLETED"),
    durationMinutes: numberValue(session.durationMinutes, Math.round(numberValue(session.plannedSeconds, 0) / 60)),
    actualSeconds: numberValue(session.actualSeconds, numberValue(session.accumulatedFocusSeconds, 0)),
    xpEarned: numberValue(session.xpEarned, 0),
    startedAt: session.startedAt ?? session.createdAt ?? new Date().toISOString(),
    endedAt: session.endedAt ?? session.completedAt ?? session.abandonedAt ?? session.updatedAt ?? new Date().toISOString(),
    task: session.task ? { title: String(session.task.title ?? "Untitled task") } : null,
    distractionReason: session.distractionReason ?? session.distractionLogs?.[0]?.reasonCategory ?? null
  };
}

export function normalizeReflection(reflection: any): ReflectionDTO {
  return {
    id: String(reflection.id),
    sessionId: reflection.sessionId ?? reflection.focusSessionId ?? null,
    focusRating: typeof reflection.focusRating === "number" ? reflection.focusRating : null,
    distraction: String(reflection.distraction ?? ""),
    wentWell: String(reflection.wentWell ?? ""),
    improve: String(reflection.improve ?? reflection.improveTomorrow ?? ""),
    notes: reflection.notes ?? reflection.reflectionNotes ?? null,
    createdAt: reflection.createdAt ?? new Date().toISOString(),
    deletedAt: reflection.deletedAt ?? null
  };
}

const defaultMotivation: MotivationDTO = {
  messageType: "neutral",
  message: "Complete one focused session to generate your next ProCast signal.",
  missedDays: null
};

export const defaultBehavioralInsights: BehavioralInsightsDTO = {
  completionRate: 0,
  topDistraction: "None yet",
  totalSessions: 0,
  completedSessions: 0,
  abandonedSessions: 0,
  environmentStatus: "active",
  unlockedElements: [],
  motivation: defaultMotivation
};

export function normalizeBehavioralInsights(payload: any, fallback: BehavioralInsightsDTO = defaultBehavioralInsights): BehavioralInsightsDTO {
  const source = objectValue(payload?.behavioralInsights ?? payload);
  const summary = objectValue(payload?.summary);
  const motivation = objectValue(source.motivation ?? payload?.motivation);

  return {
    completionRate: numberValue(source.completionRate, numberValue(summary.completionRate, fallback.completionRate)),
    topDistraction: stringValue(source.topDistraction, stringValue(summary.topDistraction, fallback.topDistraction)),
    totalSessions: numberValue(source.totalSessions, numberValue(summary.totalSessions, fallback.totalSessions)),
    completedSessions: numberValue(source.completedSessions, numberValue(summary.completedSessions, fallback.completedSessions)),
    abandonedSessions: numberValue(source.abandonedSessions, numberValue(summary.abandonedSessions, fallback.abandonedSessions)),
    environmentStatus: source.environmentStatus === "locked" ? "locked" : "active",
    unlockedElements: Array.isArray(source.unlockedElements)
      ? source.unlockedElements.map((item: any) => ({
          stage: String(item.stage ?? ""),
          stageName: String(item.stageName ?? item.stage ?? ""),
          elementName: String(item.elementName ?? item.stageName ?? item.stage ?? ""),
          milestonePercent: typeof item.milestonePercent === "number" ? item.milestonePercent : undefined,
          locked: Boolean(item.locked),
          unlockedAt: item.unlockedAt ?? null,
          lockedAt: item.lockedAt ?? null
        }))
      : fallback.unlockedElements,
    motivation: {
      messageType:
        motivation.messageType === "encouragement" || motivation.messageType === "warning" || motivation.messageType === "locked"
          ? motivation.messageType
          : fallback.motivation.messageType,
      message: stringValue(motivation.message, fallback.motivation.message),
      missedDays: typeof motivation.missedDays === "number" ? motivation.missedDays : null
    }
  };
}

export async function fetchCurrentUserProgress(fallback?: ProgressDTO) {
  const response = await apiFetch("/users/me");
  if (!response.ok) return fallback ?? null;
  const data = await response.json();
  return normalizeProgress(data.user?.progress, data.user?.streak, fallback);
}

export async function fetchAndEmitCurrentProgress(fallback?: ProgressDTO) {
  const progress = await fetchCurrentUserProgress(fallback);
  if (progress) emitProgressUpdate(progress);
  return progress;
}

export async function fetchCurrentUserSettings(fallback: SettingsDTO = defaultSettings) {
  const response = await apiFetch("/users/me");
  if (!response.ok) return { settings: fallback, user: null as null | any, progress: null as null | ProgressDTO };
  const data = await response.json();
  return {
    settings: normalizeSettings(data.user?.settingsDto ?? data.user?.settings, data.user?.profile, fallback),
    user: data.user,
    progress: normalizeProgress(data.user?.progress, data.user?.streak)
  };
}

export async function fetchTasks() {
  const response = await apiFetch("/tasks");
  if (!response.ok) return [];
  const data = await response.json();
  return (data.tasks ?? []).map(normalizeTask);
}

export async function fetchRecentSessions(limit = 25) {
  const response = await apiFetch(`/timer/sessions?limit=${limit}`);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.sessions ?? []).map(normalizeSession);
}

export async function fetchReflections() {
  const response = await apiFetch("/reflections");
  if (!response.ok) return [];
  const data = await response.json();
  return (data.reflections ?? []).map(normalizeReflection);
}

export async function fetchDeletedReflections() {
  const response = await apiFetch("/reflections?deleted=true");
  if (!response.ok) return [];
  const data = await response.json();
  return (data.reflections ?? []).map(normalizeReflection);
}

export async function fetchBehavioralInsights(fallback: BehavioralInsightsDTO = defaultBehavioralInsights) {
  const response = await apiFetch("/analytics/dashboard");
  if (!response.ok) return fallback;
  const data = await response.json();
  return normalizeBehavioralInsights(data, fallback);
}
