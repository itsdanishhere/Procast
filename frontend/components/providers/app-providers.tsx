"use client";

import { Toaster } from "sonner";

import { FloatingTimer } from "@/components/dashboard/floating-timer";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
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
