import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { AppShell } from "@/components/layout/app-shell";
import type { ProgressDTO, SettingsDTO } from "@/lib/types";

const progress: ProgressDTO = {
  xp: 0,
  level: 1,
  unlockedStage: 1,
  lockedStage: 1,
  dailyStreak: 0,
  bestStreak: 0,
  lockStrikes: 0,
  weeklySessions: 0,
  lastFocusDate: null
};

const settings: SettingsDTO = {
  dailyFocusGoal: 3,
  deepFocusMinutes: 45,
  remindersEnabled: true,
  focusSoundsEnabled: true,
  lockBackEnabled: true,
  notificationHour: 19,
  preferredAmbientSound: "rain"
};

export default function DashboardPage() {
  return (
    <AppShell user={{ fullName: "ProCast User", username: "connected", progress }}>
      <DashboardClient initialTasks={[]} initialSessions={[]} initialProgress={progress} settings={settings} />
    </AppShell>
  );
}
