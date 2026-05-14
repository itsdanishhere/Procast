"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { emitFocusMusicCommand } from "@/lib/music-events";
import { emitProgressUpdate, normalizeProgress } from "@/lib/progress-dto";
import { emitTimerSessionSaved } from "@/lib/timer-events";
import { useTimerStore } from "@/lib/timer-store";
import type { ProgressDTO } from "@/lib/types";

function playCompletionSound() {
  const browserWindow = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextClass = browserWindow.AudioContext || browserWindow.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 720;
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.48);
}

async function loadProgressFallback(): Promise<ProgressDTO | null> {
  const progressResponse = await apiFetch("/users/me");
  if (!progressResponse.ok) return null;

  const progressData = await progressResponse.json();
  return normalizeProgress(progressData.user?.progress, progressData.user?.streak);
}

export function TimerCompletionSync() {
  const timer = useTimerStore();
  const reportedCompletion = useRef<string | null>(null);

  useEffect(() => {
    if (timer.status !== "completed" || !timer.completionId || reportedCompletion.current === timer.completionId) {
      return;
    }

    reportedCompletion.current = timer.completionId;

    async function completeSession() {
      if (!timer.backendSessionId) {
        toast.error("Backend timer session was not created. Start the session again.");
        emitFocusMusicCommand({ action: "stop" });
        return;
      }

      emitFocusMusicCommand({ action: "stop" });
      playCompletionSound();
      if (Notification.permission === "granted") {
        new Notification("ProCast session complete", {
          body: "XP added. Reflect now to strengthen tomorrow's focus."
        });
      }

      const response = await apiFetch(`/timer/sessions/${timer.backendSessionId}/complete`, {
        method: "POST",
        body: JSON.stringify({})
      });
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
        toast.error(errorMsg || "Could not save completed session.");
        return;
      }

      const nextProgress = data.progress ? normalizeProgress(data.progress, data.streak) : await loadProgressFallback();
      const xpEarned = Number(data.session.xpEarned ?? 0);
      const session = {
        id: data.session.id,
        taskId: data.session.taskId,
        mode: data.session.mode,
        status: data.session.status,
        durationMinutes: Math.round(data.session.plannedSeconds / 60),
        actualSeconds: data.session.accumulatedFocusSeconds,
        xpEarned,
        startedAt: data.session.startedAt || data.session.createdAt,
        endedAt: data.session.completedAt || data.session.updatedAt,
        task: timer.taskTitle ? { title: timer.taskTitle } : null
      };

      if (nextProgress) emitProgressUpdate(nextProgress);
      emitTimerSessionSaved({ session, progress: nextProgress });
      toast.success(`Session complete. ${xpEarned} XP earned.`);
    }

    void completeSession();
  }, [timer]);

  return null;
}
