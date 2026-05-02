"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";

type StageSceneProps = {
  stageCode: string;
  accent: string;
  className?: string;
};

type SceneKind =
  | "land"
  | "home"
  | "garden"
  | "road"
  | "village"
  | "town"
  | "city"
  | "kingdom"
  | "harbor"
  | "library"
  | "industry"
  | "mountain"
  | "space";

const sceneByStage: Record<string, SceneKind> = {
  EMPTY_LAND: "land",
  SMALL_HOUSE: "home",
  BETTER_HOUSE: "home",
  GARDEN: "garden",
  STREET: "road",
  VILLAGE: "village",
  TOWN: "town",
  LARGE_TOWN: "town",
  CITY: "city",
  KINGDOM: "kingdom",
  HIGH_COUNCIL: "kingdom",
  ROYAL_ROAD: "road",
  WATCHTOWER: "kingdom",
  FORTRESS: "kingdom",
  CITADEL: "kingdom",
  HARBOR: "harbor",
  MARKET_CAPITAL: "town",
  GUILD_HALL: "town",
  WORKSHOP_DISTRICT: "industry",
  LIBRARY: "library",
  ACADEMY: "library",
  UNIVERSITY: "library",
  RESEARCH_CITY: "library",
  OBSERVATORY: "space",
  CANAL_SYSTEM: "harbor",
  GRAND_GARDEN: "garden",
  CULTURAL_DISTRICT: "town",
  INDUSTRIAL_QUARTER: "industry",
  LIGHTHOUSE: "harbor",
  MOUNTAIN_KEEP: "mountain",
  CRYSTAL_BRIDGE: "mountain",
  AERIAL_PORT: "space",
  SKYLINE_HARBOR: "city",
  INNOVATION_ARC: "space",
  DISCIPLINE_METRO: "city",
  FOCUS_CAPITAL: "city",
  HARMONY_PROVINCE: "garden",
  GOLDEN_CITADEL: "kingdom",
  STAR_OBSERVATORY: "space",
  ETERNAL_LIBRARY: "library",
  CLOUD_DISTRICT: "space",
  NEON_BOULEVARD: "city",
  QUANTUM_GARDEN: "garden",
  ORBITAL_TOWER: "space",
  SKY_KINGDOM: "space",
  LUNAR_COLONY: "space",
  SOLAR_CITADEL: "space",
  GALACTIC_CAPITAL: "space",
  COSMIC_ARCHIVE: "space",
  PROCAST_REALM: "space"
};

