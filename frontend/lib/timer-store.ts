"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TimerMode = "POMODORO" | "SHORT_BREAK" | "LONG_BREAK" | "DEEP_FOCUS" | "CUSTOM";
export type TimerStatus = "idle" | "running" | "paused" | "completed";

type TimerState = {
  mode: TimerMode;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
  startedAtIso: string | null;
  endsAtMs: number | null;
  taskId: string | null;
  taskTitle: string | null;
  backendSessionId: string | null;
  completionId: string | null;
  start: (input: {
    mode: TimerMode;
    label: string;
    durationSeconds: number;
    taskId?: string | null;
    taskTitle?: string | null;
    backendSessionId?: string | null;
  }) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  complete: () => void;
  tick: () => void;
  setModeAndDuration: (mode: TimerMode, label: string, seconds: number) => void;
  autoPip: boolean;
  setAutoPip: (val: boolean) => void;
};

function getRemaining(endsAtMs: number | null) {
  if (!endsAtMs) return 0;
  return Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      mode: "POMODORO",
      label: "Pomodoro",
      durationSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      status: "idle",
      startedAtIso: null,
      endsAtMs: null,
      taskId: null,
      taskTitle: null,
      backendSessionId: null,
      completionId: null,
      start: ({ mode, label, durationSeconds, taskId, taskTitle, backendSessionId }) => {
        const now = Date.now();
        set({
          mode,
          label,
          durationSeconds,
          remainingSeconds: durationSeconds,
          status: "running",
          startedAtIso: new Date(now).toISOString(),
          endsAtMs: now + durationSeconds * 1000,
          taskId: taskId || null,
          taskTitle: taskTitle || null,
          backendSessionId: backendSessionId || null,
          completionId: null
        });
      },
      pause: () => {
        const state = get();
        if (state.status !== "running") return;
        set({
          remainingSeconds: getRemaining(state.endsAtMs),
          endsAtMs: null,
          status: "paused"
        });
      },
      resume: () => {
        const state = get();
        if (state.status !== "paused") return;
        set({
          endsAtMs: Date.now() + state.remainingSeconds * 1000,
          status: "running"
        });
      },
      reset: () => {
        const state = get();
        set({
          remainingSeconds: state.durationSeconds,
          endsAtMs: null,
          status: "idle",
          startedAtIso: null,
          backendSessionId: null,
          completionId: null
        });
      },
      complete: () => {
        const state = get();
        set({
          remainingSeconds: 0,
          endsAtMs: null,
          status: "completed",
          completionId: state.completionId || crypto.randomUUID()
        });
      },
      tick: () => {
        const state = get();
        if (state.status !== "running" || !state.endsAtMs) return;

        const remainingSeconds = getRemaining(state.endsAtMs);
        if (remainingSeconds <= 0) {
          get().complete();
        } else {
          set({ remainingSeconds });
        }
      },
      setModeAndDuration: (mode, label, seconds) => {
        set({
          mode,
          label,
          durationSeconds: seconds,
          remainingSeconds: seconds,
          status: "idle",
          endsAtMs: null,
          startedAtIso: null
        });
      },
      autoPip: false,
      setAutoPip: (autoPip: boolean) => set({ autoPip })
    }),
    {
      name: "procast-timer-v1"
    }
  )
);

export function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
