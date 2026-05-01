import { SettingsClient } from "@/components/dashboard/settings-client";
import { AppShell } from "@/components/layout/app-shell";
import { shellSettings, shellUser } from "@/lib/page-defaults";

export default function SettingsPage() {
  return (
    <AppShell user={shellUser}>
      <SettingsClient
        user={{
          fullName: "ProCast User",
          email: "connected@procast.app",
          username: "connected",
          emailVerified: true
        }}
        initialSettings={shellSettings}
      />
    </AppShell>
  );
}