function renderSceneObject(kind: SceneKind) {
  if (kind === "land") {
    return (
      <>
        <rect x="102" y="58" width="116" height="58" rx="10" fill="rgba(7,20,35,0.72)" stroke="rgba(156,241,252,0.25)" />
        <path d="M144 58 L160 44 L176 58 Z" fill="rgba(126,245,216,0.78)" />
        <rect x="158" y="32" width="4" height="12" rx="2" fill="rgba(142,234,254,0.92)" />
      </>
    );
  }

  if (kind === "home") {
    return (
      <>
        <rect x="108" y="63" width="104" height="52" rx="10" fill="rgba(7,20,35,0.78)" stroke="rgba(156,241,252,0.28)" />
        <path d="M102 70 L160 35 L218 70 Z" fill="rgba(98,182,255,0.82)" />
        <rect x="152" y="82" width="16" height="33" rx="4" fill="rgba(112,229,186,0.92)" />
      </>
    );
  }

  if (kind === "garden") {
    return (
      <>
        <ellipse cx="160" cy="103" rx="68" ry="18" fill="rgba(109,232,165,0.32)" />
        <rect x="154" y="62" width="12" height="40" rx="6" fill="rgba(109,232,165,0.95)" />
        <circle cx="144" cy="62" r="16" fill="rgba(130,246,189,0.88)" />
        <circle cx="176" cy="58" r="14" fill="rgba(52,211,153,0.9)" />
        <circle cx="160" cy="50" r="12" fill="rgba(110,231,183,0.95)" />
      </>
    );
  }

  if (kind === "road") {
    return (
      <>
        <path d="M58 116 C112 78, 208 78, 262 116" stroke="rgba(96,165,250,0.92)" strokeWidth="16" fill="none" strokeLinecap="round" />
        <path d="M58 116 C112 78, 208 78, 262 116" stroke="rgba(148,163,184,0.78)" strokeWidth="6" fill="none" strokeDasharray="8 8" />
        <rect x="82" y="62" width="6" height="26" rx="3" fill="rgba(250,204,21,0.9)" />
        <rect x="232" y="62" width="6" height="26" rx="3" fill="rgba(250,204,21,0.9)" />
      </>
    );
  }

  if (kind === "village") {
    return (
      <>
        <rect x="88" y="74" width="54" height="40" rx="8" fill="rgba(7,20,35,0.76)" />
        <path d="M82 78 L115 54 L148 78 Z" fill="rgba(139,92,246,0.82)" />
        <rect x="176" y="68" width="56" height="46" rx="8" fill="rgba(7,20,35,0.76)" />
        <path d="M170 72 L204 50 L238 72 Z" fill="rgba(96,165,250,0.84)" />
      </>
    );
  }

  if (kind === "town") {
    return (
      <>
        <rect x="94" y="56" width="42" height="58" rx="6" fill="rgba(7,20,35,0.8)" />
        <rect x="140" y="42" width="44" height="72" rx="6" fill="rgba(31,41,55,0.9)" />
        <rect x="188" y="60" width="40" height="54" rx="6" fill="rgba(7,20,35,0.78)" />
        <circle cx="162" cy="62" r="8" fill="rgba(103,232,249,0.96)" />
      </>
    );
  }

  if (kind === "city") {
    return (
      <>
        <rect x="82" y="44" width="30" height="70" rx="5" fill="rgba(30,64,175,0.88)" />
        <rect x="116" y="34" width="34" height="80" rx="5" fill="rgba(29,78,216,0.9)" />
        <rect x="154" y="26" width="38" height="88" rx="5" fill="rgba(30,64,175,0.95)" />
        <rect x="196" y="42" width="32" height="72" rx="5" fill="rgba(29,78,216,0.88)" />
      </>
    );
  }

  if (kind === "kingdom") {
    return (
      <>
        <rect x="92" y="58" width="136" height="56" rx="8" fill="rgba(71,85,105,0.86)" />
        <rect x="108" y="44" width="20" height="20" rx="3" fill="rgba(100,116,139,0.9)" />
        <rect x="150" y="40" width="20" height="24" rx="3" fill="rgba(100,116,139,0.94)" />
        <rect x="192" y="44" width="20" height="20" rx="3" fill="rgba(100,116,139,0.9)" />
        <path d="M120 44 L128 30 L136 44 Z" fill="rgba(250,204,21,0.86)" />
        <path d="M162 40 L170 24 L178 40 Z" fill="rgba(250,204,21,0.92)" />
        <path d="M204 44 L212 30 L220 44 Z" fill="rgba(250,204,21,0.86)" />
      </>
    );
  }

  if (kind === "harbor") {
    return (
      <>
        <path d="M70 96 C98 90, 126 104, 154 96 C182 88, 210 104, 238 96" stroke="rgba(56,189,248,0.95)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M140 62 L188 62 L172 84 L124 84 Z" fill="rgba(14,116,144,0.95)" />
        <rect x="154" y="44" width="6" height="18" rx="2" fill="rgba(148,163,184,0.95)" />
        <path d="M160 46 L181 58 L160 58 Z" fill="rgba(226,232,240,0.95)" />
      </>
    );
  }

  if (kind === "library") {
    return (
      <>
        <rect x="96" y="58" width="128" height="56" rx="10" fill="rgba(30,41,59,0.9)" />
        <rect x="108" y="72" width="8" height="32" rx="3" fill="rgba(125,211,252,0.9)" />
        <rect x="124" y="68" width="8" height="36" rx="3" fill="rgba(147,197,253,0.88)" />
        <rect x="140" y="70" width="8" height="34" rx="3" fill="rgba(196,181,253,0.88)" />
        <rect x="156" y="66" width="8" height="38" rx="3" fill="rgba(125,211,252,0.9)" />
        <rect x="172" y="71" width="8" height="33" rx="3" fill="rgba(147,197,253,0.88)" />
        <rect x="188" y="68" width="8" height="36" rx="3" fill="rgba(196,181,253,0.88)" />
      </>
    );
  }

  if (kind === "industry") {
    return (
      <>
        <rect x="94" y="72" width="132" height="42" rx="8" fill="rgba(51,65,85,0.92)" />
        <rect x="108" y="52" width="16" height="24" rx="3" fill="rgba(71,85,105,0.95)" />
        <rect x="132" y="44" width="16" height="32" rx="3" fill="rgba(71,85,105,0.95)" />
        <rect x="156" y="56" width="16" height="20" rx="3" fill="rgba(71,85,105,0.95)" />
        <rect x="180" y="48" width="16" height="28" rx="3" fill="rgba(71,85,105,0.95)" />
        <circle cx="216" cy="54" r="6" fill="rgba(248,250,252,0.88)" />
      </>
    );
  }

  if (kind === "mountain") {
    return (
      <>
        <path d="M78 114 L132 44 L186 114 Z" fill="rgba(71,85,105,0.92)" />
        <path d="M134 114 L188 52 L242 114 Z" fill="rgba(51,65,85,0.95)" />
        <path d="M126 52 L134 44 L142 52 Z" fill="rgba(226,232,240,0.92)" />
        <path d="M180 60 L188 52 L196 60 Z" fill="rgba(226,232,240,0.85)" />
      </>
    );
  }

  return (
    <>
      <circle cx="160" cy="70" r="28" fill="rgba(129,140,248,0.34)" />
      <circle cx="160" cy="70" r="16" fill="rgba(56,189,248,0.75)" />
      <ellipse cx="160" cy="102" rx="72" ry="10" fill="rgba(56,189,248,0.3)" />
      <circle cx="120" cy="42" r="3" fill="rgba(226,232,240,0.95)" />
      <circle cx="198" cy="34" r="3" fill="rgba(196,181,253,0.95)" />
      <circle cx="220" cy="58" r="2" fill="rgba(186,230,253,0.95)" />
    </>
  );
}

