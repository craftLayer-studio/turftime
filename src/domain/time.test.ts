import { describe, expect, it } from "vitest";
import { addDays, dayOfWeek, daysBetween, formatDateKey, formatMinute, isDateKey, istDateKey, istMinuteOfDay, istToEpoch } from "./time";

describe("IST time helpers", () => {
  it("round-trips venue-local date and minute", () => {
    const at = istToEpoch("2026-11-25", 18 * 60 + 30);
    expect(new Date(at).toISOString()).toBe("2026-11-25T13:00:00.000Z");
    expect(istDateKey(at)).toBe("2026-11-25");
    expect(istMinuteOfDay(at)).toBe(1110);
  });

  it("handles the UTC/IST date boundary", () => {
    const at = Date.parse("2026-11-24T19:00:00Z"); // 00:30 IST on the 25th
    expect(istDateKey(at)).toBe("2026-11-25");
    expect(istMinuteOfDay(at)).toBe(30);
  });

  it("validates and shifts date keys", () => {
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-11-25")).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-11-25", "2026-12-02")).toBe(7);
    expect(dayOfWeek("2026-11-25")).toBe(3);
  });

  it("formats times and dates for India", () => {
    expect(formatMinute(0)).toBe("12:00 am");
    expect(formatMinute(1080)).toBe("6:00 pm");
    expect(formatMinute(750)).toBe("12:30 pm");
    expect(formatDateKey("2026-11-25")).toBe("Wed 25 Nov");
  });
});
