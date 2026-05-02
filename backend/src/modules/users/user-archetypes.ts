import { randomInt } from "node:crypto";

export type UserArchetype = {
  key: string;
  name: string;
  imageUrl: string;
};

export const userArchetypes: UserArchetype[] = [
  { key: "ember_knight", name: "Ember Knight", imageUrl: "/archetypes/ember_knight.png" },
  { key: "nova_warden", name: "Nova Warden", imageUrl: "/archetypes/nova_warden.png" },
  { key: "thorn_ranger", name: "Thorn Ranger", imageUrl: "/archetypes/thorn_ranger.png" },
  { key: "frost_sentinel", name: "Frost Sentinel", imageUrl: "/archetypes/frost_sentinel.png" },
  { key: "iron_vanguard", name: "Iron Vanguard", imageUrl: "/archetypes/iron_vanguard.png" },
  { key: "luna_blade", name: "Luna Blade", imageUrl: "/archetypes/luna_blade.png" },
  { key: "aurora_sage", name: "Aurora Sage", imageUrl: "/archetypes/aurora_sage.png" },
  { key: "ivy_striker", name: "Ivy Striker", imageUrl: "/archetypes/ivy_striker.png" },
  { key: "seraph_huntress", name: "Seraph Huntress", imageUrl: "/archetypes/seraph_huntress.png" },
  { key: "dawn_oracle", name: "Dawn Oracle", imageUrl: "/archetypes/dawn_oracle.png" }
];

export function pickRandomArchetype() {
  return userArchetypes[randomInt(0, userArchetypes.length)];
}

export function findArchetypeByKey(key: string | undefined | null) {
  if (!key) return null;
  return userArchetypes.find((item) => item.key === key) ?? null;
}
