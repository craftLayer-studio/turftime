import type { Paise } from "./money";
import type { GridSlot } from "./slots";

export const MIN_DISCOUNT = 5;
export const MAX_DISCOUNT = 50;
/** Frequency cap: at most one marketing message per player in this many days. */
export const MARKETING_COOLDOWN_DAYS = 3;
/** Offers go out only for slots at least this far ahead, so players have time to come. */
export const MIN_LEAD_MINUTES = 60;

/** Open slots far enough ahead to be worth offering. */
export function fillableSlots(grid: readonly GridSlot[], now: number): GridSlot[] {
  return grid.filter((s) => s.state === "open" && s.startsAt - now >= MIN_LEAD_MINUTES * 60_000);
}

/** Discounted price, rounded down to a whole rupee. */
export function offerPrice(price: Paise, discountPercent: number): Paise {
  if (!Number.isInteger(discountPercent) || discountPercent < MIN_DISCOUNT || discountPercent > MAX_DISCOUNT) {
    throw new Error(`Discount must be ${MIN_DISCOUNT}% to ${MAX_DISCOUNT}%`);
  }
  return Math.floor((price * (100 - discountPercent)) / 100 / 100) * 100;
}

export interface AudienceCandidate {
  playerId: string;
  marketingOptIn: boolean;
  /** Last marketing message sent to this player, or null. */
  lastMarketingAt: number | null;
  /** Venue-local start minutes of past bookings, to match players who play at similar times. */
  playedMinutes: readonly number[];
}

/**
 * Pick who gets a fill offer: only players who opted in to marketing, outside the cooldown,
 * nearest first by how close their usual play time is to the slot. Capped at `limit`.
 */
export function selectAudience(candidates: readonly AudienceCandidate[], slotStartMin: number, now: number, limit = 50): string[] {
  const cooldownMs = MARKETING_COOLDOWN_DAYS * 86_400_000;
  return candidates
    .filter((c) => c.marketingOptIn && (c.lastMarketingAt === null || now - c.lastMarketingAt >= cooldownMs))
    .map((c) => ({
      id: c.playerId,
      distance: c.playedMinutes.length === 0 ? 24 * 60 : Math.min(...c.playedMinutes.map((m) => Math.abs(m - slotStartMin))),
    }))
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit))
    .map((c) => c.id);
}
