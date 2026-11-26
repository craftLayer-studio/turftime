import type { Paise } from "./money";

export const PLAYER_TAGS = ["new", "regular", "loyal", "lapsed", "no_show_risk", "high_value"] as const;
export type PlayerTag = (typeof PLAYER_TAGS)[number];

export const TAG_LABEL: Record<PlayerTag, string> = {
  new: "New",
  regular: "Regular",
  loyal: "Loyal",
  lapsed: "Lapsed",
  no_show_risk: "No-show risk",
  high_value: "High value",
};

export interface PlayerStats {
  visits: number;
  noShows: number;
  spendPaise: Paise;
  lastVisitAt: number | null;
}

const DAY_MS = 86_400_000;

/** Tags for the repeat-player CRM, derived from visit history (never stored). */
export function tagPlayer(stats: PlayerStats, now: number): PlayerTag[] {
  const tags: PlayerTag[] = [];
  if (stats.visits >= 8) tags.push("loyal");
  else if (stats.visits >= 3) tags.push("regular");
  else if (stats.visits <= 1) tags.push("new");
  if (stats.lastVisitAt !== null && now - stats.lastVisitAt > 30 * DAY_MS && stats.visits >= 2) tags.push("lapsed");
  if (stats.noShows >= 2) tags.push("no_show_risk");
  if (stats.spendPaise >= 1_000_000) tags.push("high_value");
  return tags;
}

export function isRepeat(stats: PlayerStats): boolean {
  return stats.visits >= 2;
}
