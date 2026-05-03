"use client";

import { useEffect, useState } from "react";

import { ReflectionModal } from "@/components/dashboard/reflection-modal";
import { TimerEngine } from "@/components/dashboard/timer-engine";
import { WorldProgressCard } from "@/components/dashboard/world-progress-card";
import { emitProgressUpdate } from "@/lib/progress-dto";
import { defaultBehavioralInsights, fetchBehavioralInsights, fetchCurrentUserSettings, fetchTasks } from "@/lib/live-data";
import { appDataRefreshEvent, timerSessionSavedEvent, type TimerSessionSavedDetail } from "@/lib/timer-events";
import type { BehavioralInsightsDTO, ProgressDTO, SettingsDTO, TaskDTO } from "@/lib/types";

export function TimerPageClient({
  tasks,
  settings,
  progress
}: {
  tasks: TaskDTO[];
  settings: SettingsDTO;
  progress: ProgressDTO;
}) {
  const [currentProgress, setCurrentProgress] = useState(progress);
  const [currentTasks, setCurrentTasks] = useState(tasks);
  const [currentSettings, setCurrentSettings] = useState(settings);
  const [behavior, setBehavior] = useState<BehavioralInsightsDTO>(defaultBehavioralInsights);
  const [reflectionSessionId, setReflectionSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTimerData() {
      const [nextTasks, userData, behaviorData] = await Promise.all([
        fetchTasks(),
        fetchCurrentUserSettings(settings),
        fetchBehavioralInsights(defaultBehavioralInsights)
      ]);
      setCurrentTasks(nextTasks);
      setCurrentSettings(userData.settings);
      setBehavior(behaviorData);
      if (userData.progress) setCurrentProgress(userData.progress);
    }

    function handleSavedSession(event: Event) {
      const { session, progress: nextProgress } = (event as CustomEvent<TimerSessionSavedDetail>).detail;
      if (nextProgress) setCurrentProgress(nextProgress);
      if (session.status === "COMPLETED") setReflectionSessionId(session.id);
    }

    function handleProgress(event: Event) {
      setCurrentProgress((event as CustomEvent<ProgressDTO>).detail);
    }

    void loadTimerData();
    window.addEventListener(timerSessionSavedEvent, handleSavedSession);
    window.addEventListener("procast:progress-updated", handleProgress);
    window.addEventListener(appDataRefreshEvent, loadTimerData);
    return () => {
      window.removeEventListener(timerSessionSavedEvent, handleSavedSession);
      window.removeEventListener("procast:progress-updated", handleProgress);
      window.removeEventListener(appDataRefreshEvent, loadTimerData);
    };
  }, [settings]);

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-5">
        <TimerEngine
          tasks={currentTasks}
          settings={currentSettings}
          behavioralInsights={behavior}
          onSessionSavedAction={(session, nextProgress) => {
            if (nextProgress) {
              setCurrentProgress(nextProgress);
              emitProgressUpdate(nextProgress);
            }
            if (session.status === "COMPLETED") setReflectionSessionId(session.id);
          }}
        />
        <WorldProgressCard progress={currentProgress} unlockedElements={behavior.unlockedElements} />
      </div>
      <ReflectionModal
        sessionId={reflectionSessionId}
        open={Boolean(reflectionSessionId)}
        onCloseAction={() => setReflectionSessionId(null)}
      />
    </>
  );
}
