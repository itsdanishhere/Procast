"use client";

import Link from "next/link";
import { ExternalLink, Home, Pause, Play, RotateCcw, TimerReset } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import {
  emitFocusMusicCommand,
  focusMusicStateEvent,
  type FocusMusicStateDetail
} from "@/lib/music-events";
import { externalTimerArmEvent } from "@/lib/timer-events";
import { formatSeconds, useTimerStore } from "@/lib/timer-store";

type ExternalTimerState = {
  mode: string;
  label: string;
  taskTitle: string | null;
  remainingSeconds: number;
  durationSeconds: number;
  status: string;
};

type ExternalOpenMode = "auto" | "manual";
type ExternalRenderMode = "document" | "video";

type DocumentPiPBindings = {
  window: Window;
  cleanup: () => void;
};

export function FloatingTimer() {
  const {
    status,
    mode,
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
  const externalRenderModeRef = useRef<ExternalRenderMode | null>(null);
  const documentPiPRef = useRef<DocumentPiPBindings | null>(null);
  const [focusMusic, setFocusMusic] = useState<FocusMusicStateDetail>({
    available: false,
    playing: false,
    trackId: null,
    title: null
  });
  const focusMusicRef = useRef<FocusMusicStateDetail>(focusMusic);
  const syncTimeoutRef = useRef<number | null>(null);
  const latestRef = useRef<ExternalTimerState>({
    mode,
    label,
    taskTitle,
    remainingSeconds,
    durationSeconds,
    status
  });

  latestRef.current = {
    mode,
    label,
    taskTitle,
    remainingSeconds,
    durationSeconds,
    status
  };
  focusMusicRef.current = focusMusic;

  useEffect(() => {
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [tick]);

  const drawExternalTimer = useCallback((ctx: CanvasRenderingContext2D) => {
    const latest = latestRef.current;
    const music = focusMusicRef.current;
    const progress = latest.mode === "STOPWATCH"
      ? ((latest.remainingSeconds % 60) / 60) * 100
      : latest.durationSeconds
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

    drawRoundedRect(255, 186, 56, 56, 28);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.strokeStyle = "rgba(79, 126, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("♪", 283, 224);
    if (!music.playing) {
      ctx.strokeStyle = "#ff5c5c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(269, 229);
      ctx.lineTo(297, 201);
      ctx.stroke();
    }
  }, []);

  const renderDocumentTimer = useCallback(() => {
    const pip = documentPiPRef.current;
    if (!pip) return;
    const latest = latestRef.current;
    const doc = pip.window.document;
    const progress = latest.mode === "STOPWATCH"
      ? ((latest.remainingSeconds % 60) / 60) * 100
      : latest.durationSeconds
      ? ((latest.durationSeconds - latest.remainingSeconds) / latest.durationSeconds) * 100
      : 0;

    const statusEl = doc.getElementById("procast-pip-status");
    const labelEl = doc.getElementById("procast-pip-label");
    const taskEl = doc.getElementById("procast-pip-task");
    const timeEl = doc.getElementById("procast-pip-time");
    const progressEl = doc.getElementById("procast-pip-progress");
    const actionEl = doc.getElementById("procast-pip-action");
    const musicEl = doc.getElementById("procast-pip-music");
    const music = focusMusicRef.current;

    if (statusEl) statusEl.textContent = latest.status.toUpperCase();
    if (labelEl) labelEl.textContent = latest.label || "Focus";
    if (taskEl) taskEl.textContent = latest.taskTitle || "Protect your world";
    if (timeEl) timeEl.textContent = formatSeconds(latest.remainingSeconds);
    if (progressEl) (progressEl as HTMLElement).style.width = `${Math.max(0, Math.min(100, progress))}%`;
    if (actionEl) actionEl.textContent = latest.status === "running" ? "⏸" : "▶";
    if (musicEl) {
      musicEl.textContent = "♪";
      musicEl.setAttribute("data-muted", music.playing ? "false" : "true");
      musicEl.setAttribute("title", music.available ? (music.playing ? "Pause focus music" : "Resume focus music") : "Start music in ProCast first");
    }
  }, []);

  const toggleFocusMusic = useCallback(() => {
    if (!focusMusicRef.current.available) {
      toast.error("Start a track in the ProCast music player first.");
      return;
    }
    emitFocusMusicCommand({ action: "toggle" });
  }, []);

  const closeDocumentPiP = useCallback(() => {
    const pip = documentPiPRef.current;
    if (!pip) return;
    try {
      pip.cleanup();
      if (!pip.window.closed) pip.window.close();
    } catch {
      // Ignore close errors when browser is already tearing down the window.
    } finally {
      documentPiPRef.current = null;
    }
  }, []);

  const openDocumentPiP = useCallback(async () => {
    const docPiP = (window as any).documentPictureInPicture;
    if (!docPiP || typeof docPiP.requestWindow !== "function") return false;
    if (documentPiPRef.current?.window && !documentPiPRef.current.window.closed) {
      externalRenderModeRef.current = "document";
      setExternalActive(true);
      renderDocumentTimer();
      return true;
    }

    try {
      const pipWindow = await docPiP.requestWindow({
        width: 400,
        height: 280,
        preferInitialWindowPlacement: true
      });
      const doc = pipWindow.document;
      doc.head.innerHTML = `
        <style>
          :root { color-scheme: dark; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 16px;
            font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            background: #08090f;
            color: #eef2f7;
          }
          .card {
            width: 100%;
            height: 100%;
            border-radius: 22px;
            border: 1px solid rgba(99,179,237,0.35);
            background:
              linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
              radial-gradient(120% 120% at 100% 100%, rgba(37,99,235,0.18), rgba(8,9,15,0));
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .top { display: flex; align-items: center; justify-content: space-between; }
          .eyebrow { font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #63b3ed; }
          .status { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.75); }
          .row { display: flex; align-items: end; justify-content: space-between; gap: 12px; }
          .label { font-size: 40px; font-weight: 900; line-height: 1; letter-spacing: 0; font-variant-numeric: tabular-nums; }
          .title { font-size: 42px; font-weight: 900; margin: 0; line-height: 1.05; }
          .task { margin-top: 6px; font-size: 14px; color: rgba(255,255,255,.62); }
          .progress-track { width: 100%; height: 8px; border-radius: 999px; background: rgba(255,255,255,.12); overflow: hidden; }
          .progress-fill { height: 100%; width: 0%; border-radius: inherit; background: linear-gradient(90deg, #2b6cf0, #76e4a7); transition: width .2s linear; }
          .actions {
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }
          button {
            border: 1px solid rgba(255,255,255,.16);
            background: rgba(255,255,255,.06);
            color: #eef2f7;
            border-radius: 999px;
            height: 56px;
            width: 56px;
            min-width: 56px;
            font-weight: 700;
            cursor: pointer;
            transition: transform .14s ease, background .14s ease, border-color .14s ease, box-shadow .14s ease;
          }
          button:hover {
            transform: translateY(-1px) scale(1.03);
            background: rgba(255,255,255,.15);
            border-color: rgba(255,255,255,.28);
            box-shadow: 0 8px 20px rgba(0,0,0,.35);
          }
          button:active { transform: scale(.98); }
          .icon-btn {
            font-size: 31px;
            font-weight: 900;
            line-height: 1;
            letter-spacing: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          #procast-pip-action {
            letter-spacing: 0.02em;
            font-size: 30px;
          }
          .danger { border-color: rgba(255,124,124,.38); color: #ff7c7c; background: rgba(255,124,124,.13); }
          .danger:hover { border-color: rgba(255,124,124,.65); background: rgba(255,124,124,.2); }
          .music {
            background: #2563eb;
            border-color: rgba(79,126,255,.65);
            color: #fff;
            box-shadow: 0 10px 26px rgba(37,99,235,.35);
            position: relative;
            overflow: hidden;
          }
          .music[data-muted="true"]::after {
            content: "";
            position: absolute;
            width: 38px;
            height: 3px;
            background: #ff5c5c;
            border-radius: 999px;
            transform: rotate(-36deg);
            transform-origin: center;
            pointer-events: none;
          }
        </style>
      `;
      doc.body.innerHTML = `
        <div class="card">
          <div class="top">
            <div class="eyebrow">FOCUS LIVE</div>
            <div id="procast-pip-status" class="status">RUNNING</div>
          </div>
          <div class="row">
            <div>
              <p id="procast-pip-label" class="title">Focus</p>
              <p id="procast-pip-task" class="task">Protect your world</p>
            </div>
            <div id="procast-pip-time" class="label">00:00</div>
          </div>
          <div class="progress-track"><div id="procast-pip-progress" class="progress-fill"></div></div>
          <div class="actions">
            <button id="procast-pip-action" class="icon-btn" aria-label="Pause or resume timer">⏸</button>
            <button id="procast-pip-external" class="icon-btn" aria-label="Go to ProCast dashboard">↗</button>
            <button id="procast-pip-reset" class="icon-btn danger" aria-label="End timer">×</button>
            <button id="procast-pip-music" class="music icon-btn" aria-label="Toggle focus music">♪</button>
          </div>
        </div>
      `;

      const actionButton = doc.getElementById("procast-pip-action") as HTMLButtonElement | null;
      const externalButton = doc.getElementById("procast-pip-external") as HTMLButtonElement | null;
      const resetButton = doc.getElementById("procast-pip-reset") as HTMLButtonElement | null;
      const musicButton = doc.getElementById("procast-pip-music") as HTMLButtonElement | null;

      const onAction = async () => {
        const currentSessionId = backendSessionId;
        if (latestRef.current.status === "running") {
          if (!currentSessionId) {
            pause();
            return;
          }
          const response = await apiFetch(`/timer/sessions/${currentSessionId}/pause`, {
            method: "POST",
            body: JSON.stringify({})
          });
          if (!response.ok) {
            toast.error("Could not pause backend timer.");
            return;
          }
          pause();
          emitFocusMusicCommand({ action: "pause" });
          return;
        }

        if (!currentSessionId) {
          resume();
          emitFocusMusicCommand({ action: "resume" });
          return;
        }
        const response = await apiFetch(`/timer/sessions/${currentSessionId}/resume`, {
          method: "POST",
          body: JSON.stringify({})
        });
        if (!response.ok) {
          toast.error("Could not resume backend timer.");
          return;
        }
        resume();
        emitFocusMusicCommand({ action: "resume" });
      };
      const onReset = async () => {
        const currentSessionId = backendSessionId;
        if ((latestRef.current.status === "running" || latestRef.current.status === "paused") && currentSessionId) {
          const response = await apiFetch(`/timer/sessions/${currentSessionId}/abandon`, {
            method: "POST",
            body: JSON.stringify({
              reason: "User reset from external timer."
            })
          });
          if (!response.ok) {
            toast.error("Could not end backend timer.");
            return;
          }
        }
        emitFocusMusicCommand({ action: "stop" });
        reset();
      };
      const goDashboard = () => {
        try {
          if (window.location.pathname !== "/dashboard") {
            window.location.href = "/dashboard";
          }
          window.focus();
        } catch {
          // Ignore focus errors.
        }
      };
      const onExternal = () => goDashboard();
      const onMusic = () => toggleFocusMusic();
      actionButton?.addEventListener("click", onAction);
      resetButton?.addEventListener("click", onReset);
      musicButton?.addEventListener("click", onMusic);
      externalButton?.addEventListener("click", onExternal);

      const onPageHide = () => {
        externalOpenModeRef.current = null;
        externalRenderModeRef.current = null;
        documentPiPRef.current = null;
        setExternalActive(false);
      };
      pipWindow.addEventListener("pagehide", onPageHide);
      documentPiPRef.current = {
        window: pipWindow,
        cleanup: () => {
          actionButton?.removeEventListener("click", onAction);
          resetButton?.removeEventListener("click", onReset);
          musicButton?.removeEventListener("click", onMusic);
          externalButton?.removeEventListener("click", onExternal);
          pipWindow.removeEventListener("pagehide", onPageHide);
        }
      };

      externalRenderModeRef.current = "document";
      setExternalActive(true);
      renderDocumentTimer();
      return true;
    } catch {
      return false;
    }
  }, [backendSessionId, pause, renderDocumentTimer, reset, resume, toggleFocusMusic]);

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
    closeDocumentPiP();
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch {
        // The browser may already be exiting PiP after a focus change.
      }
    }
    externalRenderModeRef.current = null;
    externalOpenModeRef.current = null;
    setExternalActive(false);
  }, [closeDocumentPiP]);

  const enterExternalTimer = useCallback(async (mode: ExternalOpenMode = "manual") => {
    if (enteringExternalRef.current) return;
    if (latestRef.current.status !== "running" && latestRef.current.status !== "paused") return;
    if (documentPiPRef.current?.window && !documentPiPRef.current.window.closed) {
      externalRenderModeRef.current = "document";
      externalOpenModeRef.current = mode;
      setExternalActive(true);
      renderDocumentTimer();
      return;
    }
    if (document.pictureInPictureElement) {
      externalRenderModeRef.current = "video";
      externalOpenModeRef.current = mode;
      setExternalActive(true);
      return;
    }
    const now = Date.now();
    if (now - lastEnterAttemptAtRef.current < 1200) return;
    lastEnterAttemptAtRef.current = now;

    enteringExternalRef.current = true;
    try {
      const documentOpened = await openDocumentPiP();
      if (documentOpened) {
        externalRenderModeRef.current = "document";
        externalOpenModeRef.current = mode;
        lastOpenedAtRef.current = Date.now();
        setExternalActive(true);
        return;
      }

      if (!document.pictureInPictureEnabled) return;
      const ready = await ensureExternalVideo();
      if (!ready || !videoRef.current) return;
      await videoRef.current.requestPictureInPicture();
      externalRenderModeRef.current = "video";
      externalOpenModeRef.current = mode;
      lastOpenedAtRef.current = Date.now();
      setExternalActive(true);
    } catch {
      externalRenderModeRef.current = null;
      externalOpenModeRef.current = null;
      setExternalActive(false);
    } finally {
      enteringExternalRef.current = false;
    }
  }, [ensureExternalVideo, openDocumentPiP, renderDocumentTimer]);

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
    function handleFocusMusicState(event: Event) {
      const nextMusic = (event as CustomEvent<FocusMusicStateDetail>).detail;
      focusMusicRef.current = nextMusic;
      setFocusMusic(nextMusic);
      renderDocumentTimer();
    }

    window.addEventListener(focusMusicStateEvent, handleFocusMusicState);
    return () => window.removeEventListener(focusMusicStateEvent, handleFocusMusicState);
  }, [renderDocumentTimer]);

  useEffect(() => {
    if (status !== "running" && status !== "paused") return;
    renderDocumentTimer();
    const watchdog = window.setInterval(() => {
      syncExternalMode();
      renderDocumentTimer();
    }, 1500);
    return () => window.clearInterval(watchdog);
  }, [renderDocumentTimer, status, syncExternalMode]);

  useEffect(() => {
    if (status === "idle" || status === "completed") {
      void exitExternalTimer();
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      videoRef.current?.pause();
      videoRef.current?.remove();
      videoRef.current = null;
      canvasRef.current = null;
      closeDocumentPiP();
    }
    syncExternalMode();
  }, [closeDocumentPiP, exitExternalTimer, status, syncExternalMode]);

  useEffect(() => {
    return () => {
      closeDocumentPiP();
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    };
  }, [closeDocumentPiP]);

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
    emitFocusMusicCommand({ action: "stop" });
    reset();
  }

  if (status === "idle" || status === "completed") {
    return null;
  }

  const progress = mode === "STOPWATCH" ? ((remainingSeconds % 60) / 60) * 100 : durationSeconds ? ((durationSeconds - remainingSeconds) / durationSeconds) * 100 : 0;

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

        <div className="flex items-center justify-center gap-2">
          {status === "running" ? (
            <Button type="button" size="icon" variant="secondary" onClick={() => { pauseTimer(); emitFocusMusicCommand({ action: "pause" }); }} aria-label="Pause timer">
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="icon" variant="secondary" onClick={() => { resumeTimer(); emitFocusMusicCommand({ action: "resume" }); }} aria-label="Resume timer">
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
            className={cn(buttonVariants({ size: "icon" }), "h-10 w-10 shrink-0")}
            aria-label="Go to dashboard"
            title="Go to dashboard"
          >
            <Home className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
