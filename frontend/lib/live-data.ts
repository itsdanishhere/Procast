import { apiFetch } from "@/lib/api-client";
import { emitProgressUpdate, normalizeProgress } from "@/lib/progress-dto";
import type { ProgressDTO, ReflectionDTO, SessionDTO, SettingsDTO, TaskDTO } from "@/lib/types";

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
    task: session.task ? { title: String(session.task.title ?? "Untitled task") } : null
  };
}

export function normalizeReflection(reflection: any): ReflectionDTO {
  return {
    id: String(reflection.id),
    sessionId: reflection.sessionId ?? reflection.focusSessionId ?? null,
    distraction: String(reflection.distraction ?? ""),
    wentWell: String(reflection.wentWell ?? ""),
    improve: String(reflection.improve ?? reflection.improveTomorrow ?? ""),
    createdAt: reflection.createdAt ?? new Date().toISOString()
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
