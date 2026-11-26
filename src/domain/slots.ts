import type { Paise } from "./money";
import { priceForSlot, type PriceKind, type PriceRule } from "./pricing";
import { istToEpoch } from "./time";

export interface ResourceHours {
  id: string;
  slotMinutes: number;
  /** Opening and closing minute of day. closeMin may be 1440 (midnight). */
  openMin: number;
  closeMin: number;
  basePricePaise: Paise;
}

export const SLOT_LENGTHS = [30, 60, 90] as const;

/** Start minutes of every slot in a day, aligned to opening time. A slot must end by closing. */
export function slotStarts(resource: Pick<ResourceHours, "slotMinutes" | "openMin" | "closeMin">): number[] {
  const out: number[] = [];
  if (resource.slotMinutes <= 0) return out;
  for (let m = resource.openMin; m + resource.slotMinutes <= resource.closeMin; m += resource.slotMinutes) out.push(m);
  return out;
}

export function isSlotStart(resource: Pick<ResourceHours, "slotMinutes" | "openMin" | "closeMin">, minute: number): boolean {
  return slotStarts(resource).includes(minute);
}

export type SlotState = "open" | "held" | "booked" | "blocked" | "past";

/** A slot claim as seen by the grid (one row per slot occupied by a booking or hold). */
export interface SlotClaimView {
  startsAt: number;
  bookingStatus: string;
  source: string;
}

export interface GridSlot {
  startMin: number;
  endMin: number;
  startsAt: number;
  state: SlotState;
  pricePaise: Paise;
  priceKind: PriceKind | "standard";
}

/**
 * Build the slot grid for one resource on one venue-local date.
 * Claims come from the database; the grid only renders them. Slots that started already are "past".
 */
export function buildSlotGrid(params: {
  resource: ResourceHours;
  rules: readonly PriceRule[];
  dateKey: string;
  now: number;
  claims: readonly SlotClaimView[];
}): GridSlot[] {
  const { resource, rules, dateKey, now, claims } = params;
  const byStart = new Map(claims.map((c) => [c.startsAt, c]));
  return slotStarts(resource).map((startMin) => {
    const startsAt = istToEpoch(dateKey, startMin);
    const price = priceForSlot(resource, rules, dateKey, startMin);
    const claim = byStart.get(startsAt);
    let state: SlotState = "open";
    if (claim) {
      if (claim.source === "marketplace" || claim.source === "block") state = "blocked";
      else state = claim.bookingStatus === "held" ? "held" : "booked";
    } else if (startsAt <= now) {
      state = "past";
    }
    return { startMin, endMin: startMin + resource.slotMinutes, startsAt, state, pricePaise: price.pricePaise, priceKind: price.kind };
  });
}

/** Consecutive slot starts for a booking of `count` slots from `startMin`, or null when it runs past closing or off-grid. */
export function consecutiveSlots(resource: ResourceHours, startMin: number, count: number): number[] | null {
  if (!Number.isInteger(count) || count < 1 || count > 6) return null;
  const starts = slotStarts(resource);
  const first = starts.indexOf(startMin);
  if (first < 0 || first + count > starts.length) return null;
  return starts.slice(first, first + count);
}

/** Total price of consecutive slots on a date. */
export function priceForRange(resource: ResourceHours, rules: readonly PriceRule[], dateKey: string, starts: readonly number[]): Paise {
  return starts.reduce((sum, m) => sum + priceForSlot(resource, rules, dateKey, m).pricePaise, 0);
}
