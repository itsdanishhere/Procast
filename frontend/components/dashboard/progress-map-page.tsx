"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getNextStage, getStageProgressPercent, getXpToNextLevel } from "@/lib/progression";
import { worldStages } from "@/lib/constants";
import type { ProgressDTO } from "@/lib/types";
import { cn } from "@/lib/cn";
import { fetchCurrentUserProgress } from "@/lib/live-data";
import { appDataRefreshEvent } from "@/lib/timer-events";

export function ProgressMapPage({ progress }: { progress: ProgressDTO }) {
  const [currentProgress, setCurrentProgress] = useState(progress);
  const totalXp = currentProgress.totalXp ?? 0;
  const currentLevel = currentProgress.currentLevel ?? 1;
  const next = getNextStage(totalXp);
  const percent = getStageProgressPercent(totalXp);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      const latest = await fetchCurrentUserProgress(progress);
      if (!cancelled && latest) setCurrentProgress(latest);
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
            <Badge className="border-cyan/25 bg-cyan/10 text-cyan">
              <Sparkles className="h-3.5 w-3.5" />
              {getXpToNextLevel(totalXp)} XP to {next.name}
            </Badge>
          </div>
        </div>

        <div className="world-grid p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {worldStages.map((stage, index) => {
              const unlocked = stage.level <= currentProgress.unlockedStage;
              const protectedStage = stage.level <= currentProgress.lockedStage;
              const current = stage.level === currentLevel;
              return (
                <div key={stage.level} className="relative">
                  {index < worldStages.length - 1 ? (
                    <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-white/20 xl:block" />
                  ) : null}
                  <div
                    className={cn(
                      "min-h-56 rounded-[24px] border p-5 transition duration-300",
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
                    <div className="my-7 flex h-24 items-center justify-center rounded-2xl border border-white/10 bg-black/20 font-display text-5xl font-extrabold">
                      {stage.symbol}
                    </div>
                    <p className="text-sm leading-6 text-muted">{stage.description}</p>
                    <p className="mt-4 text-xs font-bold text-cyan">{stage.threshold} XP required</p>
                  </div>
                </div>
              );
            })}
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
    </div>
  );
}
