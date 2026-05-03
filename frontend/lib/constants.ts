import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  Castle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Flame,
  Focus,
  Lock,
  Map,
  ShieldAlert,
  Sparkles,
  Trophy
} from "lucide-react";

export { worldStages } from "./world-stages";

export const achievements = [
  {
    code: "first_session",
    title: "First Session",
    description: "Completed your first focused work block.",
    icon: CheckCircle2,
    xpBonus: 25
  },
  {
    code: "seven_day_streak",
    title: "7-Day Streak",
    description: "Showed up for seven days without breaking rhythm.",
    icon: Flame,
    xpBonus: 120
  },
  {
    code: "deep_focus_master",
    title: "Deep Focus Master",
    description: "Completed a deep focus session without quitting early.",
    icon: Brain,
    xpBonus: 80
  },
  {
    code: "town_builder",
    title: "Town Builder",
    description: "Unlocked the Town stage of your discipline world.",
    icon: Map,
    xpBonus: 90
  },
  {
    code: "consistency_champion",
    title: "Consistency Champion",
    description: "Completed 25 sessions across your account.",
    icon: Trophy,
    xpBonus: 150
  },
  {
    code: "no_skip_week",
    title: "No Skip Week",
    description: "Hit the weekly consistency goal without falling behind.",
    icon: ShieldAlert,
    xpBonus: 120
  },
  {
    code: "hundred_sessions",
    title: "100 Sessions Club",
    description: "Reached 100 completed focus sessions.",
    icon: Castle,
    xpBonus: 300
  }
] as const;

export const landingFeatures = [
  {
    title: "Focus Timer",
    problem: "Solves the blank-start problem by giving work a clear beginning and end.",
    icon: Clock3
  },
  {
    title: "Deep Focus Lock",
    problem: "Adds friction before quitting so impulses have to face a warning first.",
    icon: Lock
  },
  {
    title: "Progress Map",
    problem: "Turns invisible discipline into a world you can build, protect, and lose.",
    icon: Map
  },
  {
    title: "XP System",
    problem: "Rewards starts, finishes, reflections, and streaks instead of vague busyness.",
    icon: Sparkles
  },
  {
    title: "Reflection Journal",
    problem: "Finds distraction patterns instead of letting each failed day disappear.",
    icon: BookOpen
  },
  {
    title: "Analytics Dashboard",
    problem: "Shows when you actually focus best so planning becomes evidence-based.",
    icon: BarChart3
  }
] as const;

export const appNav = [
  { href: "/dashboard", label: "Dashboard", icon: Focus },
  { href: "/progress", label: "Progress", icon: Map },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/achievements", label: "Badges", icon: Trophy },
  { href: "/notifications", label: "Alerts", icon: Bell }
] as const;

export const timerModes = {
  POMODORO: { label: "Pomodoro", minutes: 25, xp: 25 },
  SHORT_BREAK: { label: "Short Break", minutes: 5, xp: 5 },
  LONG_BREAK: { label: "Long Break", minutes: 15, xp: 15 },
  DEEP_FOCUS: { label: "Deep Focus", minutes: 45, xp: 45 },
  CUSTOM: { label: "Custom", minutes: 60, xp: 60 },
  STOPWATCH: { label: "Stopwatch", minutes: 0, xp: 0 }
} as const;

export const statsCards = [
  { label: "Focus Time", icon: Clock3 },
  { label: "Tasks Done", icon: CheckCircle2 },
  { label: "Current Streak", icon: Flame },
  { label: "XP Earned", icon: CircleDollarSign }
] as const;
