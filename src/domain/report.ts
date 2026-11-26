import type { Paise } from "./money";
import { addDays, dayOfWeek, istDateKey, istMinuteOfDay } from "./time";
import type { BookingSource, BookingStatus } from "./booking";

export interface ReportBooking {
  resourceId: string;
  startsAt: number;
  endsAt: number;
  status: BookingStatus;
  source: BookingSource;
  totalPaise: Paise;
  offerId: string | null;
}

export interface ReportPayment {
  kind: "advance" | "share" | "balance" | "refund";
  amountPaise: Paise;
  at: number;
}

export interface ReportResource {
  id: string;
  openMin: number;
  closeMin: number;
}

export interface Heatmap {
  /** Hours shown, as start minute of each hour column (e.g. 360 = 6 am). */
  hours: number[];
  /** rows[dow][hourIndex] = fraction 0..1 of court-hours booked; null where no resource is open. */
  rows: (number | null)[][];
}

function playable(status: BookingStatus): boolean {
  return status === "confirmed" || status === "completed" || status === "no_show";
}

/**
 * Utilisation heatmap by day of week and hour, over the dates [fromKey, toKey] inclusive.
 * Counts booked minutes (confirmed, played or no-show, including blocks) against open minutes per hour cell.
 */
export function utilisationHeatmap(resources: readonly ReportResource[], bookings: readonly ReportBooking[], fromKey: string, toKey: string): Heatmap {
  const minOpen = Math.min(...resources.map((r) => r.openMin));
  const maxClose = Math.max(...resources.map((r) => r.closeMin));
  const hours: number[] = [];
  for (let h = Math.floor(minOpen / 60) * 60; h < maxClose; h += 60) hours.push(h);
  const open = Array.from({ length: 7 }, () => hours.map(() => 0));
  const booked = Array.from({ length: 7 }, () => hours.map(() => 0));

  for (let d = fromKey; d <= toKey; d = addDays(d, 1)) {
    const dow = dayOfWeek(d);
    hours.forEach((h, i) => {
      for (const r of resources) {
        const overlap = Math.max(0, Math.min(h + 60, r.closeMin) - Math.max(h, r.openMin));
        open[dow][i] += overlap;
      }
    });
  }
  for (const b of bookings) {
    if (!playable(b.status)) continue;
    const key = istDateKey(b.startsAt);
    if (key < fromKey || key > toKey) continue;
    const dow = dayOfWeek(key);
    const start = istMinuteOfDay(b.startsAt);
    const end = start + Math.round((b.endsAt - b.startsAt) / 60_000);
    hours.forEach((h, i) => {
      booked[dow][i] += Math.max(0, Math.min(h + 60, end) - Math.max(h, start));
    });
  }
  const rows = open.map((row, dow) => row.map((mins, i) => (mins === 0 ? null : Math.min(1, booked[dow][i] / mins))));
  return { hours, rows };
}

export type RevenueSummary = {
  collectedPaise: Paise;
  advancePaise: Paise;
  balancePaise: Paise;
  refundedPaise: Paise;
  bookings: number;
  noShows: number;
  /** No-shows as a share of bookings that should have been played (0..1). */
  noShowRate: number;
  fillOfferBookings: number;
  fillOfferRevenuePaise: Paise;
  bySource: Record<string, number>;
};

/** Money and booking counts for bookings starting in [from, to). Payments are counted by payment time in the same window. */
export function summarise(bookings: readonly ReportBooking[], payments: readonly ReportPayment[], from: number, to: number): RevenueSummary {
  const inRange = bookings.filter((b) => b.startsAt >= from && b.startsAt < to);
  const pays = payments.filter((p) => p.at >= from && p.at < to);
  const sum = (kinds: ReportPayment["kind"][]) => pays.filter((p) => kinds.includes(p.kind)).reduce((s, p) => s + p.amountPaise, 0);
  const advancePaise = sum(["advance", "share"]);
  const balancePaise = sum(["balance"]);
  const refundedPaise = sum(["refund"]);
  const played = inRange.filter((b) => b.status === "completed" || b.status === "no_show");
  const noShows = inRange.filter((b) => b.status === "no_show").length;
  const counted = inRange.filter((b) => playable(b.status) && b.source !== "block" && b.source !== "marketplace");
  const offers = counted.filter((b) => b.offerId !== null);
  const bySource: Record<string, number> = {};
  for (const b of inRange.filter((x) => playable(x.status))) bySource[b.source] = (bySource[b.source] ?? 0) + 1;
  return {
    collectedPaise: advancePaise + balancePaise - refundedPaise,
    advancePaise,
    balancePaise,
    refundedPaise,
    bookings: counted.length,
    noShows,
    noShowRate: played.length === 0 ? 0 : noShows / played.length,
    fillOfferBookings: offers.length,
    fillOfferRevenuePaise: offers.reduce((s, b) => s + b.totalPaise, 0),
    bySource,
  };
}
