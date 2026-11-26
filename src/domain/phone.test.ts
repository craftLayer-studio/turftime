import { describe, expect, it } from "vitest";
import { formatPhone, maskPhone, normalizeIndianPhone, waMeLink } from "./phone";

describe("Indian phone numbers", () => {
  it("normalises common formats to E.164", () => {
    for (const input of ["98765 43210", "098765-43210", "+91 98765 43210", "919876543210", "(98765) 43210"]) {
      expect(normalizeIndianPhone(input)).toBe("+919876543210");
    }
  });

  it("rejects non-mobile and foreign numbers", () => {
    expect(normalizeIndianPhone("12345 67890")).toBeNull();
    expect(normalizeIndianPhone("+1 415 555 0100")).toBeNull();
    expect(normalizeIndianPhone("98765")).toBeNull();
  });

  it("formats, masks and links", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
    expect(maskPhone("+919876543210")).toBe("+91 98xxx xx210");
    expect(waMeLink("+919876543210", "Hi there")).toBe("https://wa.me/919876543210?text=Hi%20there");
  });
});
