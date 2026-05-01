"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { achievements } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { appDataRefreshEvent } from "@/lib/timer-events";

export function AchievementsPageClient({ awards }: { awards: { code: string; awardedAt: string }[] }) {
  const [currentAwards, setCurrentAwards] = useState(awards);
  const awardedCodes = new Set(currentAwards.map((award) => award.code));

  const loadAchievements = useCallback(async () => {
    const response = await apiFetch("/achievements");
    if (!response.ok) return;
    const data = await response.json();
    setCurrentAwards(
      (data.achievements ?? [])
        .filter((achievement: any) => achievement.unlocked)
        .map((achievement: any) => ({
          code: String(achievement.code),
          awardedAt: achievement.unlockedAt ?? new Date().toISOString()
        }))
    );
  }, []);

  useEffect(() => {
    void loadAchievements();
    window.addEventListener(appDataRefreshEvent, loadAchievements);
    return () => window.removeEventListener(appDataRefreshEvent, loadAchievements);
  }, [loadAchievements]);

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-cyan">Achievements</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold">Badges that reward discipline, not busyness.</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Achievements unlock from completed sessions, streaks, deep focus, world progression, and weekly consistency.
            </p>
          </div>
          <Badge className="border-amber/25 bg-amber/10 text-amber">
            <Trophy className="h-3.5 w-3.5" />
            {currentAwards.length}/{achievements.length} unlocked
          </Badge>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {achievements.map((achievement) => {
          const Icon = achievement.icon;
          const unlocked = awardedCodes.has(achievement.code);
          const award = currentAwards.find((item) => item.code === achievement.code);
          return (
            <Card
              key={achievement.code}
              className={cn(
                "relative overflow-hidden transition",
                unlocked ? "border-mint/30 bg-mint/[0.06]" : "opacity-72"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", unlocked ? "bg-mint/12 text-mint" : "bg-white/[0.05] text-white/30")}>
                  {unlocked ? <Icon className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
                </div>
                <Badge className={unlocked ? "border-mint/25 bg-mint/10 text-mint" : ""}>
                  {unlocked ? "Unlocked" : "Locked"}
                </Badge>
              </div>
              <h3 className="mt-5 font-display text-2xl font-extrabold">{achievement.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{achievement.description}</p>
              <div className="mt-5 flex items-center justify-between text-sm font-bold">
                <span className="text-cyan">+{achievement.xpBonus} XP</span>
                <span className="text-muted">{award ? new Date(award.awardedAt).toLocaleDateString() : "Not yet"}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
