import { TimerPageClient } from "@/components/dashboard/timer-page-client";
import { AppShell } from "@/components/layout/app-shell";
import { shellProgress, shellSettings, shellUser } from "@/lib/page-defaults";

export default function TimerPage() {
  return (
    <AppShell user={shellUser}>
      <TimerPageClient tasks={[]} settings={shellSettings} progress={shellProgress} />
    </AppShell>
  );
}
