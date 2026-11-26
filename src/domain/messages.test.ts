import { describe, expect, it } from "vitest";
import { confirmationText, offerText, reminderAt, REMINDER_LEAD_MS } from "./messages";
import { istToEpoch } from "./time";

const startsAt = istToEpoch("2026-11-25", 1200);

describe("WhatsApp messages", () => {
  it("writes a confirmation with balance due", () => {
    const text = confirmationText({ venueName: "Demo Arena", resourceName: "Box 1", startsAt, playerName: "Karthik", totalPaise: 140000, paidPaise: 42000, link: "https://x/p/abc" });
    expect(text).toContain("Wed 25 Nov, 8:00 pm");
    expect(text).toContain("balance ₹980 at the venue");
  });

  it("schedules a reminder 3 hours before, unless too late", () => {
    expect(reminderAt(startsAt, startsAt - 5 * 3_600_000)).toBe(startsAt - REMINDER_LEAD_MS);
    expect(reminderAt(startsAt, startsAt - 3_600_000)).toBeNull();
  });

  it("puts an opt-out link on offers", () => {
    expect(offerText({ venueName: "V", resourceName: "Box 1", startsAt, pricePaise: 52500, wasPaise: 70000, link: "L", optOutLink: "O" })).toContain("Stop offers: O");
  });
});
