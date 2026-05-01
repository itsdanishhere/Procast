import { ProgressMapPage } from "@/components/dashboard/progress-map-page";
import { AppShell } from "@/components/layout/app-shell";
import type { ProgressDTO } from "@/lib/types";

const progress: ProgressDTO = {
  totalXp: 0,
  currentLevel: 1,
  unlockedStage: 1,
  lockedStage: 1,
  dailyStreak: 0,
  bestStreak: 0,
  lockStrikes: 0,
  weeklySessions: 0,
  lastFocusDate: null
};

export default function ProgressPage() {
  return (
    <AppShell user={{ fullName: "ProCast User", username: "connected", progress }}>
      <ProgressMapPage progress={progress} />
    </AppShell>
  );
}
