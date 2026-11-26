import { describe, expect, it } from "vitest";
import { priceForSlot, validatePriceRule, type PriceRule } from "./pricing";

const pitch = { id: "r1", basePricePaise: 100000 };
const rules: PriceRule[] = [
  { id: "peak", resourceId: null, kind: "peak", days: [1, 2, 3, 4, 5], startMin: 1080, endMin: 1380, onDate: null, pricePaise: 140000, priority: 10 },
  { id: "off", resourceId: null, kind: "offpeak", days: [1, 2, 3, 4, 5], startMin: 360, endMin: 960, onDate: null, pricePaise: 70000, priority: 10 },
  { id: "wknd", resourceId: null, kind: "weekend", days: [0, 6], startMin: 0, endMin: 1440, onDate: null, pricePaise: 160000, priority: 20 },
  { id: "hol", resourceId: null, kind: "holiday", days: [], startMin: 0, endMin: 1440, onDate: "2026-12-25", pricePaise: 180000, priority: 30 },
  { id: "court", resourceId: "r2", kind: "peak", days: [], startMin: 1080, endMin: 1320, onDate: null, pricePaise: 60000, priority: 40 },
];

describe("price rules", () => {
  it("uses peak and off-peak on weekdays", () => {
    expect(priceForSlot(pitch, rules, "2026-11-25", 1140)).toMatchObject({ pricePaise: 140000, kind: "peak" });
    expect(priceForSlot(pitch, rules, "2026-11-25", 600)).toMatchObject({ pricePaise: 70000, kind: "offpeak" });
  });

  it("falls back to the base price between windows", () => {
    expect(priceForSlot(pitch, rules, "2026-11-25", 960)).toEqual({ pricePaise: 100000, kind: "standard", ruleId: null });
  });

  it("lets higher priority rules win (weekend, holiday)", () => {
    expect(priceForSlot(pitch, rules, "2026-11-28", 1140).kind).toBe("weekend");
    expect(priceForSlot(pitch, rules, "2026-12-25", 600).kind).toBe("holiday");
  });

  it("applies resource-specific rules only to that resource", () => {
    expect(priceForSlot({ id: "r2", basePricePaise: 40000 }, rules, "2026-11-25", 1140).pricePaise).toBe(60000);
    expect(priceForSlot(pitch, rules, "2026-11-25", 1140).ruleId).toBe("peak");
  });

  it("validates rules", () => {
    expect(validatePriceRule({ resourceId: null, kind: "peak", days: [7], startMin: 900, endMin: 800, onDate: null, pricePaise: -1, priority: 1 })).toHaveLength(3);
    expect(validatePriceRule({ resourceId: null, kind: "peak", days: [1], startMin: 800, endMin: 900, onDate: null, pricePaise: 100, priority: 1 })).toEqual([]);
  });
});
