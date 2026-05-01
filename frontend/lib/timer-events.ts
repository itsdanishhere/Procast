import type { ProgressDTO, SessionDTO } from "@/lib/types";

export const timerSessionSavedEvent = "procast:timer-session-saved";
export const externalTimerArmEvent = "procast:external-timer-arm";
export const appDataRefreshEvent = "procast:app-data-refresh";
export const appDataRefreshStorageKey = "procast:app-data-refresh-ping";
export const reflectionSavedEvent = "procast:reflection-saved";

export type TimerSessionSavedDetail = {
  session: SessionDTO;
  progress: ProgressDTO | null;
};

export type AppDataRefreshDetail = {
  reason: string;
};

export function emitTimerSessionSaved(detail: TimerSessionSavedDetail) {
  window.dispatchEvent(new CustomEvent<TimerSessionSavedDetail>(timerSessionSavedEvent, { detail }));
  emitAppDataRefresh("timer-session-saved");
}

export function emitAppDataRefresh(reason: string) {
  const detail = { reason };
  window.dispatchEvent(new CustomEvent<AppDataRefreshDetail>(appDataRefreshEvent, { detail }));
  try {
    localStorage.setItem(appDataRefreshStorageKey, JSON.stringify({ ...detail, at: Date.now() }));
  } catch {
    // Storage can be disabled; same-tab live updates already fired above.
  }
}

export function emitReflectionSaved() {
  window.dispatchEvent(new Event(reflectionSavedEvent));
  emitAppDataRefresh("reflection-saved");
}
