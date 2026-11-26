import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db/client";
import { outbox, players } from "../db/schema";
import { requestOtp, verifyOtp } from "./auth";
import { dispatchDue } from "./messaging";
import { fillCandidates, sendFillOffer } from "./offers";
import { listCrm, optOutByToken } from "./players";
import { dashboard } from "./reports";
import { addPriceRule, updateVenueSettings } from "./settings";
import { NOW, OWNER, STAFF, demoDb } from "./test-utils";

let db: Db;

beforeAll(async () => {
  ({ db } = await demoDb());
});

describe("owner dashboard and CRM", () => {
  it("reports utilisation, revenue and no-shows from seeded history", async () => {
    const d = await dashboard(db, "org_demo", NOW);
    expect(d.heatmap.rows).toHaveLength(7);
    expect(d.last28.collectedPaise).toBeGreaterThan(0);
    expect(d.last28.noShows).toBeGreaterThan(0);
    expect(d.overallUtilisation).toBeGreaterThan(0.1);
    expect(d.overallUtilisation).toBeLessThan(0.9);
  });

  it("tags repeat players and shows consent", async () => {
    const crm = await listCrm(db, "org_demo", NOW);
    expect(crm[0].visits).toBeGreaterThanOrEqual(3);
    expect(crm[0].tags.some((t) => t === "regular" || t === "loyal")).toBe(true);
    expect(crm.some((p) => !p.consent.marketing)).toBe(true);
  });
});

describe("fill offers", () => {
  it("sends only to opted-in players and respects opt-out and cooldown", async () => {
    const [p] = await db.select().from(players).where(eq(players.id, "pl_demo_01"));
    await optOutByToken(db, p.optOutToken, ["marketing"], NOW);
    const slots = await fillCandidates(db, "org_demo", NOW);
    expect(slots.length).toBeGreaterThan(0);
    const s = slots[0];
    await expect(sendFillOffer(db, STAFF, { resourceId: s.resourceId, dateKey: s.dateKey, startMin: s.startMin, discountPercent: 20 }, NOW)).rejects.toThrow(/owner/);
    const { offerId, sent } = await sendFillOffer(db, OWNER, { resourceId: s.resourceId, dateKey: s.dateKey, startMin: s.startMin, discountPercent: 20, limit: 200 }, NOW);
    expect(sent).toBeGreaterThan(0);
    const msgs = await db.select().from(outbox).where(eq(outbox.offerId, offerId));
    expect(msgs.some((m) => m.playerId === "pl_demo_01")).toBe(false);
    expect(msgs.every((m) => m.body.includes("/optout/"))).toBe(true);
    const again = await sendFillOffer(db, OWNER, { resourceId: s.resourceId, dateKey: s.dateKey, startMin: s.startMin, discountPercent: 20, limit: 200 }, NOW);
    expect(again.sent).toBe(0);
  });

  it("dispatches due reminders through the simulated adapter", async () => {
    const result = await dispatchDue(db, "org_demo", NOW + 2 * 86_400_000);
    expect(result.sent + result.skipped).toBeGreaterThan(0);
  });
});

describe("auth and settings", () => {
  it("signs in staff with a demo OTP and rejects wrong codes", async () => {
    const { demoCode } = await requestOtp(db, "90000 00001", NOW);
    expect(demoCode).toMatch(/^\d{6}$/);
    await expect(verifyOtp(db, "9000000001", demoCode === "000000" ? "111111" : "000000", NOW)).rejects.toThrow(/Wrong/);
    await expect(verifyOtp(db, "9000000001", demoCode!, NOW)).resolves.toMatchObject({ role: "owner" });
    const other = await requestOtp(db, "9123456789", NOW);
    await expect(verifyOtp(db, "9123456789", other.demoCode!, NOW)).rejects.toThrow(/not registered/);
  });

  it("only lets the owner change settings", async () => {
    await expect(updateVenueSettings(db, STAFF, { advancePercent: 50, minAdvancePaise: 0, holdMinutes: 7, upiVpa: "x@ok" })).rejects.toThrow(/owner/);
    await expect(addPriceRule(db, OWNER, { resourceId: null, kind: "peak", days: [9], startMin: 0, endMin: 10, onDate: null, pricePaise: 100, priority: 1 })).rejects.toThrow();
  });
});
