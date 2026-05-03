"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { FocusMusicPlayer } from "@/components/dashboard/focus-music-player";
import { FloatingTimer } from "@/components/dashboard/floating-timer";
import { TimerCompletionSync } from "@/components/providers/timer-completion-sync";
import { apiFetch } from "@/lib/api-client";
import { timerModes } from "@/lib/constants";
import { focusMusicOpenEvent } from "@/lib/music-events";
import { appDataRefreshEvent, appDataRefreshStorageKey, type AppDataRefreshDetail } from "@/lib/timer-events";
import type { TimerMode } from "@/lib/timer-store";
import { useTimerStore } from "@/lib/timer-store";

type ActiveTimerResponse = {
  session?: {
    id: string;
    mode: string;
    status: "RUNNING" | "PAUSED";
    plannedSeconds: number;
    accumulatedFocusSeconds: number;
    startedAt?: string | null;
    expectedEndAt?: string | null;
    antiCheatFlags?: unknown;
    taskId?: string | null;
    task?: { title?: string | null } | null;
  } | null;
};

function isStopwatchSession(session: NonNullable<ActiveTimerResponse["session"]>) {
  return Array.isArray(session.antiCheatFlags)
    ? session.antiCheatFlags.some((flag) => flag && typeof flag === "object" && (flag as { type?: unknown }).type === "stopwatch_mode")
    : false;
}

function frontendTimerMode(session: NonNullable<ActiveTimerResponse["session"]>): TimerMode {
  if (isStopwatchSession(session)) return "STOPWATCH";
  if (session.mode === "DEEP_FOCUS_45" || session.mode === "DEEP_FOCUS_60") return "DEEP_FOCUS";
  if (session.mode in timerModes) return session.mode as TimerMode;
  return "CUSTOM";
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [musicPlayerOpen, setMusicPlayerOpen] = useState(false);
  const timerStatus = useTimerStore((state) => state.status);
  const restoreTimer = useTimerStore((state) => state.restore);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== appDataRefreshStorageKey || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as AppDataRefreshDetail;
        window.dispatchEvent(new CustomEvent<AppDataRefreshDetail>(appDataRefreshEvent, { detail: parsed }));
      } catch {
        window.dispatchEvent(new CustomEvent<AppDataRefreshDetail>(appDataRefreshEvent, { detail: { reason: "storage-refresh" } }));
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (timerStatus === "running" || timerStatus === "paused") return;

    let cancelled = false;
    async function restoreActiveTimer() {
      let response: Response;
      try {
        response = await apiFetch("/timer/active");
      } catch {
        return;
      }
      if (!response.ok || cancelled) return;

      const data = (await response.json()) as ActiveTimerResponse;
      const session = data.session;
      if (!session || (session.status !== "RUNNING" && session.status !== "PAUSED")) return;

      const mode = frontendTimerMode(session);
      const isStopwatch = mode === "STOPWATCH";
      const runningExtraSeconds =
        session.status === "RUNNING" && session.startedAt
          ? Math.max(0, Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000))
          : 0;
      const elapsedSeconds = Math.max(0, session.accumulatedFocusSeconds + runningExtraSeconds);
      const expectedRemaining = session.expectedEndAt
        ? Math.max(0, Math.ceil((Date.parse(session.expectedEndAt) - Date.now()) / 1000))
        : Math.max(0, session.plannedSeconds - elapsedSeconds);

      restoreTimer({
        mode,
        label: timerModes[mode].label,
        durationSeconds: session.plannedSeconds,
        remainingSeconds: isStopwatch ? elapsedSeconds : expectedRemaining,
        status: session.status === "RUNNING" ? "running" : "paused",
        taskId: session.taskId ?? null,
        taskTitle: session.task?.title ?? null,
        backendSessionId: session.id,
        runStartedAtMs: session.startedAt ? Date.parse(session.startedAt) : null,
        stopwatchAccumulatedSeconds: session.accumulatedFocusSeconds
      });
    }

    void restoreActiveTimer();
    return () => {
      cancelled = true;
    };
  }, [restoreTimer, timerStatus]);

  useEffect(() => {
    function handleOpenMusicPlayer() {
      setMusicPlayerOpen(true);
    }

    window.addEventListener(focusMusicOpenEvent, handleOpenMusicPlayer);
    return () => window.removeEventListener(focusMusicOpenEvent, handleOpenMusicPlayer);
  }, []);

  return (
    <>
      {children}
      <TimerCompletionSync />
      <FloatingTimer />
      <FocusMusicPlayer open={musicPlayerOpen} onCloseAction={() => setMusicPlayerOpen(false)} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(14, 16, 26, 0.94)",
            color: "#eef2f7",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(18px)"
          }
        }}
      />
    </>
  );
}
