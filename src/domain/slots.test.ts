import { describe, expect, it } from "vitest";
import { buildSlotGrid, consecutiveSlots, priceForRange, slotStarts, type ResourceHours } from "./slots";
import { istToEpoch } from "./time";
import type { PriceRule } from "./pricing";

const pitch: ResourceHours = { id: "r1", slotMinutes: 60, openMin: 360, closeMin: 1440, basePricePaise: 100000 };
const peak: PriceRule = { id: "p", resourceId: null, kind: "peak", days: [], startMin: 1080, endMin: 1440, onDate: null, pricePaise: 140000, priority: 1 };

describe("slot generation", () => {
  it("generates aligned slots that end by closing", () => {
    expect(slotStarts(pitch)).toHaveLength(18);
    expect(slotStarts({ slotMinutes: 90, openMin: 360, closeMin: 600 })).toEqual([360, 450]);
  });

  it("marks held, booked, blocked and past slots", () => {
    const now = istToEpoch("2026-11-25", 9 * 60 + 15);
    const grid = buildSlotGrid({
      resource: pitch,
      rules: [peak],
      dateKey: "2026-11-25",
      now,
      claims: [
        { startsAt: istToEpoch("2026-11-25", 1080), bookingStatus: "confirmed", source: "online" },
        { startsAt: istToEpoch("2026-11-25", 1140), bookingStatus: "held", source: "online" },
        { startsAt: istToEpoch("2026-11-25", 1200), bookingStatus: "confirmed", source: "marketplace" },
      ],
    });
    const at = (m: number) => grid.find((s) => s.startMin === m)!;
    expect(at(360).state).toBe("past");
    expect(at(540).state).toBe("past");
    expect(at(600).state).toBe("open");
    expect(at(1080)).toMatchObject({ state: "booked", pricePaise: 140000, priceKind: "peak" });
    expect(at(1140).state).toBe("held");
    expect(at(1200).state).toBe("blocked");
  });

  it("finds consecutive slots and prices the range", () => {
    expect(consecutiveSlots(pitch, 1020, 2)).toEqual([1020, 1080]);
    expect(consecutiveSlots(pitch, 1380, 2)).toBeNull();
    expect(consecutiveSlots(pitch, 1025, 1)).toBeNull();
    expect(priceForRange(pitch, [peak], "2026-11-25", [1020, 1080])).toBe(240000);
  });
});
