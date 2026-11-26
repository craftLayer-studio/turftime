import { describe, expect, it } from "vitest";
import { summarise, utilisationHeatmap, type ReportBooking } from "./report";
import { istToEpoch } from "./time";

const H = 3_600_000;
const b = (date: string, min: number, status: ReportBooking["status"], extra: Partial<ReportBooking> = {}): ReportBooking => ({
  resourceId: "r1",
  startsAt: istToEpoch(date, min),
  endsAt: istToEpoch(date, min) + H,
  status,
  source: "online",
  totalPaise: 100000,
  offerId: null,
  ...extra,
});

describe("owner reports", () => {
  it("builds a utilisation heatmap by weekday and hour", () => {
    const resources = [
      { id: "r1", openMin: 360, closeMin: 1440 },
      { id: "r2", openMin: 360, closeMin: 1440 },
    ];
    const map = utilisationHeatmap(resources, [b("2026-11-25", 1200, "confirmed"), b("2026-11-25", 1200, "cancelled"), b("2026-11-25", 1260, "completed", { resourceId: "r2" })], "2026-11-23", "2026-11-29");
    expect(map.hours[0]).toBe(360);
    expect(map.hours).toHaveLength(18);
    const wed = map.rows[3];
    expect(wed[map.hours.indexOf(1200)]).toBe(0.5);
    expect(wed[map.hours.indexOf(1260)]).toBe(0.5);
    expect(wed[0]).toBe(0);
  });

  it("summarises revenue, advance vs balance, no-shows and fill offers", () => {
    const from = istToEpoch("2026-11-25", 0);
    const to = from + 24 * H;
    const s = summarise(
      [b("2026-11-25", 1200, "completed"), b("2026-11-25", 1260, "no_show"), b("2026-11-25", 840, "confirmed", { offerId: "o1", totalPaise: 52500 }), b("2026-11-25", 900, "confirmed", { source: "marketplace" })],
      [
        { kind: "advance", amountPaise: 30000, at: from + H },
        { kind: "share", amountPaise: 14000, at: from + H },
        { kind: "balance", amountPaise: 70000, at: from + 2 * H },
        { kind: "refund", amountPaise: 10000, at: from + 3 * H },
      ],
      from,
      to,
    );
    expect(s.collectedPaise).toBe(104000);
    expect(s.advancePaise).toBe(44000);
    expect(s.balancePaise).toBe(70000);
    expect(s.noShows).toBe(1);
    expect(s.noShowRate).toBe(0.5);
    expect(s.bookings).toBe(3);
    expect(s.fillOfferRevenuePaise).toBe(52500);
    expect(s.bySource).toEqual({ online: 3, marketplace: 1 });
  });
});
