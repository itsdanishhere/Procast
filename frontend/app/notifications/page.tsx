import { NotificationsClient } from "@/components/dashboard/notifications-client";
import { AppShell } from "@/components/layout/app-shell";
import { shellUser } from "@/lib/page-defaults";

export default function NotificationsPage() {
  return (
    <AppShell user={shellUser}>
      <NotificationsClient initialNotifications={[]} />
    </AppShell>
  );
}
