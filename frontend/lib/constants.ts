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

export const legacyWorldStages = [
  {
    level: 1,
    name: "Empty Land",
    threshold: 0,
    description: "A quiet plot waiting for proof that you can begin.",
    accent: "#63b3ed",
    symbol: "□",
    subElements: ["Boundary Markers", "Starter Path", "Foundation Plot", "First Signal Flag"]
  },
  {
    level: 2,
    name: "Small House",
    threshold: 120,
    description: "Your first shelter appears after consistent starts.",
    accent: "#76e4a7",
    symbol: "⌂",
    subElements: ["Roof Frame", "Front Door", "Window Glow", "Warm Lights"]
  },
  {
    level: 3,
    name: "Better House",
    threshold: 280,
    description: "The foundation strengthens as your sessions stack.",
    accent: "#90cdf4",
    symbol: "⌂",
    subElements: ["Stronger Walls", "Second Floor", "Focus Desk", "Study Room"]
  },
  {
    level: 4,
    name: "Garden",
    threshold: 480,
    description: "Discipline starts to feel alive and visible.",
    accent: "#68d391",
    symbol: "✦",
    subElements: ["Seed Beds", "Flower Beds", "Stone Walkway", "Water Fountain"]
  },
  {
    level: 5,
    name: "Street",
    threshold: 720,
    description: "Your habit becomes a path you can return to.",
    accent: "#f6e05e",
    symbol: "━",
    subElements: ["Road Markers", "Street Lamps", "Crossing Gate", "Return Route"]
  },
  {
    level: 6,
    name: "Village",
    threshold: 1020,
    description: "Your world is now protected by repeated effort.",
    accent: "#b794f4",
    symbol: "▦",
    subElements: ["Community Homes", "Village Square", "Bridge", "Gathering Hall"]
  },
  {
    level: 7,
    name: "Town",
    threshold: 1380,
    description: "Focus sessions start forming a real system.",
    accent: "#f6ad55",
    symbol: "▣",
    subElements: ["Market Row", "Workshop Block", "Town Hall", "Clock Tower"]
  },
  {
    level: 8,
    name: "Large Town",
    threshold: 1800,
    description: "Momentum compounds into visible self-trust.",
    accent: "#63b3ed",
    symbol: "▩",
    subElements: ["Transit Hub", "Work District", "Public Garden", "Planning Center"]
  },
  {
    level: 9,
    name: "City",
    threshold: 2300,
    description: "Focused days now shape something hard to abandon.",
    accent: "#76e4a7",
    symbol: "▥",
    subElements: ["Skyline Block", "Metro Core", "Innovation Center", "Discipline Tower"]
  },
  {
    level: 10,
    name: "Kingdom",
    threshold: 2900,
    description: "Your discipline has become an identity.",
    accent: "#f6ad55",
    symbol: "♜",
    subElements: ["Outer Wall", "Royal District", "Citadel", "Throne Hall"]
  }
] as const;

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
  POMODORO: { label: "Pomodoro", minutes: 25, xp: 35 },
  SHORT_BREAK: { label: "Short Break", minutes: 5, xp: 0 },
  LONG_BREAK: { label: "Long Break", minutes: 15, xp: 0 },
  DEEP_FOCUS: { label: "Deep Focus", minutes: 45, xp: 80 },
  CUSTOM: { label: "Custom", minutes: 60, xp: 90 }
} as const;

export const statsCards = [
  { label: "Focus Time", icon: Clock3 },
  { label: "Tasks Done", icon: CheckCircle2 },
  { label: "Current Streak", icon: Flame },
  { label: "XP Earned", icon: CircleDollarSign }
] as const;
