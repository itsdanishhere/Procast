"use client";

import Link from "next/link";
import { Lock, Map, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getNextStage, getStage, getStageProgressPercent, getXpToNextLevel } from "@/lib/progression";
import { worldStages } from "@/lib/constants";
import type { ProgressDTO, UnlockedElementDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

export function WorldProgressCard({
  progress,
  unlockedElements = []
}: {
  progress: ProgressDTO;
  unlockedElements?: UnlockedElementDTO[];
}) {
  const current = getStage(progress.currentLevel);
  const next = getNextStage(progress.totalXp);
  const percent = getStageProgressPercent(progress.totalXp);
  const lockedBack = progress.lockedStage < progress.unlockedStage;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/10 p-6">
        <CardHeader className="mb-0">
          <div>
            <CardTitle>World Progression</CardTitle>
            <CardDescription>
              Current stage: {current.name}. Next unlock: {next.name}.
            </CardDescription>
          </div>
          <Badge className={lockedBack ? "border-danger/25 bg-danger/10 text-danger" : "border-mint/25 bg-mint/10 text-mint"}>
            {lockedBack ? <Lock className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {lockedBack ? "Lock-back active" : "Protected"}
          </Badge>
        </CardHeader>
      </div>

      <div className="world-grid p-5">
        <div className="grid grid-cols-5 gap-2">
          {worldStages.map((stage) => {
            const unlocked = stage.level <= progress.unlockedStage;
            const protectedStage = stage.level <= progress.lockedStage;
            const currentStage = stage.level === progress.currentLevel;
            return (
              <div
                key={stage.level}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-2xl border text-center transition",
                  unlocked && protectedStage && "border-mint/30 bg-mint/10 text-mint",
                  unlocked && !protectedStage && "border-danger/30 bg-danger/10 text-danger",
                  !unlocked && "border-white/10 bg-white/[0.04] text-white/25",
                  currentStage && "scale-[1.04] border-cyan/50 bg-cyan/15 text-cyan shadow-[0_0_28px_rgba(99,179,237,0.18)]"
                )}
              >
                {!protectedStage && unlocked ? <Lock className="absolute right-2 top-2 h-3.5 w-3.5" /> : null}
                <span className="font-display text-2xl font-extrabold">{stage.symbol}</span>
                <span className="mt-1 text-[10px] font-bold uppercase">{stage.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-2 flex items-center justify-between text-sm font-bold">
          <span className="text-muted">Level {progress.currentLevel}</span>
          <span className="text-cyan">{getXpToNextLevel(progress.totalXp)} XP to next</span>
        </div>
        <Progress value={percent} />
        {unlockedElements.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {unlockedElements.slice(0, 5).map((element) => (
              <span
                key={`${element.stage}-${element.elementName}`}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-bold",
                  element.locked ? "border-danger/25 bg-danger/10 text-danger" : "border-mint/25 bg-mint/10 text-mint"
                )}
              >
                {element.elementName}
              </span>
            ))}
          </div>
        ) : null}
        <Link href="/progress" className="mt-5 flex items-center gap-2 text-sm font-bold text-cyan">
          <Map className="h-4 w-4" />
          Open full progress map
        </Link>
      </div>
    </Card>
  );
}
