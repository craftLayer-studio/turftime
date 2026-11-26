import { describe, expect, it } from "vitest";
import { fillableSlots, offerPrice, selectAudience } from "./fill";
import type { GridSlot } from "./slots";

const DAY = 86_400_000;

describe("fill offers", () => {
  it("offers only open slots at least an hour ahead", () => {
    const now = 1_000_000_000;
    const slot = (startsAt: number, state: GridSlot["state"]): GridSlot => ({ startMin: 0, endMin: 60, startsAt, state, pricePaise: 100000, priceKind: "standard" });
    const out = fillableSlots([slot(now + 30 * 60_000, "open"), slot(now + 2 * 3_600_000, "open"), slot(now + 2 * 3_600_000, "booked")], now);
    expect(out).toHaveLength(1);
  });

  it("discounts to a whole rupee within limits", () => {
    expect(offerPrice(70000, 25)).toBe(52500);
    expect(offerPrice(99999, 10)).toBe(89900);
    expect(() => offerPrice(70000, 80)).toThrow();
  });

  it("targets opted-in players outside the cooldown, closest play time first", () => {
    const now = 10 * DAY;
    const ids = selectAudience(
      [
        { playerId: "a", marketingOptIn: true, lastMarketingAt: null, playedMinutes: [1200] },
        { playerId: "b", marketingOptIn: true, lastMarketingAt: null, playedMinutes: [840, 1260] },
        { playerId: "c", marketingOptIn: false, lastMarketingAt: null, playedMinutes: [840] },
        { playerId: "d", marketingOptIn: true, lastMarketingAt: now - DAY, playedMinutes: [840] },
        { playerId: "e", marketingOptIn: true, lastMarketingAt: now - 4 * DAY, playedMinutes: [] },
      ],
      840,
      now,
    );
    expect(ids).toEqual(["b", "a", "e"]);
    expect(selectAudience([{ playerId: "a", marketingOptIn: true, lastMarketingAt: null, playedMinutes: [] }], 840, now, 0)).toEqual([]);
  });
});
