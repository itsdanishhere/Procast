"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";

import { FloatingTimer } from "@/components/dashboard/floating-timer";
import { TimerCompletionSync } from "@/components/providers/timer-completion-sync";
import { appDataRefreshEvent, appDataRefreshStorageKey, type AppDataRefreshDetail } from "@/lib/timer-events";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== appDataRefreshStorageKey || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as AppDataRefreshDetail;
        window.dispatchEvent(new CustomEvent<AppDataRefreshDetail>(appDataRefreshEvent, { detail: parsed }));
      } catch {
        window.dispatchEvent(new CustomEvent<AppDataRefreshDetail>(appDataRefreshEvent, { detail: { reason: "storage-refresh" } }));
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <>
      {children}
      <TimerCompletionSync />
      <FloatingTimer />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(14, 16, 26, 0.94)",
            color: "#eef2f7",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(18px)"
          }
        }}
      />
    </>
  );
}
