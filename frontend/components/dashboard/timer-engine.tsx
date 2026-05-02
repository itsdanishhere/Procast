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
import { normalizeProgress } from "@/lib/progress-dto";
import { externalTimerArmEvent } from "@/lib/timer-events";
import { formatSeconds, TimerMode, useTimerStore } from "@/lib/timer-store";
import type { BehavioralInsightsDTO, ProgressDTO, SessionDTO, SettingsDTO, TaskDTO } from "@/lib/types";

type TimerEngineProps = {
  tasks: TaskDTO[];
  settings: SettingsDTO;
  behavioralInsights?: BehavioralInsightsDTO;
  onSessionSaved: (session: SessionDTO, progress: ProgressDTO | null) => void;
};

const distractionOptions = ["Social Media", "Interruption", "Boredom", "Too Hard", "Other"];

export function TimerEngine({ tasks, settings, behavioralInsights, onSessionSaved }: TimerEngineProps) {
  const timer = useTimerStore();
  const [selectedMode, setSelectedMode] = useState<TimerMode>("POMODORO");
  const [customMinutes, setCustomMinutes] = useState(settings.deepFocusMinutes);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [exitReasonCategory, setExitReasonCategory] = useState("Social Media");
  const [exitCustomReason, setExitCustomReason] = useState("");
  const heartbeatInFlight = useRef(false);
  const heartbeatAuthWarningShown = useRef(false);
  const timerStatusRef = useRef(timer.status);
  const timerDurationRef = useRef(timer.durationSeconds);
  const timerRemainingRef = useRef(timer.remainingSeconds);

  timerStatusRef.current = timer.status;
  timerDurationRef.current = timer.durationSeconds;
  timerRemainingRef.current = timer.remainingSeconds;

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const timerActive = timer.status === "running" || timer.status === "paused";
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
    if (timer.status !== "running" || !timer.backendSessionId) return;

    let cancelled = false;

    async function sendHeartbeat() {
      if (cancelled || heartbeatInFlight.current || timerStatusRef.current !== "running" || !timer.backendSessionId) {
        return;
      }
      heartbeatInFlight.current = true;
      try {
        const response = await apiFetch(`/timer/sessions/${timer.backendSessionId}/heartbeat`, {
          method: "POST",
          body: JSON.stringify({
            clientTime: new Date().toISOString(),
            accumulatedFocusSeconds: Math.max(0, timerDurationRef.current - timerRemainingRef.current)
          })
        });

        if (!response.ok && response.status === 401 && !heartbeatAuthWarningShown.current) {
          heartbeatAuthWarningShown.current = true;
          toast.error("Your session expired. Please log in again to keep focus progression synced.");
        }
      } finally {
        heartbeatInFlight.current = false;
      }
    }

    void sendHeartbeat();
    const interval = window.setInterval(() => {
      void sendHeartbeat();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [timer.backendSessionId, timer.status]);

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

  async function saveSession(
    status: "COMPLETED" | "ABANDONED" | "INTERRUPTED",
    exitReason?: { reason?: string; reasonCategory?: string; customReason?: string }
  ) {
    if (!timer.backendSessionId) {
      toast.error("Backend timer session was not created. Start the session again.");
      return;
    }

    const response = await apiFetch(`/timer/sessions/${timer.backendSessionId}/${status === "COMPLETED" ? "complete" : "abandon"}`, {
      method: "POST",
      body: JSON.stringify(exitReason ?? {})
    });
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      toast.error(errorMsg || "Could not save session.");
      return;
    }

    let nextProgress = data.progress ? normalizeProgress(data.progress, data.streak) : null;
    if (status === "COMPLETED" && !nextProgress) {
      const progressResponse = await apiFetch("/users/me");
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        nextProgress = normalizeProgress(progressData.user?.progress, progressData.user?.streak);
      }
    }

    const xpEarned = Number(data.session.xpEarned ?? 0);

    onSessionSaved(
      {
        id: data.session.id,
        taskId: data.session.taskId,
        mode: data.session.mode,
        status: data.session.status,
        durationMinutes: Math.round(data.session.plannedSeconds / 60),
        actualSeconds: data.session.accumulatedFocusSeconds,
        xpEarned,
        startedAt: data.session.startedAt || data.session.createdAt,
        endedAt: data.session.completedAt || data.session.abandonedAt || data.session.updatedAt,
        task: selectedTask ? { title: selectedTask.title } : null
      },
      nextProgress
    );

    if (status === "COMPLETED") {
      toast.success(`Session complete. ${xpEarned} XP earned.`);
    } else {
      toast.error("Session marked incomplete. Your world did not grow.");
    }
  }

  function applySelection(mode: TimerMode) {
    setSelectedMode(mode);
    // Keep active timer state untouched; mode selection only prepares the next session.
    if (timerActive) return;
    const seconds = mode === "CUSTOM" 
      ? (parseInt(String(customMinutes)) || 0) * 60 
      : timerModes[mode].minutes * 60;
    timer.setModeAndDuration(mode, timerModes[mode].label, seconds);
  }

  async function startTimer() {
    window.dispatchEvent(new Event(externalTimerArmEvent));

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    setLoading(true);
    const backendMode = selectedMode === "DEEP_FOCUS" ? "DEEP_FOCUS_45" : selectedMode;
    const plannedSeconds = selectedMode === "CUSTOM" 
      ? (parseInt(String(customMinutes)) || 0) * 60 
      : timerModes[selectedMode].minutes * 60;

    if (plannedSeconds < 60) {
      toast.error("Minimum focus time is 1 minute.");
      setLoading(false);
      return;
    }

    const response = await apiFetch("/timer/sessions", {
      method: "POST",
      body: JSON.stringify({
        taskId: selectedTaskId || undefined,
        mode: backendMode,
        plannedSeconds,
        clientStartedAt: new Date().toISOString(),
        idempotencyKey: `start-${Date.now()}`,
        replaceExisting: true
      })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      const errorMsg = typeof data.error === "object" ? data.error.message || JSON.stringify(data.error) : data.error;
      const errorCode = typeof data.error === "object" ? data.error.code : "HTTP_" + response.status;
      const displayError =
        response.status === 401
          ? "Your session is not authenticated. Log in again, then start focus."
          : errorMsg || "Could not start backend timer.";
      
      toast.error(
        <div className="flex flex-col gap-1">
          <p className="font-bold">{displayError}</p>
          <p className="text-[10px] opacity-70">Error Code: {errorCode}</p>
        </div>
      );
      return;
    }

    timer.start({
      mode: selectedMode,
      label: timerModes[selectedMode].label,
      durationSeconds: plannedSeconds,
      taskId: selectedTaskId || undefined,
      taskTitle: tasks.find(t => t.id === selectedTaskId)?.title || undefined,
      backendSessionId: data.session.id
    });
    
    toast.success("Focus mode started. Your world is on the line.");
  }

  async function endEarly() {
    setConfirmExit(false);
    const category = exitReasonCategory || "Unspecified";
    const customReason = exitCustomReason.trim();
    await saveSession("ABANDONED", {
      reason: customReason || `User ended early: ${category}`,
      reasonCategory: category,
      customReason: customReason || undefined
    });
    setExitReasonCategory("Social Media");
    setExitCustomReason("");
    timer.reset();
  }

  async function pauseTimer() {
    if (timer.status !== "running") return;
    if (!timer.backendSessionId) {
      timer.pause();
      return;
    }

    const response = await apiFetch(`/timer/sessions/${timer.backendSessionId}/pause`, {
      method: "POST",
      body: JSON.stringify({})
    });
    if (!response.ok) {
      toast.error("Could not pause backend timer.");
      return;
    }
    timer.pause();
  }

  async function resumeTimer() {
    if (timer.status !== "paused") return;
    if (!timer.backendSessionId) {
      timer.resume();
      return;
    }

    const response = await apiFetch(`/timer/sessions/${timer.backendSessionId}/resume`, {
      method: "POST",
      body: JSON.stringify({})
    });
    if (!response.ok) {
      toast.error("Could not resume backend timer.");
      return;
    }
    timer.resume();
  }

  function handleReset() {
    if (timer.status === "running" || timer.status === "paused") {
      setConfirmExit(true);
      return;
    }
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
            onClick={() => applySelection(mode.mode)}
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
              <Button variant="secondary" onClick={() => void pauseTimer()}>
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            ) : timer.status === "paused" ? (
              <Button onClick={() => void resumeTimer()}>
                <Play className="h-4 w-4" />
                Resume
              </Button>
            ) : (
              <Button onClick={startTimer} disabled={loading}>
                <Play className="h-4 w-4" />
                {loading ? "Starting..." : "Start Focus"}
              </Button>
            )}
            <Button variant="secondary" size="lg" className="rounded-full px-6 font-bold" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full border-cyan/20 px-6 font-bold text-cyan hover:bg-cyan/10"
              onClick={() => applySelection(selectedMode)}
            >
              Set
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
          <p className="font-bold text-danger">Hold on. What pulled you away?</p>
          <p className="mt-1 text-sm text-muted">
            Ending now records an incomplete session
            {behavioralInsights ? ` and can lower your ${behavioralInsights.completionRate}% completion rate` : ""}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {distractionOptions.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setExitReasonCategory(reason)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                  exitReasonCategory === reason
                    ? "border-cyan bg-cyan text-[#071019]"
                    : "border-white/10 bg-white/[0.05] text-muted hover:text-foreground"
                )}
              >
                {reason}
              </button>
            ))}
          </div>
          {exitReasonCategory === "Other" ? (
            <Input
              className="mt-3"
              value={exitCustomReason}
              onChange={(event) => setExitCustomReason(event.target.value)}
              placeholder="Name the distraction"
            />
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="danger" size="sm" onClick={endEarly}>
              End and log distraction
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
