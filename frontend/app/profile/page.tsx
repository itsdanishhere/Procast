import { ProfileClient } from "@/components/dashboard/profile-client";
import { AppShell } from "@/components/layout/app-shell";
import { shellUser } from "@/lib/page-defaults";

export default function ProfilePage() {
  return (
    <AppShell user={shellUser}>
      <ProfileClient />
    </AppShell>
  );
}
