import { AnalyticsClient } from "@/components/dashboard/analytics-client";
import { AppShell } from "@/components/layout/app-shell";
import { shellUser } from "@/lib/page-defaults";

export default function AnalyticsPage() {
  return (
    <AppShell user={shellUser}>
      <AnalyticsClient />
    </AppShell>
  );
}
