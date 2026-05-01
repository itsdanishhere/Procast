"use client";

import Link from "next/link";
import { ExternalLink, Pause, Play, RotateCcw, TimerReset } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-client";
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

type ExternalOpenMode = "auto" | "manual";

export function FloatingTimer() {
  const {
    status,
    label,
    taskTitle,
    remainingSeconds,
    durationSeconds,
    backendSessionId,
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
  const lastEnterAttemptAtRef = useRef(0);
  const lastOpenedAtRef = useRef(0);
  const mainWindowFocusedRef = useRef(typeof document === "undefined" ? true : document.hasFocus());
  const externalOpenModeRef = useRef<ExternalOpenMode | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);
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
    const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, width, height, radius);
      } else {
        ctx.rect(x, y, width, height);
      }
    };

    ctx.clearRect(0, 0, 400, 280);
    ctx.fillStyle = "#08090f";
    ctx.fillRect(0, 0, 400, 280);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 400; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 280);
      ctx.stroke();
    }
    for (let i = 0; i < 280; i += 32) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(400, i);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.055)";
    drawRoundedRect(20, 20, 360, 240, 24);
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
    drawRoundedRect(45, 160, 310, 8, 4);
    ctx.fill();

    const progressWidth = 310 * (progress / 100);
    if (progressWidth > 0) {
      ctx.fillStyle = "#63b3ed";
      drawRoundedRect(45, 160, progressWidth, 8, 4);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    drawRoundedRect(270, 40, 70, 22, 11);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(latest.status.toUpperCase(), 305, 55);

    // Action row preview (matches floating timer controls)
    drawRoundedRect(45, 186, 56, 56, 28);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(66, 204);
    ctx.lineTo(66, 224);
    ctx.moveTo(80, 204);
    ctx.lineTo(80, 224);
    ctx.stroke();

    drawRoundedRect(115, 186, 56, 56, 28);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(132, 223);
    ctx.lineTo(132, 206);
    ctx.lineTo(149, 206);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(144, 211);
    ctx.lineTo(152, 203);
    ctx.stroke();

    drawRoundedRect(185, 186, 56, 56, 28);
    ctx.fillStyle = "rgba(255, 92, 92, 0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 124, 124, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "#ff7c7c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(213, 214, 11, Math.PI * 0.5, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(201, 210);
    ctx.lineTo(210, 210);
    ctx.lineTo(210, 201);
    ctx.stroke();

    drawRoundedRect(253, 186, 100, 56, 28);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.strokeStyle = "rgba(79, 126, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Return", 303, 221);
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
    canvas.height = 280;

    const stream = canvas.captureStream(30);
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.width = 400;
    video.height = 280;
    video.style.position = "fixed";
    video.style.left = "-20px";
    video.style.bottom = "0";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0.001";
    video.style.pointerEvents = "none";
    video.setAttribute("aria-hidden", "true");

    videoRef.current = video;
    canvasRef.current = canvas;
    video.addEventListener("enterpictureinpicture", () => {
      lastOpenedAtRef.current = Date.now();
      setExternalActive(true);
    });
    video.addEventListener("leavepictureinpicture", () => {
      externalOpenModeRef.current = null;
      setExternalActive(false);
    });
    document.body.appendChild(video);
    startExternalAnimation();

    try {
      await video.play();
      return true;
    } catch {
      video.remove();
      videoRef.current = null;
      canvasRef.current = null;
      return false;
    }
  }, [startExternalAnimation]);

  const exitExternalTimer = useCallback(async (force = true) => {
    if (!force && externalOpenModeRef.current === "manual") return;
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch {
        // The browser may already be exiting PiP after a focus change.
      }
    }
    externalOpenModeRef.current = null;
    setExternalActive(false);
  }, []);

  const enterExternalTimer = useCallback(async (mode: ExternalOpenMode = "manual") => {
    if (enteringExternalRef.current) return;
    if (latestRef.current.status !== "running" && latestRef.current.status !== "paused") return;
    if (!document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) {
      externalOpenModeRef.current = mode;
      setExternalActive(true);
      return;
    }
    const now = Date.now();
    if (now - lastEnterAttemptAtRef.current < 1200) return;
    lastEnterAttemptAtRef.current = now;

    enteringExternalRef.current = true;
    try {
      const ready = await ensureExternalVideo();
      if (!ready || !videoRef.current) return;
      await videoRef.current.requestPictureInPicture();
      externalOpenModeRef.current = mode;
      lastOpenedAtRef.current = Date.now();
      setExternalActive(true);
    } catch {
      externalOpenModeRef.current = null;
      setExternalActive(false);
    } finally {
      enteringExternalRef.current = false;
    }
  }, [ensureExternalVideo]);

  const syncExternalMode = useCallback(() => {
    const active = latestRef.current.status === "running" || latestRef.current.status === "paused";
    if (!active) {
      void exitExternalTimer();
      return;
    }

    if (document.visibilityState === "visible" && Date.now() - lastOpenedAtRef.current > 1600) {
      mainWindowFocusedRef.current = document.hasFocus();
    }

    const shouldUseExternal = document.visibilityState === "hidden" || !mainWindowFocusedRef.current;
    if (shouldUseExternal) {
      void enterExternalTimer("auto");
    } else {
      void exitExternalTimer(false);
    }
  }, [enterExternalTimer, exitExternalTimer]);

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
    function handleArmExternalTimer() {
      void ensureExternalVideo();
    }
    function scheduleSync(delay = 120) {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = window.setTimeout(() => {
        syncTimeoutRef.current = null;
        syncExternalMode();
      }, delay);
    }

    function handleWindowBlur() {
      mainWindowFocusedRef.current = false;
      scheduleSync();
    }

    function handleWindowFocus() {
      if (Date.now() - lastOpenedAtRef.current < 1600) {
        scheduleSync(1700);
        return;
      }
      mainWindowFocusedRef.current = true;
      scheduleSync();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        mainWindowFocusedRef.current = false;
        scheduleSync(0);
        return;
      }

      window.setTimeout(() => {
        mainWindowFocusedRef.current = document.hasFocus();
        syncExternalMode();
      }, 220);
    }

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pagehide", handleWindowBlur);
    window.addEventListener("pageshow", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(externalTimerArmEvent, handleArmExternalTimer);
    scheduleSync(180);

    return () => {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pagehide", handleWindowBlur);
      window.removeEventListener("pageshow", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(externalTimerArmEvent, handleArmExternalTimer);
    };
  }, [ensureExternalVideo, syncExternalMode]);

  useEffect(() => {
    if (status !== "running" && status !== "paused") return;
    const watchdog = window.setInterval(() => {
      syncExternalMode();
    }, 1500);
    return () => window.clearInterval(watchdog);
  }, [status, syncExternalMode]);

  useEffect(() => {
    if (status === "idle" || status === "completed") {
      void exitExternalTimer();
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      videoRef.current?.pause();
      videoRef.current?.remove();
      videoRef.current = null;
      canvasRef.current = null;
    }
    syncExternalMode();
  }, [exitExternalTimer, status, syncExternalMode]);

  async function pauseTimer() {
    if (status !== "running") return;
    if (!backendSessionId) {
      pause();
      return;
    }

    const response = await apiFetch(`/timer/sessions/${backendSessionId}/pause`, {
      method: "POST",
      body: JSON.stringify({})
    });
    if (!response.ok) {
      toast.error("Could not pause backend timer.");
      return;
    }
    pause();
  }

  async function resumeTimer() {
    if (status !== "paused") return;
    if (!backendSessionId) {
      resume();
      return;
    }

    const response = await apiFetch(`/timer/sessions/${backendSessionId}/resume`, {
      method: "POST",
      body: JSON.stringify({})
    });
    if (!response.ok) {
      toast.error("Could not resume backend timer.");
      return;
    }
    resume();
  }

  async function resetTimer() {
    if ((status === "running" || status === "paused") && backendSessionId) {
      const response = await apiFetch(`/timer/sessions/${backendSessionId}/abandon`, {
        method: "POST",
        body: JSON.stringify({
          reason: "User reset from floating timer."
        })
      });
      if (!response.ok) {
        toast.error("Could not end backend timer.");
        return;
      }
    }
    reset();
  }

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
            <Button type="button" size="icon" variant="secondary" onClick={() => void pauseTimer()} aria-label="Pause timer">
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="icon" variant="secondary" onClick={() => void resumeTimer()} aria-label="Resume timer">
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
          <Button type="button" size="icon" variant="danger" onClick={() => void resetTimer()} aria-label="Reset timer">
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