export function StageScene({ stageCode, accent, className }: StageSceneProps) {
  const [imageError, setImageError] = useState(false);
  const scene = sceneByStage[stageCode] ?? "space";
  const imageSrc = useMemo(
    () => `/progression/stages/${stageCode.toLowerCase()}.png`,
    [stageCode]
  );

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10", className)}>
      {!imageError ? (
        // Real stage artwork asset (AI-generated) with deterministic per-stage filenames.
        <img
          src={imageSrc}
          alt={`${stageCode} stage artwork`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : null}

      <svg
        viewBox="0 0 320 140"
        className={cn("h-full w-full", !imageError && "hidden")}
      >
        <defs>
          <linearGradient id={`stage-scene-${stageCode}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.34" />
            <stop offset="45%" stopColor="#12213b" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#0a1121" stopOpacity="1" />
          </linearGradient>
          <linearGradient id={`stage-ground-${stageCode}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#203247" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0a1323" stopOpacity="0.92" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="320" height="140" fill={`url(#stage-scene-${stageCode})`} />
        <path d="M0 98 C54 80, 108 120, 160 102 C214 84, 270 120, 320 94 L320 140 L0 140 Z" fill={`url(#stage-ground-${stageCode})`} />
        {renderSceneObject(scene)}
      </svg>
    </div>
  );
}
