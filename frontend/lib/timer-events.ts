import type { ProgressDTO, SessionDTO } from "@/lib/types";

export const timerSessionSavedEvent = "procast:timer-session-saved";
export const externalTimerArmEvent = "procast:external-timer-arm";

export type TimerSessionSavedDetail = {
  session: SessionDTO;
  progress: ProgressDTO | null;
};

export function emitTimerSessionSaved(detail: TimerSessionSavedDetail) {
  window.dispatchEvent(new CustomEvent<TimerSessionSavedDetail>(timerSessionSavedEvent, { detail }));
}
