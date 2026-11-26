import { assertPaise, type Paise } from "./money";

export const BOOKING_STATUSES = ["held", "confirmed", "completed", "no_show", "cancelled", "expired"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Where a booking came from. "marketplace" and "block" are staff blocks with no player money through TurfTime. */
export const BOOKING_SOURCES = ["online", "phone", "walkin", "marketplace", "block"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const SOURCE_LABEL: Record<BookingSource, string> = {
  online: "Online",
  phone: "Phone",
  walkin: "Walk-in",
  marketplace: "Marketplace",
  block: "Blocked",
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  held: "Held",
  confirmed: "Confirmed",
  completed: "Played",
  no_show: "No-show",
  cancelled: "Cancelled",
  expired: "Hold expired",
};

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  held: ["confirmed", "expired", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  completed: [],
  no_show: [],
  cancelled: [],
  expired: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus,
  ) {
    super(`Cannot change a ${STATUS_LABEL[from].toLowerCase()} booking to ${STATUS_LABEL[to].toLowerCase()}`);
    this.name = "InvalidTransitionError";
  }
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** Statuses that keep the slot occupied. Cancelled and expired bookings release their slots. */
export function occupiesSlot(status: BookingStatus): boolean {
  return status === "held" || status === "confirmed" || status === "completed" || status === "no_show";
}

export interface AdvancePolicy {
  /** Percent of the total collected online to confirm (0-100). */
  advancePercent: number;
  /** Floor for the advance, in paise. Capped at the total. */
  minAdvancePaise: Paise;
}

/** Advance due online, rounded up to a whole rupee and never above the total. */
export function computeAdvance(total: Paise, policy: AdvancePolicy): Paise {
  assertPaise(total, "total");
  if (total === 0) return 0;
  const pct = Math.min(100, Math.max(0, policy.advancePercent));
  const byPercent = Math.ceil((total * pct) / 100 / 100) * 100;
  return Math.min(total, Math.max(byPercent, policy.minAdvancePaise));
}

/** Hold expiry for a new hold. Split-pay holds get longer so friends can pay. */
export function holdExpiresAt(now: number, holdMinutes: number, split: boolean, splitHoldMinutes = 30): number {
  return now + (split ? Math.max(holdMinutes, splitHoldMinutes) : holdMinutes) * 60_000;
}

export function isHoldExpired(booking: { status: BookingStatus; holdExpiresAt: number | null }, now: number): boolean {
  return booking.status === "held" && booking.holdExpiresAt !== null && booking.holdExpiresAt <= now;
}

/**
 * Cancellation refund (venue policy, defaults from AGENTS.md):
 * full refund 24 h or more before start, 50% from 4 h to 24 h, nothing within 4 h.
 */
export interface CancellationPolicy {
  fullRefundHours: number;
  halfRefundHours: number;
}

export const DEFAULT_CANCELLATION: CancellationPolicy = { fullRefundHours: 24, halfRefundHours: 4 };

export function refundOnCancel(paid: Paise, startsAt: number, now: number, policy: CancellationPolicy = DEFAULT_CANCELLATION): Paise {
  assertPaise(paid, "paid");
  const hoursBefore = (startsAt - now) / 3_600_000;
  if (hoursBefore >= policy.fullRefundHours) return paid;
  if (hoursBefore >= policy.halfRefundHours) return Math.floor(paid / 2 / 100) * 100;
  return 0;
}

/** Balance still owed at the venue. */
export function balanceDue(b: { totalPaise: Paise; paidPaise: Paise }): Paise {
  return Math.max(0, b.totalPaise - b.paidPaise);
}
