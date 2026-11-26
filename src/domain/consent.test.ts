import { describe, expect, it } from "vitest";
import { currentConsent } from "./consent";

describe("consent", () => {
  it("defaults to no consent", () => {
    expect(currentConsent([])).toEqual({ service_updates: false, marketing: false });
  });

  it("uses the latest record per purpose", () => {
    expect(
      currentConsent([
        { purpose: "marketing", granted: true, at: 1 },
        { purpose: "service_updates", granted: true, at: 1 },
        { purpose: "marketing", granted: false, at: 5 },
      ]),
    ).toEqual({ service_updates: true, marketing: false });
  });
});
