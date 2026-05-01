"use client";

import { useState } from "react";
import { Activity, Clock3, Flame, Sparkles } from "lucide-react";

import { ReflectionModal } from "@/components/dashboard/reflection-modal";
import { TaskManager } from "@/components/dashboard/task-manager";
import { TimerEngine } from "@/components/dashboard/timer-engine";
import { WorldProgressCard } from "@/components/dashboard/world-progress-card";
import { Card } from "@/components/ui/card";
import type { ProgressDTO, SessionDTO, SettingsDTO, TaskDTO } from "@/lib/types";

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
  const [tasks, setTasks] = useState(initialTasks);
  const [sessions, setSessions] = useState(initialSessions);
  const [progress, setProgress] = useState(initialProgress);
  const [reflectionSessionId, setReflectionSessionId] = useState<string | null>(null);

  const completedToday = sessions.filter((session) => {
    const date = new Date(session.startedAt);
    const now = new Date();
    return (
      session.status === "COMPLETED" &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }).length;

  return (
    <>
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {[
          { label: "Today", value: `${completedToday}/${settings.dailyFocusGoal}`, icon: Clock3, color: "text-cyan" },
          { label: "Streak", value: `${progress.dailyStreak} days`, icon: Flame, color: "text-amber" },
          { label: "XP", value: progress.xp.toLocaleString(), icon: Sparkles, color: "text-mint" },
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

      <div className="dashboard-grid">
        <div className="space-y-5">
          <TimerEngine
            tasks={tasks.filter((task) => task.status === "ACTIVE")}
            settings={settings}
            onSessionSaved={(session, nextProgress) => {
              setSessions((current) => [session, ...current]);
              if (nextProgress) setProgress(nextProgress);
              if (session.status === "COMPLETED") setReflectionSessionId(session.id);
            }}
          />
          <TaskManager tasks={tasks} onTasksChange={setTasks} />
        </div>
        <div className="space-y-5">
          <WorldProgressCard progress={progress} />
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
        onClose={() => setReflectionSessionId(null)}
      />
    </>
  );
}
