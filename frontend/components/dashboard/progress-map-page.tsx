"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Lock, ShieldCheck, Sparkles } from "lucide-react";

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

export function ProgressMapPage({ progress }: { progress: ProgressDTO }) {
  const [currentProgress, setCurrentProgress] = useState(progress);
  const [behavior, setBehavior] = useState<BehavioralInsightsDTO>(defaultBehavioralInsights);
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
                    const stageCost = globalIndex === 0 ? 0 : stage.threshold - worldStages[globalIndex - 1].threshold;
                    const xpLeftToCompleteStage =
                      current && nextThreshold > stage.threshold ? Math.max(0, nextThreshold - totalXp) : stage.level < currentLevel ? 0 : null;
                    return (
                      <div
                        key={stage.level}
                        className={cn(
                          "min-h-[26rem] rounded-[24px] border p-5 transition duration-300",
                          unlocked && protectedStage && "border-mint/30 bg-mint/10",
                          unlocked && !protectedStage && "border-danger/30 bg-danger/10",
                          !unlocked && "border-white/10 bg-white/[0.04]",
                          current && "scale-[1.02] border-cyan/50 bg-cyan/12 shadow-[0_0_36px_rgba(99,179,237,0.18)]"
                        )}
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
                          <span className="text-cyan">{stageCost} XP required</span>
                          {xpLeftToCompleteStage === null ? (
                            <span className="text-white/35">Locked</span>
                          ) : (
                            <span className={xpLeftToCompleteStage === 0 ? "text-mint" : "text-amber"}>
                              {xpLeftToCompleteStage} XP left
                            </span>
                          )}
                        </div>
                      </div>
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
    </div>
  );
}
