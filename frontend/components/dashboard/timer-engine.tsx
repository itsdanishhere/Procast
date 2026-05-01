"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Headphones, Pause, Play, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-client";
import { timerModes } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatSeconds, TimerMode, useTimerStore } from "@/lib/timer-store";
import type { ProgressDTO, SessionDTO, SettingsDTO, TaskDTO } from "@/lib/types";

type TimerEngineProps = {
  tasks: TaskDTO[];
  settings: SettingsDTO;
  onSessionSaved: (session: SessionDTO, progress: ProgressDTO | null) => void;
};

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

export function TimerEngine({ tasks, settings, onSessionSaved }: TimerEngineProps) {
  const timer = useTimerStore();
  const [selectedMode, setSelectedMode] = useState<TimerMode>("POMODORO");
  const [customMinutes, setCustomMinutes] = useState(settings.deepFocusMinutes);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [confirmExit, setConfirmExit] = useState(false);
  const reportedCompletion = useRef<string | null>(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedDuration = selectedMode === "CUSTOM" ? customMinutes : timerModes[selectedMode].minutes;
  const progressPercent = timer.durationSeconds
    ? ((timer.durationSeconds - timer.remainingSeconds) / timer.durationSeconds) * 100
    : 0;

  const modeButtons = useMemo(
    () =>
      (Object.keys(timerModes) as TimerMode[]).map((mode) => ({
        mode,
        ...timerModes[mode]
      })),
    []
  );

  useEffect(() => {
    const interval = window.setInterval(timer.tick, 500);
    return () => window.clearInterval(interval);
  }, [timer.tick]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (timer.status === "running") {
        event.preventDefault();
        event.returnValue = "A focus session is running. Leaving early can trigger a penalty.";
      }
    }

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [timer.status]);

  useEffect(() => {
    if (timer.status !== "completed" || !timer.completionId || reportedCompletion.current === timer.completionId) {
      return;
    }

    reportedCompletion.current = timer.completionId;
    playCompletionSound();
    if (Notification.permission === "granted") {
      new Notification("ProCast session complete", {
        body: "XP added. Reflect now to strengthen tomorrow's focus."
      });
    }

    void saveSession("COMPLETED");
  }, [timer.status, timer.completionId]);

  async function saveSession(status: "COMPLETED" | "ABANDONED" | "INTERRUPTED", reason?: string) {
    if (!timer.backendSessionId) {
      toast.error("Backend timer session was not created. Start the session again.");
      return;
    }

    const response = await apiFetch(`/timer/sessions/${timer.backendSessionId}/${status === "COMPLETED" ? "complete" : "abandon"}`, {
      method: "POST",
      body: JSON.stringify({
        reason
      })
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error || "Could not save session.");
      return;
    }

    onSessionSaved(
      {
        id: data.session.id,
        taskId: data.session.taskId,
        mode: data.session.mode,
        status: data.session.status,
        durationMinutes: Math.round(data.session.plannedSeconds / 60),
        actualSeconds: data.session.accumulatedFocusSeconds,
        xpEarned: 0,
        startedAt: data.session.startedAt || data.session.createdAt,
        endedAt: data.session.completedAt || data.session.abandonedAt || data.session.updatedAt,
        task: selectedTask ? { title: selectedTask.title } : null
      },
      null
    );

    if (status === "COMPLETED") {
      toast.success(`Session complete. ${data.session.xpEarned} XP earned.`);
    } else {
      toast.error("Session marked incomplete. Your world did not grow.");
    }
  }

  async function startTimer() {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    const backendMode = selectedMode === "DEEP_FOCUS" ? "DEEP_FOCUS_45" : selectedMode;
    const response = await apiFetch("/timer/sessions", {
      method: "POST",
      body: JSON.stringify({
        taskId: selectedTask?.id,
        mode: backendMode,
        plannedSeconds: selectedDuration * 60,
        clientStartedAt: new Date().toISOString(),
        idempotencyKey: crypto.randomUUID()
      })
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error?.message || data.error || "Could not start backend timer.");
      return;
    }

    timer.start({
      mode: selectedMode,
      label: timerModes[selectedMode].label,
      durationSeconds: selectedDuration * 60,
      taskId: selectedTask?.id,
      taskTitle: selectedTask?.title,
      backendSessionId: data.session.id
    });
    toast.success("Focus mode started. Your world is on the line.");
  }

  async function endEarly() {
    setConfirmExit(false);
    await saveSession("ABANDONED", "User ended the focus block before completion.");
    timer.reset();
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>Focus Timer Engine</CardTitle>
          <CardDescription>Structured sessions, recovery after refresh, early-exit penalty, and completion XP.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="secondary" title="Browser notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" title="Ambient focus sounds">
            <Headphones className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <div className="mb-5 flex flex-wrap gap-2">
        {modeButtons.map((mode) => (
          <button
            key={mode.mode}
            type="button"
            onClick={() => setSelectedMode(mode.mode)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              selectedMode === mode.mode
                ? "border-cyan bg-cyan text-[#071019]"
                : "border-white/10 bg-white/[0.04] text-muted hover:text-foreground"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_150px]">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted">Attach a task</span>
          <select
            value={selectedTaskId}
            onChange={(event) => setSelectedTaskId(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-[#11131d] px-4 text-sm text-foreground outline-none focus:border-cyan"
          >
            <option value="">No task selected</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted">Minutes</span>
          <Input
            type="number"
            min={1}
            max={120}
            value={selectedDuration}
            disabled={selectedMode !== "CUSTOM"}
            onChange={(event) => setCustomMinutes(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="grid items-center gap-7 lg:grid-cols-[300px_1fr]">
        <div className="relative mx-auto flex h-[280px] w-[280px] items-center justify-center rounded-full premium-ring">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="url(#timerGradient)"
              strokeLinecap="round"
              strokeWidth="5"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={(1 - progressPercent / 100) * 2 * Math.PI * 52}
            />
            <defs>
              <linearGradient id="timerGradient" x1="0" x2="1">
                <stop stopColor="#63b3ed" />
                <stop offset="1" stopColor="#76e4a7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-center">
            <p className="font-display text-6xl font-extrabold">{formatSeconds(timer.remainingSeconds)}</p>
            <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.22em] text-muted">{timer.label}</p>
          </div>
        </div>

        <div>
          <div className="mb-5 rounded-2xl border border-amber/20 bg-amber/10 p-4">
            <p className="flex items-center gap-2 text-sm font-extrabold text-amber">
              <ShieldAlert className="h-4 w-4" />
              Focus lock warning
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Ending early records an incomplete session and can increase lock-back pressure on your world progression.
            </p>
          </div>
          <Progress value={progressPercent} className="mb-5 h-2.5" />
          <div className="flex flex-wrap gap-3">
            {timer.status === "running" ? (
              <Button variant="secondary" onClick={timer.pause}>
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            ) : timer.status === "paused" ? (
              <Button onClick={timer.resume}>
                <Play className="h-4 w-4" />
                Resume
              </Button>
            ) : (
              <Button onClick={startTimer}>
                <Play className="h-4 w-4" />
                Start Focus
              </Button>
            )}
            <Button variant="secondary" onClick={timer.reset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            {(timer.status === "running" || timer.status === "paused") && (
              <Button variant="danger" onClick={() => setConfirmExit(true)}>
                End Early
              </Button>
            )}
          </div>
        </div>
      </div>

      {confirmExit ? (
        <div className="mt-5 rounded-2xl border border-danger/25 bg-danger/10 p-4">
          <p className="font-bold text-danger">Quit this session?</p>
          <p className="mt-1 text-sm text-muted">This records an incomplete session. Your progress will not grow.</p>
          <div className="mt-4 flex gap-2">
            <Button variant="danger" size="sm" onClick={endEarly}>
              Confirm penalty
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmExit(false)}>
              Keep focusing
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
