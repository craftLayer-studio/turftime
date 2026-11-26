import { describe, expect, it } from "vitest";
import { advanceCovered, splitAmount, topUpNeeded } from "./split";

describe("split payment", () => {
  it("splits into shares that add up exactly", () => {
    expect(splitAmount(140000, 10)).toEqual(Array(10).fill(14000));
    const odd = splitAmount(100050, 7);
    expect(odd.reduce((a, b) => a + b, 0)).toBe(100050);
    expect(odd[0]).toBe(14350);
    expect(odd[6]).toBe(14200);
  });

  it("rejects silly split sizes", () => {
    expect(() => splitAmount(1000, 1)).toThrow();
    expect(() => splitAmount(1000, 23)).toThrow();
  });

  it("confirms once the advance is covered", () => {
    expect(advanceCovered(41999, 42000)).toBe(false);
    expect(advanceCovered(42000, 42000)).toBe(true);
    expect(topUpNeeded(28000, 42000)).toBe(14000);
    expect(topUpNeeded(50000, 42000)).toBe(0);
  });
});
