"use client";

import Link from "next/link";
import { Pause, Play, RotateCcw, TimerReset } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { formatSeconds, useTimerStore } from "@/lib/timer-store";

export function FloatingTimer() {
  const {
    status,
    label,
    taskTitle,
    remainingSeconds,
    durationSeconds,
    pause,
    resume,
    reset,
    tick
  } = useTimerStore();
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragging.current) return;
      setPosition({
        x: Math.max(12, Math.min(window.innerWidth - 280, event.clientX - offset.current.x)),
        y: Math.max(12, Math.min(window.innerHeight - 170, event.clientY - offset.current.y))
      });
    }

    function onUp() {
      dragging.current = false;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  if (status === "idle") return null;

  const progress = durationSeconds ? ((durationSeconds - remainingSeconds) / durationSeconds) * 100 : 0;

  return (
    <div
      className={cn(
        "glass-strong fixed z-[80] w-[260px] rounded-2xl p-4 shadow-2xl",
        "max-sm:bottom-4 max-sm:left-4 max-sm:right-4 max-sm:top-auto max-sm:w-auto"
      )}
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="mb-3 flex cursor-grab items-center justify-between gap-3 active:cursor-grabbing"
        onPointerDown={(event) => {
          dragging.current = true;
          offset.current = {
            x: event.clientX - position.x,
            y: event.clientY - position.y
          };
        }}
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan">
          <TimerReset className="h-4 w-4" />
          Focus Live
        </div>
        <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[11px] font-bold text-muted">
          {status}
        </span>
      </div>

      <div className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-foreground">{label}</p>
          <p className="line-clamp-1 text-xs text-muted">{taskTitle || "Protect your world"}</p>
        </div>
        <div className="font-display text-2xl font-extrabold text-foreground">
          {formatSeconds(remainingSeconds)}
        </div>
      </div>

      <Progress value={progress} className="mb-3 h-1.5" />

      <div className="flex items-center gap-2">
        {status === "running" ? (
          <Button type="button" size="icon" variant="secondary" onClick={pause} aria-label="Pause timer">
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="icon" variant="secondary" onClick={resume} aria-label="Resume timer">
            <Play className="h-4 w-4" />
          </Button>
        )}
        <Button type="button" size="icon" variant="danger" onClick={reset} aria-label="Reset timer">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }), "flex-1")}>
          Return
        </Link>
      </div>
    </div>
  );
}
