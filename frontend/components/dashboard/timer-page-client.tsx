"use client";

import { useState } from "react";

import { ReflectionModal } from "@/components/dashboard/reflection-modal";
import { TimerEngine } from "@/components/dashboard/timer-engine";
import { WorldProgressCard } from "@/components/dashboard/world-progress-card";
import type { ProgressDTO, SettingsDTO, TaskDTO } from "@/lib/types";

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
  const [reflectionSessionId, setReflectionSessionId] = useState<string | null>(null);

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-5">
        <TimerEngine
          tasks={tasks}
          settings={settings}
          onSessionSaved={(session, nextProgress) => {
            if (nextProgress) setCurrentProgress(nextProgress);
            if (session.status === "COMPLETED") setReflectionSessionId(session.id);
          }}
        />
        <WorldProgressCard progress={currentProgress} />
      </div>
      <ReflectionModal
        sessionId={reflectionSessionId}
        open={Boolean(reflectionSessionId)}
        onClose={() => setReflectionSessionId(null)}
      />
    </>
  );
}
