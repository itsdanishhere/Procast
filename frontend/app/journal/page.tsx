import { JournalClient } from "@/components/dashboard/journal-client";
import { AppShell } from "@/components/layout/app-shell";
import { shellUser } from "@/lib/page-defaults";

export default function JournalPage() {
  return (
    <AppShell user={shellUser}>
      <JournalClient initialReflections={[]} />
    </AppShell>
  );
}
