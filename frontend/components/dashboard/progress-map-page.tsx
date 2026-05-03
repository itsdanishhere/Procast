"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, ChevronLeft, ChevronRight, Circle, Lock, Minus, Plus, ShieldCheck, Sparkles, Target, Trophy, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StageScene } from "@/components/dashboard/stage-scene";
import { getLevelForXp, getNextStage, getStageProgressPercent, getXpToNextLevel } from "@/lib/progression";
import { worldStages } from "@/lib/constants";
import type { BehavioralInsightsDTO, ProgressDTO } from "@/lib/types";
import { cn } from "@/lib/cn";
import { defaultBehavioralInsights, fetchBehavioralInsights, fetchCurrentUserProgress } from "@/lib/live-data";
import { appDataRefreshEvent } from "@/lib/timer-events";

const substageProgressMarks = [25, 50, 75, 100] as const;
const stagesPerPage = 10;
const standardFocusSessionXp = 25;
const modalSpring = { type: "spring", stiffness: 260, damping: 24 } as const;

export function ProgressMapPage({ progress }: { progress: ProgressDTO }) {
  const router = useRouter();
  const [currentProgress, setCurrentProgress] = useState(progress);
  const [behavior, setBehavior] = useState<BehavioralInsightsDTO>(defaultBehavioralInsights);
  const [selectedStageLevel, setSelectedStageLevel] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<"overview" | "elements" | "intel">("overview");
  const [selectedElementIndex, setSelectedElementIndex] = useState(0);
  const [selectedElementMode, setSelectedElementMode] = useState<"track" | "stabilize" | "push">("track");
  const [xpPreviewGain, setXpPreviewGain] = useState(standardFocusSessionXp);
  const totalXp = currentProgress.totalXp ?? 0;
  const currentLevel = getLevelForXp(totalXp);
  const next = getNextStage(totalXp);
  const percent = getStageProgressPercent(totalXp);
  const stagePages = useMemo(
    () =>
      Array.from({ length: Math.ceil(worldStages.length / stagesPerPage) }, (_, pageIndex) =>
        worldStages.slice(pageIndex * stagesPerPage, pageIndex * stagesPerPage + stagesPerPage)
      ),
    []
  );
  const [currentPage, setCurrentPage] = useState(() => Math.floor((Math.max(1, Math.min(currentLevel, worldStages.length)) - 1) / stagesPerPage));
  const visibleLevelStart = currentPage * stagesPerPage + 1;
  const visibleLevelEnd = Math.min(worldStages.length, visibleLevelStart + stagesPerPage - 1);
  const stageTier = (level: number) => {
    if (level >= 46) return "Mythic";
    if (level >= 36) return "Legendary";
    if (level >= 26) return "Epic";
    if (level >= 16) return "Rare";
    if (level >= 6) return "Uncommon";
    return "Common";
  };
  const selectedStage = useMemo(() => {
    if (selectedStageLevel === null) return null;
    const stage = worldStages.find((item) => item.level === selectedStageLevel);
    if (!stage) return null;
    const globalIndex = stage.level - 1;
    const nextThreshold = worldStages[globalIndex + 1]?.threshold ?? stage.threshold;
    const unlocked = stage.level <= currentProgress.unlockedStage;
    const protectedStage = stage.level <= currentProgress.lockedStage;
    const current = stage.level === currentLevel;
    const completionRatio = stageCompletionRatio(stage.threshold, nextThreshold);
    const elementUnlockCount = unlockedSubElementCount(stage.threshold, nextThreshold, protectedStage);
    const stageGoal = Math.max(0, nextThreshold - stage.threshold);
    const xpLeftToCompleteStage = current && nextThreshold > stage.threshold ? Math.max(0, nextThreshold - totalXp) : stage.level < currentLevel ? 0 : null;
    const unlockGapXp = stage.level > currentLevel ? Math.max(0, stage.threshold - totalXp) : 0;
    const progressWithinMap = Math.round((stage.level / worldStages.length) * 100);
    const estimatedSessionsToComplete =
      (xpLeftToCompleteStage ?? Math.max(0, nextThreshold - totalXp)) > 0
        ? Math.ceil((xpLeftToCompleteStage ?? Math.max(0, nextThreshold - totalXp)) / standardFocusSessionXp)
        : 0;
    return {
      stage,
      nextThreshold,
      unlocked,
      protectedStage,
      current,
      completionPercent: Math.round(completionRatio * 100),
      elementUnlockCount,
      stageGoal,
      xpLeftToCompleteStage,
      unlockGapXp,
      progressWithinMap,
      estimatedSessionsToComplete
    };
  }, [selectedStageLevel, currentProgress.lockedStage, currentProgress.unlockedStage, currentLevel, totalXp]);

  const selectedElement =
    selectedStage?.stage.subElements[Math.max(0, Math.min(selectedElementIndex, selectedStage.stage.subElements.length - 1))] ?? null;
  const projectedCompletionPercent = selectedStage
    ? Math.round(
        stageCompletionRatio(
          selectedStage.stage.threshold,
          selectedStage.nextThreshold
        ) *
          100
      )
    : 0;
  const simulatedCompletionPercent = selectedStage
    ? Math.round(
        (() => {
          const simulatedXp = totalXp + xpPreviewGain;
          if (simulatedXp < selectedStage.stage.threshold) return 0;
          if (simulatedXp >= selectedStage.nextThreshold) return 1;
          const span = Math.max(1, selectedStage.nextThreshold - selectedStage.stage.threshold);
          return Math.max(0, Math.min(1, (simulatedXp - selectedStage.stage.threshold) / span));
        })() * 100
      )
    : 0;

  function moveSelectedStage(delta: -1 | 1) {
    setSelectedStageLevel((current) => {
      if (current === null) return current;
      const nextLevel = Math.max(1, Math.min(worldStages.length, current + delta));
      return nextLevel;
    });
    setSelectedElementIndex(0);
  }

  function stageCompletionRatio(threshold: number, nextThreshold: number) {
    if (totalXp < threshold) return 0;
    if (totalXp >= nextThreshold) return 1;
    const span = Math.max(1, nextThreshold - threshold);
    return Math.max(0, Math.min(1, (totalXp - threshold) / span));
  }

  function unlockedSubElementCount(threshold: number, nextThreshold: number, protectedStage: boolean) {
    if (!protectedStage) return 0;
    return Math.max(0, Math.min(substageProgressMarks.length, Math.floor(stageCompletionRatio(threshold, nextThreshold) * substageProgressMarks.length + 1e-9)));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      const [latest, latestBehavior] = await Promise.all([
        fetchCurrentUserProgress(progress),
        fetchBehavioralInsights(defaultBehavioralInsights)
      ]);
      if (!cancelled && latest) setCurrentProgress(latest);
      if (!cancelled) setBehavior(latestBehavior);
    }

    function handleProgress(event: Event) {
      setCurrentProgress((event as CustomEvent<ProgressDTO>).detail);
    }

    void loadProgress();
    window.addEventListener("procast:progress-updated", handleProgress);
    window.addEventListener(appDataRefreshEvent, loadProgress);
    return () => {
      cancelled = true;
      window.removeEventListener("procast:progress-updated", handleProgress);
      window.removeEventListener(appDataRefreshEvent, loadProgress);
    };
  }, [progress]);

  useEffect(() => {
    if (!selectedStage) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedStageLevel(null);
        return;
      }
      if (event.key === "ArrowLeft") {
        moveSelectedStage(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        moveSelectedStage(1);
        return;
      }
      if (event.key >= "1" && event.key <= "4") {
        setSelectedElementIndex(Math.min(3, Number(event.key) - 1));
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedStage]);

  useEffect(() => {
    setSelectedElementIndex(0);
    setSelectedElementMode("track");
    setXpPreviewGain(standardFocusSessionXp);
  }, [selectedStageLevel]);

  return (
    <div className="space-y-6">
      <Card className="glass-strong overflow-hidden p-0">
        <div className="border-b border-white/10 p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">Signature progression map</p>
              <h2 className="mt-3 font-display text-4xl font-extrabold">Build and protect your discipline world.</h2>
              <p className="mt-3 max-w-2xl text-muted">
                Completed focus sessions unlock new stages. Break discipline long enough and earlier unlocks can lock again.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/15 bg-white/[0.06] text-muted">
                Levels {visibleLevelStart}-{visibleLevelEnd} of {worldStages.length}
              </Badge>
              <Badge className="border-cyan/25 bg-cyan/10 text-cyan">
                <Sparkles className="h-3.5 w-3.5" />
                {getXpToNextLevel(totalXp)} XP to {next.name}
              </Badge>
            </div>
          </div>
        </div>

        <div className="world-grid relative overflow-hidden">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
            className={cn(
              "absolute left-4 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#101624]/85 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_18px_40px_rgba(0,0,0,0.34)] backdrop-blur transition hover:border-cyan/40 hover:bg-cyan/15",
              currentPage === 0 && "pointer-events-none opacity-25"
            )}
            aria-label="Previous progress page"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            type="button"
            disabled={currentPage === stagePages.length - 1}
            onClick={() => setCurrentPage((page) => Math.min(stagePages.length - 1, page + 1))}
            className={cn(
              "absolute right-4 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#101624]/85 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_18px_40px_rgba(0,0,0,0.34)] backdrop-blur transition hover:border-cyan/40 hover:bg-cyan/15",
              currentPage === stagePages.length - 1 && "pointer-events-none opacity-25"
            )}
            aria-label="Next progress page"
          >
            <ChevronRight className="h-7 w-7" />
          </button>

          <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentPage * 100}%)` }}>
            {stagePages.map((pageStages, pageIndex) => (
              <div key={`stage-page-${pageIndex}`} className="w-full shrink-0 p-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {pageStages.map((stage, index) => {
                    const globalIndex = pageIndex * stagesPerPage + index;
                    const unlocked = stage.level <= currentProgress.unlockedStage;
                    const protectedStage = stage.level <= currentProgress.lockedStage;
                    const current = stage.level === currentLevel;
                    const nextThreshold = worldStages[globalIndex + 1]?.threshold ?? stage.threshold;
                    const elementUnlockCount = unlockedSubElementCount(stage.threshold, nextThreshold, protectedStage);
                    const stageCompletion = Math.round(stageCompletionRatio(stage.threshold, nextThreshold) * 100);
                    const stageGoal = Math.max(0, nextThreshold - stage.threshold);
                    const xpLeftToCompleteStage =
                      current && nextThreshold > stage.threshold ? Math.max(0, nextThreshold - totalXp) : stage.level < currentLevel ? 0 : null;
                    return (
                      <button
                        type="button"
                        key={stage.level}
                        onClick={() => {
                          setSelectedStageLevel(stage.level);
                          setModalTab("overview");
                        }}
                        className={cn(
                          "min-h-[26rem] rounded-[24px] border p-5 text-left transition duration-300 hover:-translate-y-0.5 hover:border-cyan/45 hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60",
                          unlocked && protectedStage && "border-mint/30 bg-mint/10",
                          unlocked && !protectedStage && "border-danger/30 bg-danger/10",
                          !unlocked && "border-white/10 bg-white/[0.04]",
                          current && "scale-[1.02] border-cyan/50 bg-cyan/12 shadow-[0_0_36px_rgba(99,179,237,0.18)]"
                        )}
                        aria-label={`Open ${stage.name} stage details`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">Level {stage.level}</p>
                            <h3 className="mt-2 font-display text-2xl font-extrabold">{stage.name}</h3>
                          </div>
                          {unlocked ? (
                            protectedStage ? (
                              <ShieldCheck className="h-6 w-6 text-mint" />
                            ) : (
                              <Lock className="h-6 w-6 text-danger" />
                            )
                          ) : (
                            <Lock className="h-6 w-6 text-white/20" />
                          )}
                        </div>
                        <StageScene stageCode={stage.code} accent={stage.accent} className="my-7 h-24" />
                        <p className="text-sm leading-6 text-muted">{stage.description}</p>
                        <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
                            Level elements {elementUnlockCount}/{substageProgressMarks.length}
                          </p>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan to-mint transition-all duration-500"
                              style={{ width: `${protectedStage ? stageCompletion : 0}%` }}
                            />
                          </div>
                          {stage.subElements.map((element, elementIndex) => {
                            const isElementUnlocked = elementIndex < elementUnlockCount;
                            return (
                              <div key={`${stage.level}-${element}`} className="flex items-center justify-between gap-3 text-xs">
                                <div className="flex min-w-0 items-center gap-2">
                                  {isElementUnlocked ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-mint" />
                                  ) : (
                                    <Circle className="h-3.5 w-3.5 shrink-0 text-white/35" />
                                  )}
                                  <span className={cn("truncate", isElementUnlocked ? "text-foreground" : "text-muted")}>{element}</span>
                                </div>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                                    isElementUnlocked ? "bg-mint/10 text-mint" : "bg-white/[0.05] text-white/35"
                                  )}
                                >
                                  {substageProgressMarks[elementIndex]}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold">
                          <span className="text-cyan">{stageGoal > 0 ? `${stageGoal} XP Goal` : "Final Stage"}</span>
                          {xpLeftToCompleteStage === null ? (
                            <span className="text-white/35">Locked</span>
                          ) : (
                            <span className={xpLeftToCompleteStage === 0 ? "text-mint" : "text-amber"}>
                              {xpLeftToCompleteStage} XP left
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 pb-5">
            {stagePages.map((_, pageIndex) => (
              <button
                key={`stage-dot-${pageIndex}`}
                type="button"
                onClick={() => setCurrentPage(pageIndex)}
                className={cn(
                  "h-2.5 rounded-full transition",
                  pageIndex === currentPage ? "w-8 bg-cyan shadow-[0_0_18px_rgba(99,179,237,0.45)]" : "w-2.5 bg-white/20 hover:bg-white/40"
                )}
                aria-label={`Open progress page ${pageIndex + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 p-6">
          <div className="mb-2 flex justify-between text-sm font-bold text-muted">
            <span>{totalXp} XP earned</span>
            <span>Level {currentLevel}</span>
          </div>
          <Progress value={percent} className="h-3" />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-cyan">Loss aversion</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Missing several days adds lock pressure. A completed focus session reduces that pressure and protects your latest stage.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-mint">Next target</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Your next unlock is <span className="font-bold text-foreground">{next.name}</span>. Complete deep focus sessions for faster progress.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-amber">Current pressure</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {currentProgress.lockStrikes > 0
              ? `${currentProgress.lockStrikes} lock strike detected. Show up today to stabilize your world.`
              : "No lock strikes. Your world is stable, but only completed sessions keep it that way."}
          </p>
        </Card>
      </div>

      {behavior.unlockedElements.length > 0 ? (
        <Card>
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-cyan">Unlocked world elements</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {behavior.unlockedElements.map((element) => (
              <div
                key={`${element.stage}-${element.elementName}`}
                className={cn(
                  "rounded-2xl border p-4",
                  element.locked ? "border-danger/25 bg-danger/10" : "border-mint/25 bg-mint/10"
                )}
              >
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{element.stageName}</p>
                <p className="mt-2 font-bold">{element.elementName}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
                  <span className={element.locked ? "text-danger" : "text-mint"}>
                    {element.locked ? "Locked by pressure" : "Protected"}
                  </span>
                  {element.milestonePercent ? <span className="text-cyan">{element.milestonePercent}%</span> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <AnimatePresence>
      {selectedStage ? (
        <motion.div
          className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setSelectedStageLevel(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="my-auto flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-cyan/25 bg-[#0b1325] shadow-[0_40px_90px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={modalSpring}
          >
            <div className="relative border-b border-white/10 p-4 sm:p-6">
              <button
                type="button"
                onClick={() => moveSelectedStage(-1)}
                disabled={selectedStage.stage.level <= 1}
                className={cn(
                  "absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-foreground transition hover:border-cyan/45 hover:text-cyan",
                  selectedStage.stage.level <= 1 && "pointer-events-none opacity-35"
                )}
                aria-label="Open previous stage"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => moveSelectedStage(1)}
                disabled={selectedStage.stage.level >= worldStages.length}
                className={cn(
                  "absolute right-16 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-foreground transition hover:border-cyan/45 hover:text-cyan",
                  selectedStage.stage.level >= worldStages.length && "pointer-events-none opacity-35"
                )}
                aria-label="Open next stage"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedStageLevel(null)}
                className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-foreground transition hover:border-cyan/45 hover:text-cyan"
                aria-label="Close stage details"
              >
                <X className="h-5 w-5" />
              </button>
              <motion.div
                className="relative overflow-hidden rounded-2xl border border-white/10"
                initial={{ opacity: 0.85, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
              >
                <StageScene stageCode={selectedStage.stage.code} accent={selectedStage.stage.accent} className="h-44 sm:h-64" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-cyan/25 bg-cyan/15 text-cyan">Level {selectedStage.stage.level}</Badge>
                    <Badge className="border-white/20 bg-white/[0.08] text-white/85">{stageTier(selectedStage.stage.level)} tier</Badge>
                    <Badge
                      className={cn(
                        selectedStage.unlocked && selectedStage.protectedStage && "border-mint/25 bg-mint/15 text-mint",
                        selectedStage.unlocked && !selectedStage.protectedStage && "border-danger/25 bg-danger/15 text-danger",
                        !selectedStage.unlocked && "border-white/20 bg-black/35 text-white/80"
                      )}
                    >
                      {selectedStage.unlocked ? (selectedStage.protectedStage ? "Protected unlock" : "Lock-back risk") : "Locked stage"}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">{selectedStage.stage.name}</h3>
                  <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">{selectedStage.stage.description}</p>
                </div>
              </motion.div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-white/10 p-3 sm:p-4">
              {(["overview", "elements", "intel"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setModalTab(tab)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] transition sm:text-sm",
                    modalTab === tab ? "border-cyan/40 bg-cyan/15 text-cyan" : "border-white/15 bg-black/20 text-muted hover:border-cyan/30"
                  )}
                >
                  {tab}
                </button>
              ))}
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStageLevel(currentLevel);
                    setModalTab("overview");
                  }}
                  className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs font-bold text-muted transition hover:border-cyan/35 hover:text-cyan"
                >
                  Jump to current
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/timer")}
                  className="rounded-full border border-cyan/30 bg-cyan/12 px-3 py-2 text-xs font-bold text-cyan transition hover:bg-cyan/20"
                >
                  Start focus
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 sm:p-6">
              <AnimatePresence mode="wait">
              {modalTab === "overview" ? (
                <motion.div
                  key="modal-overview"
                  className="space-y-5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <motion.div className="rounded-2xl border border-cyan/20 bg-cyan/10 p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-cyan">Completion</p>
                      <p className="mt-2 text-2xl font-extrabold">{selectedStage.completionPercent}%</p>
                    </motion.div>
                    <motion.div className="rounded-2xl border border-mint/20 bg-mint/10 p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-mint">Elements</p>
                      <p className="mt-2 text-2xl font-extrabold">
                        {selectedStage.elementUnlockCount}/{substageProgressMarks.length}
                      </p>
                    </motion.div>
                    <motion.div className="rounded-2xl border border-amber/20 bg-amber/10 p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber">Level Goal</p>
                      <p className="mt-2 text-2xl font-extrabold">{selectedStage.stageGoal > 0 ? `${selectedStage.stageGoal} XP` : "Final Stage"}</p>
                    </motion.div>
                    <motion.div className="rounded-2xl border border-white/20 bg-white/[0.04] p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Power Rank</p>
                      <p className="mt-2 text-2xl font-extrabold">{Math.max(1, Math.round(selectedStage.completionPercent + selectedStage.elementUnlockCount * 12.5))}</p>
                    </motion.div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm font-bold">
                      <span className="text-muted">Stage progress</span>
                      {selectedStage.xpLeftToCompleteStage === null ? (
                        <span className="text-white/40">Locked</span>
                      ) : (
                        <span className={selectedStage.xpLeftToCompleteStage === 0 ? "text-mint" : "text-amber"}>
                          {selectedStage.xpLeftToCompleteStage} XP left
                        </span>
                      )}
                    </div>
                    <Progress value={selectedStage.protectedStage ? selectedStage.completionPercent : 0} className="h-2.5" />
                    <p className="mt-3 text-xs text-muted">
                      XP band: {selectedStage.stage.threshold} to {selectedStage.nextThreshold}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Substage Circuit</p>
                      <p className="text-xs text-muted">Press keys `1-4` to inspect quickly</p>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      {selectedStage.stage.subElements.map((element, elementIndex) => {
                        const unlockedElement = elementIndex < selectedStage.elementUnlockCount;
                        const activeElement = elementIndex === selectedElementIndex;
                        return (
                          <motion.button
                            type="button"
                            key={`overview-node-${selectedStage.stage.code}-${element}`}
                            onClick={() => setSelectedElementIndex(elementIndex)}
                            className={cn(
                              "rounded-xl border px-3 py-3 text-left text-xs transition",
                              unlockedElement && "border-mint/25 bg-mint/10",
                              !unlockedElement && "border-white/10 bg-white/[0.03]",
                              activeElement && "ring-2 ring-cyan/55"
                            )}
                            whileHover={{ y: -2, scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <p className={cn("truncate font-bold", unlockedElement ? "text-foreground" : "text-muted")}>{element}</p>
                            <p className={cn("mt-1 text-[10px] font-extrabold", unlockedElement ? "text-mint" : "text-white/40")}>
                              Node {elementIndex + 1} · {substageProgressMarks[elementIndex]}%
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                    {selectedElement ? (
                      <div className="mt-3 rounded-xl border border-cyan/25 bg-cyan/10 p-3">
                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-cyan">Focused Node</p>
                        <p className="mt-1 text-sm font-bold">{selectedElement}</p>
                        <p className="mt-1 text-xs text-white/80">
                          {selectedElementIndex < selectedStage.elementUnlockCount
                            ? "Unlocked and actively reinforcing this stage."
                            : `Complete more XP to unlock at ${substageProgressMarks[selectedElementIndex]}% milestone.`}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Session Impact Simulator</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setXpPreviewGain((value) => Math.max(5, value - 5))}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-foreground transition hover:border-cyan/35"
                          aria-label="Reduce simulated XP"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="rounded-full border border-cyan/25 bg-cyan/15 px-3 py-1 text-xs font-bold text-cyan">+{xpPreviewGain} XP</span>
                        <button
                          type="button"
                          onClick={() => setXpPreviewGain((value) => Math.min(200, value + 5))}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-foreground transition hover:border-cyan/35"
                          aria-label="Increase simulated XP"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Current Completion</p>
                        <p className="mt-1 text-lg font-extrabold">{projectedCompletionPercent}%</p>
                        <Progress value={projectedCompletionPercent} className="mt-2 h-2" />
                      </div>
                      <div className="rounded-xl border border-mint/20 bg-mint/10 p-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-mint">After Next Session</p>
                        <p className="mt-1 text-lg font-extrabold text-mint">{simulatedCompletionPercent}%</p>
                        <Progress value={simulatedCompletionPercent} className="mt-2 h-2" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-white/75">
                      Estimated completion gain: +{Math.max(0, simulatedCompletionPercent - projectedCompletionPercent)}% for this stage.
                    </p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">World Position</p>
                      <p className="mt-2 text-2xl font-extrabold">
                        {selectedStage.stage.level}/{worldStages.length}
                      </p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan to-indigo-300" style={{ width: `${selectedStage.progressWithinMap}%` }} />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber/20 bg-amber/10 p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber">Unlock Gap</p>
                      <p className="mt-2 text-2xl font-extrabold">
                        {selectedStage.unlockGapXp} XP
                      </p>
                      <p className="mt-2 text-xs text-white/75">
                        {selectedStage.unlockGapXp === 0 ? "Already reached this stage." : "XP required to reach this stage from your current level."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-mint/20 bg-mint/10 p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-mint">Forecast</p>
                      <p className="mt-2 text-2xl font-extrabold">
                        ~{selectedStage.estimatedSessionsToComplete} sessions
                      </p>
                      <p className="mt-2 text-xs text-white/75">Estimated using a standard 25-minute focus run.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Stage Chain</p>
                      <p className="text-xs text-muted">Current streak: {currentProgress.dailyStreak} days</p>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Previous</p>
                        <p className="mt-1 text-sm font-bold">{worldStages[selectedStage.stage.level - 2]?.name ?? "Genesis"}</p>
                      </div>
                      <div className="rounded-xl border border-cyan/25 bg-cyan/10 p-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-cyan">Current</p>
                        <p className="mt-1 text-sm font-bold">{selectedStage.stage.name}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Next</p>
                        <p className="mt-1 text-sm font-bold">{worldStages[selectedStage.stage.level]?.name ?? "Realm Complete"}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}

              {modalTab === "elements" ? (
                <motion.div
                  key="modal-elements"
                  className="space-y-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {selectedElement ? (
                    <div className="rounded-2xl border border-cyan/25 bg-cyan/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-extrabold text-cyan">{selectedElement}</p>
                        <Badge className="border-cyan/25 bg-cyan/15 text-cyan">Element {selectedElementIndex + 1}/4</Badge>
                      </div>
                      <p className="mt-2 text-xs text-white/80">
                        {selectedElementIndex < selectedStage.elementUnlockCount
                          ? "Element is live and protected. Keep session momentum to retain it."
                          : "Element is still dormant. Completing sessions will activate it at the required milestone."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["track", "stabilize", "push"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setSelectedElementMode(mode)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                              selectedElementMode === mode
                                ? "border-cyan/35 bg-cyan/15 text-cyan"
                                : "border-white/15 bg-black/20 text-muted hover:border-cyan/30"
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-white/80">
                        {selectedElementMode === "track" && "Tracking mode highlights this node in your current focus cadence."}
                        {selectedElementMode === "stabilize" && "Stabilize mode prioritizes this node for consistency protection."}
                        {selectedElementMode === "push" && "Push mode targets this node for accelerated unlock progression."}
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                  {selectedStage.stage.subElements.map((element, elementIndex) => {
                    const unlockedElement = elementIndex < selectedStage.elementUnlockCount;
                    const activeElement = elementIndex === selectedElementIndex;
                    return (
                      <motion.button
                        type="button"
                        onMouseEnter={() => setSelectedElementIndex(elementIndex)}
                        onClick={() => setSelectedElementIndex(elementIndex)}
                        key={`${selectedStage.stage.code}-${element}`}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition hover:border-cyan/40",
                          unlockedElement ? "border-mint/25 bg-mint/10" : "border-white/10 bg-white/[0.03]",
                          activeElement && "ring-2 ring-cyan/55"
                        )}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {unlockedElement ? (
                              <CheckCircle2 className="h-4 w-4 text-mint" />
                            ) : (
                              <Circle className="h-4 w-4 text-white/35" />
                            )}
                            <p className={cn("text-sm font-bold", unlockedElement ? "text-foreground" : "text-muted")}>{element}</p>
                          </div>
                          <Badge className={unlockedElement ? "border-mint/20 bg-mint/10 text-mint" : "border-white/15 bg-white/[0.04] text-white/40"}>
                            {substageProgressMarks[elementIndex]}%
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          {unlockedElement ? "Unlocked and contributing to stage stability." : "Complete more focus XP to unlock this element."}
                        </p>
                      </motion.button>
                    );
                  })}
                  </div>
                </motion.div>
              ) : null}

              {modalTab === "intel" ? (
                <motion.div
                  key="modal-intel"
                  className="space-y-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-cyan/20 bg-cyan/10 p-4">
                      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-cyan">
                        <Target className="h-4 w-4" />
                        Stage Mission
                      </p>
                      <p className="mt-2 text-sm text-white/85">Protect this stage by finishing complete sessions consistently.</p>
                    </div>
                    <div className="rounded-2xl border border-amber/20 bg-amber/10 p-4">
                      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-amber">
                        <Zap className="h-4 w-4" />
                        Pressure
                      </p>
                      <p className="mt-2 text-sm text-white/85">
                        {currentProgress.lockStrikes > 0 ? `${currentProgress.lockStrikes} active strike(s)` : "Stable. No current lock strikes."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-mint/20 bg-mint/10 p-4">
                      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-mint">
                        <Trophy className="h-4 w-4" />
                        Reward
                      </p>
                      <p className="mt-2 text-sm text-white/85">
                        {selectedStage.stage.level < worldStages.length
                          ? `Unlock ${worldStages[selectedStage.stage.level].name} after this stage is completed.`
                          : "Final stage reached. Realm stabilized."}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">Tactical guidance</p>
                    <p className="mt-2 text-sm leading-6 text-white/80">
                      {selectedStage.current
                        ? "This is your active stage. Completed sessions directly convert to element unlocks and stage completion."
                        : selectedStage.unlocked
                          ? "This stage is already unlocked. Protect discipline to avoid lock-back pressure on its unlocked elements."
                          : "This stage is locked. Build XP in current stages to open this level, then complete all four sub-elements."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                        <Activity className="h-4 w-4 text-cyan" />
                        Live Pressure Meter
                      </p>
                      <p className="text-xs font-bold text-amber">{currentProgress.lockStrikes}/3 strike threshold</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className={cn(
                          "h-full transition-all",
                          currentProgress.lockStrikes >= 3
                            ? "bg-danger"
                            : currentProgress.lockStrikes === 2
                              ? "bg-amber"
                              : "bg-gradient-to-r from-cyan to-mint"
                        )}
                        style={{ width: `${Math.min(100, (currentProgress.lockStrikes / 3) * 100)}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (currentProgress.lockStrikes / 3) * 100)}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-white/80">
                      Keep completing sessions to prevent lock-back pressure from escalating.
                    </p>
                  </div>
                </motion.div>
              ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </div>
  );
}
