"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { BarChart3, Brain, CheckCircle2, Clock3, Flame, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { defaultBehavioralInsights, normalizeBehavioralInsights } from "@/lib/live-data";
import { appDataRefreshEvent } from "@/lib/timer-events";
import type { BehavioralInsightsDTO } from "@/lib/types";

type AnalyticsData = {
  summary: {
    totalFocusMinutes: number;
    completedSessions: number;
    completedTasks: number;
    activeTasks: number;
    dailyStreak: number;
    bestStreak: number;
    xp: number;
  };
  daily: { day: string; minutes: number; sessions: number }[];
  bestHours: { hour: string; score: number }[];
  taskTrend: { completed: number; active: number; archived: number };
  behavioralInsights: BehavioralInsightsDTO;
  insights: string[];
};

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  const loadAnalytics = useCallback(async () => {
    const response = await apiFetch("/analytics/dashboard");
    if (!response.ok) return;
    const payload = await response.json();
    setData({
      summary: {
        totalFocusMinutes: Number(payload.summary?.totalFocusMinutes ?? 0),
        completedSessions: Number(payload.summary?.completedSessions ?? 0),
        completedTasks: Number(payload.summary?.completedTasks ?? 0),
        activeTasks: Number(payload.summary?.activeTasks ?? 0),
        dailyStreak: Number(payload.summary?.dailyStreak ?? 0),
        bestStreak: Number(payload.summary?.bestStreak ?? payload.summary?.bestDailyStreak ?? 0),
        xp: Number(payload.summary?.xp ?? payload.summary?.totalXp ?? 0)
      },
      daily: (payload.daily ?? []).map((item: any) => ({
        day: String(item.day),
        minutes: Number(item.minutes ?? Math.round(Number(item.focusSeconds ?? 0) / 60)),
        sessions: Number(item.sessions ?? item.completedSessions ?? 0)
      })),
      bestHours: (payload.bestHours ?? []).map((item: any) => ({
        hour: String(item.hour),
        score: Number(item.score ?? 0)
      })),
      taskTrend: payload.taskTrend ?? { completed: 0, active: 0, archived: 0 },
      behavioralInsights: normalizeBehavioralInsights(payload, defaultBehavioralInsights),
      insights: payload.insights ?? []
    });
  }, []);

  useEffect(() => {
    void loadAnalytics();
    window.addEventListener(appDataRefreshEvent, loadAnalytics);
    return () => window.removeEventListener(appDataRefreshEvent, loadAnalytics);
  }, [loadAnalytics]);

  if (!data || !data.summary) {
    return (
      <Card className="glass p-12 text-center">
        <p className="text-muted">Loading analytics data...</p>
        <p className="mt-2 text-xs text-faint">Ensure the backend is running and you are logged in.</p>
      </Card>
    );
  }

  const stats = [
    { label: "Focus minutes", value: data.summary.totalFocusMinutes, icon: Clock3, color: "text-cyan" },
    { label: "Sessions", value: data.summary.completedSessions, icon: BarChart3, color: "text-mint" },
    { label: "Tasks done", value: data.summary.completedTasks, icon: CheckCircle2, color: "text-amber" },
    { label: "Best streak", value: `${data.summary.bestStreak ?? 0}d`, icon: Flame, color: "text-danger" },
    { label: "Total XP", value: data.summary.xp, icon: Sparkles, color: "text-cyan" }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <Icon className={`mb-4 h-5 w-5 ${stat.color}`} />
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">{stat.label}</p>
              <p className="mt-1 font-display text-2xl font-extrabold">{stat.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="p-6">
          <div className="mb-6">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-cyan">Weekly and monthly focus</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold">Focus time trend</h2>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily}>
                <defs>
                  <linearGradient id="focusArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "rgba(238,242,247,0.55)", fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "rgba(238,242,247,0.55)", fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#10131f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 }} />
                <Area type="monotone" dataKey="minutes" stroke="#2563eb" fill="url(#focusArea)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-mint">Best productivity hours</p>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bestHours}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "rgba(238,242,247,0.55)", fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#10131f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14 }} />
                <Bar dataKey="score" fill="#76e4a7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <Brain className="mb-4 h-5 w-5 text-amber" />
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-amber">Completion rate</p>
          <p className="mt-3 font-display text-3xl font-extrabold">{data.behavioralInsights.completionRate}%</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {data.behavioralInsights.completedSessions} completed from {data.behavioralInsights.totalSessions} attempted sessions.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-danger">Main distraction</p>
          <p className="mt-3 font-display text-2xl font-extrabold">{data.behavioralInsights.topDistraction}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Early exits and reflections both feed this pattern so it gets more accurate over time.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-mint">World state</p>
          <p className="mt-3 font-display text-2xl font-extrabold">
            {data.behavioralInsights.environmentStatus === "locked" ? "Locked" : "Active"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">{data.behavioralInsights.motivation.message}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(data.insights || []).map((insight) => (
          <Card key={insight} className="p-5">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-cyan">Insight</p>
            <p className="mt-3 text-sm leading-6 text-muted">{insight}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
