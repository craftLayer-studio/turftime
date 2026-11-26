import { describe, expect, it } from "vitest";
import { assertTransition, balanceDue, canTransition, computeAdvance, holdExpiresAt, isHoldExpired, occupiesSlot, refundOnCancel } from "./booking";

describe("booking rules", () => {
  it("allows only valid status changes", () => {
    expect(canTransition("held", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "no_show")).toBe(true);
    expect(canTransition("expired", "confirmed")).toBe(false);
    expect(() => assertTransition("completed", "cancelled")).toThrow(/Cannot change/);
  });

  it("knows which statuses occupy a slot", () => {
    expect(occupiesSlot("held")).toBe(true);
    expect(occupiesSlot("no_show")).toBe(true);
    expect(occupiesSlot("cancelled")).toBe(false);
    expect(occupiesSlot("expired")).toBe(false);
  });

  it("computes the advance in whole rupees within the total", () => {
    expect(computeAdvance(140000, { advancePercent: 30, minAdvancePaise: 30000 })).toBe(42000);
    expect(computeAdvance(70000, { advancePercent: 30, minAdvancePaise: 30000 })).toBe(30000);
    expect(computeAdvance(20000, { advancePercent: 30, minAdvancePaise: 30000 })).toBe(20000);
    expect(computeAdvance(133350, { advancePercent: 25, minAdvancePaise: 0 })).toBe(33400);
    expect(computeAdvance(0, { advancePercent: 30, minAdvancePaise: 30000 })).toBe(0);
  });

  it("expires holds", () => {
    const now = 1_000_000;
    const exp = holdExpiresAt(now, 7, false);
    expect(exp - now).toBe(7 * 60_000);
    expect(holdExpiresAt(now, 7, true) - now).toBe(30 * 60_000);
    expect(isHoldExpired({ status: "held", holdExpiresAt: exp }, exp)).toBe(true);
    expect(isHoldExpired({ status: "confirmed", holdExpiresAt: exp }, exp + 1)).toBe(false);
  });

  it("refunds by the cancellation policy", () => {
    const start = 100 * 3_600_000;
    expect(refundOnCancel(42000, start, start - 25 * 3_600_000)).toBe(42000);
    expect(refundOnCancel(42000, start, start - 5 * 3_600_000)).toBe(21000);
    expect(refundOnCancel(42100, start, start - 5 * 3_600_000)).toBe(21000);
    expect(refundOnCancel(42000, start, start - 3_600_000)).toBe(0);
  });

  it("computes balance due", () => {
    expect(balanceDue({ totalPaise: 140000, paidPaise: 42000 })).toBe(98000);
    expect(balanceDue({ totalPaise: 100, paidPaise: 200 })).toBe(0);
  });
});
