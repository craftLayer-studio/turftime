import { describe, expect, it } from "vitest";
import { isRepeat, tagPlayer } from "./crm";

const DAY = 86_400_000;

describe("player tags", () => {
  it("tags by visits, recency, no-shows and spend", () => {
    const now = 100 * DAY;
    expect(tagPlayer({ visits: 1, noShows: 0, spendPaise: 0, lastVisitAt: now }, now)).toEqual(["new"]);
    expect(tagPlayer({ visits: 4, noShows: 0, spendPaise: 0, lastVisitAt: now }, now)).toEqual(["regular"]);
    expect(tagPlayer({ visits: 9, noShows: 2, spendPaise: 1_200_000, lastVisitAt: now - 40 * DAY }, now)).toEqual([
      "loyal",
      "lapsed",
      "no_show_risk",
      "high_value",
    ]);
    expect(isRepeat({ visits: 2, noShows: 0, spendPaise: 0, lastVisitAt: null })).toBe(true);
  });
});
