"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock3, Flame, Sparkles } from "lucide-react";

import { ReflectionModal } from "@/components/dashboard/reflection-modal";
import { TaskManager } from "@/components/dashboard/task-manager";
import { TimerEngine } from "@/components/dashboard/timer-engine";
import { WorldProgressCard } from "@/components/dashboard/world-progress-card";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { defaultBehavioralInsights, fetchRecentSessions, fetchTasks, normalizeBehavioralInsights, normalizeSettings } from "@/lib/live-data";
import { emitProgressUpdate, normalizeProgress } from "@/lib/progress-dto";
import { appDataRefreshEvent, timerSessionSavedEvent, type TimerSessionSavedDetail } from "@/lib/timer-events";
import type { BehavioralInsightsDTO, ProgressDTO, SessionDTO, SettingsDTO, TaskDTO } from "@/lib/types";

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function countCompletedToday(sessions: SessionDTO[]) {
  return sessions.filter((session) => session.status === "COMPLETED" && isToday(session.startedAt)).length;
}

export function DashboardClient({
  initialTasks,
  initialSessions,
  initialProgress,
  settings
}: {
  initialTasks: TaskDTO[];
  initialSessions: SessionDTO[];
  initialProgress: ProgressDTO;
  settings: SettingsDTO;
}) {
  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);
  const [sessions, setSessions] = useState<SessionDTO[]>(initialSessions);
  const [progress, setProgress] = useState<ProgressDTO>(initialProgress);
  const [currentSettings, setCurrentSettings] = useState<SettingsDTO>(settings);
  const [behavior, setBehavior] = useState<BehavioralInsightsDTO>(defaultBehavioralInsights);
  const [reflectionSessionId, setReflectionSessionId] = useState<string | null>(null);
  const [todayCompletedCount, setTodayCompletedCount] = useState(() => countCompletedToday(initialSessions));

  function addSession(session: SessionDTO) {
    setSessions((current) => {
      if (current.some((item) => item.id === session.id)) return current;
      if (session.status === "COMPLETED" && isToday(session.startedAt)) {
        setTodayCompletedCount((count) => count + 1);
      }
      return [session, ...current];
    });
  }

  const loadDashboard = useCallback(async () => {
    try {
      const [tasksData, sessionsData, meRes, analyticsRes] = await Promise.all([
        fetchTasks(),
        fetchRecentSessions(10),
        apiFetch("/users/me"),
        apiFetch("/analytics/dashboard")
      ]);

      setTasks(tasksData);
      setSessions(sessionsData);
      setTodayCompletedCount(countCompletedToday(sessionsData));

      if (meRes.ok) {
        const meData = await meRes.json();
        const mergedProgress = normalizeProgress(meData.user.progress, meData.user.streak, initialProgress);
        setCurrentSettings(normalizeSettings(meData.user?.settingsDto ?? meData.user?.settings, meData.user?.profile, settings));
        setProgress(mergedProgress);
        emitProgressUpdate(mergedProgress);
      }
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setBehavior(normalizeBehavioralInsights(analyticsData, defaultBehavioralInsights));
        const todayKey = new Date().toISOString().slice(0, 10);
        const today = analyticsData.daily?.find((item: { day: string }) => item.day === todayKey) ?? analyticsData.daily?.at(-1);
        setTodayCompletedCount((current) => Math.max(current, today?.completedSessions ?? today?.sessions ?? 0));
      }
    } catch (e) {
      console.error("Dashboard load failed", e);
    }
  }, [initialProgress, settings]);

  useEffect(() => {
    void loadDashboard();
    window.addEventListener(appDataRefreshEvent, loadDashboard);
    return () => window.removeEventListener(appDataRefreshEvent, loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    function handleSavedSession(event: Event) {
      const { session, progress: nextProgress } = (event as CustomEvent<TimerSessionSavedDetail>).detail;
      addSession(session);
      if (nextProgress) setProgress(nextProgress);
      if (session.status === "COMPLETED") setReflectionSessionId(session.id);
    }
    function handleProgress(event: Event) {
      setProgress((event as CustomEvent<ProgressDTO>).detail);
    }

    window.addEventListener(timerSessionSavedEvent, handleSavedSession);
    window.addEventListener("procast:progress-updated", handleProgress);
    return () => {
      window.removeEventListener(timerSessionSavedEvent, handleSavedSession);
      window.removeEventListener("procast:progress-updated", handleProgress);
    };
  }, []);

  return (
    <>
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {[
          { label: "Today", value: `${todayCompletedCount}/${currentSettings.dailyFocusGoal}`, icon: Clock3, color: "text-cyan" },
          { label: "Streak", value: `${progress.dailyStreak} days`, icon: Flame, color: "text-amber" },
          { label: "XP", value: (progress.totalXp ?? 0).toLocaleString(), icon: Sparkles, color: "text-mint" },
          { label: "Lock Pressure", value: progress.lockStrikes ? `${progress.lockStrikes} strike` : "Stable", icon: Activity, color: "text-danger" }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold">{item.value}</p>
                </div>
                <Icon className={`h-6 w-6 ${item.color}`} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card
        className={
          behavior.motivation.messageType === "locked"
            ? "mb-5 border-danger/25 bg-danger/10 p-5"
            : behavior.motivation.messageType === "warning"
              ? "mb-5 border-amber/25 bg-amber/10 p-5"
              : "mb-5 border-mint/25 bg-mint/10 p-5"
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-center">
          <div className="flex gap-3">
            <AlertTriangle className={behavior.motivation.messageType === "encouragement" ? "mt-1 h-5 w-5 text-mint" : "mt-1 h-5 w-5 text-amber"} />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Behavior signal</p>
              <p className="mt-1 text-sm font-bold leading-6">{behavior.motivation.message}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Completion</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-mint">{behavior.completionRate}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Main distraction</p>
              <p className="mt-1 line-clamp-1 font-bold text-amber">{behavior.topDistraction}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="dashboard-grid">
        <div className="space-y-5">
          <TimerEngine
            tasks={tasks.filter((task) => task.status === "ACTIVE")}
            settings={currentSettings}
            behavioralInsights={behavior}
            onSessionSavedAction={(session, nextProgress) => {
              addSession(session);
              if (nextProgress) {
                setProgress(nextProgress);
                emitProgressUpdate(nextProgress);
              }
              if (session.status === "COMPLETED") setReflectionSessionId(session.id);
            }}
          />
          <TaskManager tasks={tasks} onTasksChangeAction={setTasks} />
        </div>
        <div className="space-y-5">
          <WorldProgressCard progress={progress} unlockedElements={behavior.unlockedElements} />
          <Card>
            <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.18em] text-cyan">Recent session log</p>
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted">No sessions yet. Start one focus block to activate your world.</p>
              ) : (
                sessions.slice(0, 6).map((session) => (
                  <div key={session.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div>
                      <p className="text-sm font-bold">{session.task?.title || session.mode.replace("_", " ")}</p>
                      <p className="text-xs text-muted">
                        {session.durationMinutes} min · {new Date(session.startedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={session.status === "COMPLETED" ? "text-sm font-bold text-mint" : "text-sm font-bold text-danger"}>
                      {session.xpEarned > 0 ? `+${session.xpEarned}` : session.xpEarned} XP
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <ReflectionModal
        sessionId={reflectionSessionId}
        open={Boolean(reflectionSessionId)}
        onCloseAction={() => setReflectionSessionId(null)}
      />
    </>
  );
}
