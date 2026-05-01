"use client";

import Link from "next/link";
import { ExternalLink, Pause, Play, RotateCcw, TimerReset } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { externalTimerArmEvent } from "@/lib/timer-events";
import { formatSeconds, useTimerStore } from "@/lib/timer-store";

type ExternalTimerState = {
  label: string;
  taskTitle: string | null;
  remainingSeconds: number;
  durationSeconds: number;
  status: string;
};

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
  const [externalActive, setExternalActive] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const enteringExternalRef = useRef(false);
  const latestRef = useRef<ExternalTimerState>({
    label,
    taskTitle,
    remainingSeconds,
    durationSeconds,
    status
  });

  latestRef.current = {
    label,
    taskTitle,
    remainingSeconds,
    durationSeconds,
    status
  };

  useEffect(() => {
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [tick]);

  const drawExternalTimer = useCallback((ctx: CanvasRenderingContext2D) => {
    const latest = latestRef.current;
    const progress = latest.durationSeconds
      ? ((latest.durationSeconds - latest.remainingSeconds) / latest.durationSeconds) * 100
      : 0;

    ctx.clearRect(0, 0, 400, 240);
    ctx.fillStyle = "#08090f";
    ctx.fillRect(0, 0, 400, 240);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 400; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 240);
      ctx.stroke();
    }
    for (let i = 0; i < 240; i += 32) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(400, i);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.055)";
    if (ctx.roundRect) {
      ctx.roundRect(20, 20, 360, 200, 24);
    } else {
      ctx.fillRect(20, 20, 360, 200);
    }
    ctx.fill();
    ctx.strokeStyle = "rgba(99, 179, 237, 0.26)";
    ctx.stroke();

    ctx.fillStyle = "#63b3ed";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("FOCUS LIVE", 45, 55);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(latest.label || "Focus", 45, 95);

    ctx.fillStyle = "rgba(255,255,255,0.58)";
    ctx.font = "14px sans-serif";
    ctx.fillText(latest.taskTitle || "Protect your world", 45, 125);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px tabular-nums sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(formatSeconds(latest.remainingSeconds), 355, 125);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    if (ctx.roundRect) {
      ctx.roundRect(45, 160, 310, 8, 4);
    } else {
      ctx.fillRect(45, 160, 310, 8);
    }
    ctx.fill();

    const progressWidth = 310 * (progress / 100);
    if (progressWidth > 0) {
      ctx.fillStyle = "#76e4a7";
      if (ctx.roundRect) {
        ctx.roundRect(45, 160, progressWidth, 8, 4);
      } else {
        ctx.fillRect(45, 160, progressWidth, 8);
      }
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    if (ctx.roundRect) {
      ctx.roundRect(270, 40, 70, 22, 11);
    } else {
      ctx.fillRect(270, 40, 70, 22);
    }
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(latest.status.toUpperCase(), 305, 55);
  }, []);

  const startExternalAnimation = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const render = () => {
      drawExternalTimer(ctx);
      animationRef.current = window.requestAnimationFrame(render);
    };

    if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    render();
  }, [drawExternalTimer]);

  const ensureExternalVideo = useCallback(async () => {
    if (videoRef.current && canvasRef.current) return true;

    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 240;

    const stream = canvas.captureStream(30);
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.width = 400;
    video.height = 240;

    videoRef.current = video;
    canvasRef.current = canvas;
    video.addEventListener("enterpictureinpicture", () => setExternalActive(true));
    video.addEventListener("leavepictureinpicture", () => setExternalActive(false));
    startExternalAnimation();

    try {
      await video.play();
      return true;
    } catch {
      videoRef.current = null;
      canvasRef.current = null;
      return false;
    }
  }, [startExternalAnimation]);

  const exitExternalTimer = useCallback(async () => {
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch {
        // The browser may already be exiting PiP after a focus change.
      }
    }
    setExternalActive(false);
  }, []);

  const enterExternalTimer = useCallback(async () => {
    if (enteringExternalRef.current) return;
    if (latestRef.current.status !== "running" && latestRef.current.status !== "paused") return;
    if (!document.pictureInPictureEnabled || document.pictureInPictureElement) return;

    enteringExternalRef.current = true;
    try {
      const ready = await ensureExternalVideo();
      if (!ready || !videoRef.current) return;
      await videoRef.current.requestPictureInPicture();
      setExternalActive(true);
    } catch {
      setExternalActive(false);
    } finally {
      enteringExternalRef.current = false;
    }
  }, [ensureExternalVideo]);

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

  useEffect(() => {
    function handleExternalMode() {
      void enterExternalTimer();
    }

    function handleInternalMode() {
      void exitExternalTimer();
    }

    function handleArmExternalTimer() {
      void ensureExternalVideo();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        handleExternalMode();
      } else {
        handleInternalMode();
      }
    }

    window.addEventListener("blur", handleExternalMode);
    window.addEventListener("focus", handleInternalMode);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(externalTimerArmEvent, handleArmExternalTimer);
    return () => {
      window.removeEventListener("blur", handleExternalMode);
      window.removeEventListener("focus", handleInternalMode);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(externalTimerArmEvent, handleArmExternalTimer);
    };
  }, [enterExternalTimer, ensureExternalVideo, exitExternalTimer]);

  useEffect(() => {
    if (status === "idle" || status === "completed") {
      void exitExternalTimer();
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      videoRef.current?.pause();
      videoRef.current = null;
      canvasRef.current = null;
    }
  }, [exitExternalTimer, status]);

  if (status === "idle" || status === "completed") {
    return null;
  }

  const progress = durationSeconds ? ((durationSeconds - remainingSeconds) / durationSeconds) * 100 : 0;

  return (
    <div
      className={cn(
        "glass-strong fixed z-[80] w-[260px] rounded-2xl p-4 shadow-2xl",
        "max-sm:bottom-4 max-sm:left-4 max-sm:right-4 max-sm:top-auto max-sm:w-auto"
      )}
      style={{ left: position.x, top: position.y }}
      id="timer-container"
    >
      <div id="floating-timer-content" className="w-full">
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
          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
            {typeof status === "string" ? status : JSON.stringify(status)}
          </span>
        </div>

        <div className="mb-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">
              {typeof label === "string" ? label : JSON.stringify(label)}
            </p>
            <p className="line-clamp-1 text-xs text-muted">
              {typeof taskTitle === "string" ? taskTitle : taskTitle ? JSON.stringify(taskTitle) : "Protect your world"}
            </p>
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
          <Button
            id="pip-toggle-btn"
            type="button"
            size="icon"
            variant={externalActive ? "primary" : "secondary"}
            onClick={() => (externalActive ? void exitExternalTimer() : void enterExternalTimer())}
            aria-label="Always on top"
            title="External timer"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="danger" onClick={reset} aria-label="Reset timer">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Link
            id="return-btn"
            href="/dashboard"
            className={cn(buttonVariants({ size: "sm" }), "flex-1")}
          >
            Return
          </Link>
        </div>
      </div>
    </div>
  );
}
