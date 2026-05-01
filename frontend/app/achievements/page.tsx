import { AchievementsPageClient } from "@/components/dashboard/achievements-page-client";
import { AppShell } from "@/components/layout/app-shell";
import { shellUser } from "@/lib/page-defaults";

export default function AchievementsPage() {
  return (
    <AppShell user={shellUser}>
      <AchievementsPageClient awards={[]} />
    </AppShell>
  );
}
