import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { istToEpoch } from "@/domain";
import type { Db } from "../db/client";
import { bookings, consentRecords, outbox, players, slotClaims } from "../db/schema";
import { bookingView, cancelByPlayer, collectBalance, completePayment, createHold, createStaffBooking, markPlayed, startCheckout } from "./bookings";
import { StoreError } from "./errors";
import { venueGrid } from "./venue";
import { LATER, NOW, OWNER, STAFF, demoDb, player } from "./test-utils";

let db: Db;
let venueToken: string;

beforeEach(async () => {
  ({ db, venueToken } = await demoDb());
});

const hold = (n: number, extra: Partial<Parameters<typeof createHold>[2]> = {}) =>
  createHold(db, venueToken, { resourceId: "res_cricket", dateKey: LATER, startMin: 20 * 60, slots: 1, splitCount: 1, ...player(n), ...extra }, NOW);

async function payAdvance(token: string, at = NOW + 60_000) {
  const co = await startCheckout(db, token, { purpose: "advance" }, at);
  return { co, result: await completePayment(db, co.ref, "success", at) };
}

describe("no double booking", () => {
  it("lets exactly one of many concurrent holds win the same slot", async () => {
    const attempts = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => hold(i)));
    const ok = attempts.filter((a) => a.status === "fulfilled");
    const failed = attempts.filter((a): a is PromiseRejectedResult => a.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(19);
    for (const f of failed) expect((f.reason as StoreError).status).toBe(409);
    const claims = await db.select().from(slotClaims).where(eq(slotClaims.startsAt, new Date(istToEpoch(LATER, 1200))));
    expect(claims.filter((c) => c.resourceId === "res_cricket")).toHaveLength(1);
  });

  it("blocks walk-in, online and marketplace bookings against each other on one calendar", async () => {
    const results = await Promise.allSettled([
      hold(1),
      createStaffBooking(db, STAFF, { resourceId: "res_cricket", dateKey: LATER, startMin: 1200, slots: 1, source: "walkin", ...player(2), payment: "cash" }, NOW),
      createStaffBooking(db, STAFF, { resourceId: "res_cricket", dateKey: LATER, startMin: 1140, slots: 2, source: "marketplace", consentService: false, consentMarketing: false, payment: "later" }, NOW),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("rejects a duplicate claim at the database level, bypassing the store", async () => {
    await hold(1);
    const [b] = await db.select().from(bookings).where(eq(bookings.status, "held"));
    await expect(db.insert(slotClaims).values({ orgId: b.orgId, resourceId: b.resourceId, startsAt: b.startsAt, bookingId: b.id })).rejects.toThrow();
  });

  it("frees the slot when a hold expires", async () => {
    await hold(1);
    await expect(hold(2)).rejects.toThrow(/just taken/);
    const later = NOW + 8 * 60_000;
    await expect(createHold(db, venueToken, { resourceId: "res_cricket", dateKey: LATER, startMin: 1200, slots: 1, splitCount: 1, ...player(3) }, later)).resolves.toBeTruthy();
  });
});

describe("online booking with advance", () => {
  it("holds, takes the advance through the simulated gateway, confirms and queues WhatsApp", async () => {
    const { bookingToken } = await hold(1);
    const v = await bookingView(db, bookingToken, NOW);
    expect(v.status).toBe("held");
    expect(v.totalPaise).toBe(140000);
    expect(v.advancePaise).toBe(42000);
    const { co, result } = await payAdvance(bookingToken);
    expect(co.amountPaise).toBe(42000);
    expect(co.upiUri).toContain("am=420.00");
    expect(result).toMatchObject({ status: "paid", bookingStatus: "confirmed" });
    const after = await bookingView(db, bookingToken, NOW);
    expect(after.balanceDuePaise).toBe(98000);
    const msgs = await db.select().from(outbox).where(eq(outbox.bookingId, (await db.select().from(bookings).where(eq(bookings.publicToken, bookingToken)))[0].id));
    expect(msgs.map((m) => `${m.template}:${m.status}`).sort()).toEqual(["confirmation:sent", "reminder:scheduled"]);
  });

  it("is idempotent on the gateway callback and never trusts client amounts", async () => {
    const { bookingToken } = await hold(1);
    const { co } = await payAdvance(bookingToken);
    await completePayment(db, co.ref, "success", NOW + 120_000);
    const v = await bookingView(db, bookingToken, NOW);
    expect(v.paidPaise).toBe(42000);
  });

  it("refunds a payment that lands after the hold expired", async () => {
    const { bookingToken } = await hold(1);
    const co = await startCheckout(db, bookingToken, { purpose: "advance" }, NOW);
    const result = await completePayment(db, co.ref, "success", NOW + 10 * 60_000);
    expect(result).toMatchObject({ status: "refunded", bookingStatus: "expired" });
  });

  it("records consent separately and skips messages without consent", async () => {
    const { bookingToken } = await hold(1, { consentService: false, consentMarketing: false });
    await payAdvance(bookingToken);
    const [p] = await db.select().from(players).where(eq(players.phone, "+919876543211"));
    expect(await db.select().from(consentRecords).where(eq(consentRecords.playerId, p.id))).toHaveLength(0);
    const msgs = await db.select().from(outbox).where(eq(outbox.playerId, p.id));
    expect(msgs.every((m) => m.status === "skipped")).toBe(true);
  });

  it("applies the cancellation policy", async () => {
    const { bookingToken } = await hold(1);
    await payAdvance(bookingToken);
    const { refundPaise } = await cancelByPlayer(db, bookingToken, NOW + 3600_000);
    expect(refundPaise).toBe(42000);
    const grid = await venueGrid(db, "org_demo", LATER, NOW);
    expect(grid[0].slots.find((s) => s.startMin === 1200)!.state).toBe("open");
  });
});

describe("split payment", () => {
  it("confirms once paid shares cover the advance", async () => {
    const { bookingToken } = await hold(1, { splitCount: 10 });
    const v = await bookingView(db, bookingToken, NOW);
    expect(v.shares).toHaveLength(10);
    expect(v.shares.reduce((a, s) => a + s.amountPaise, 0)).toBe(140000);
    for (const [i, s] of v.shares.slice(0, 3).entries()) {
      const co = await startCheckout(db, bookingToken, { purpose: "share", shareId: s.id, payer: i === 0 ? undefined : player(10 + i) }, NOW);
      const r = await completePayment(db, co.ref, "success", NOW);
      expect(r.bookingStatus).toBe(i < 2 ? "held" : "confirmed");
    }
    const friends = await db.select().from(players).where(and(eq(players.orgId, "org_demo"), eq(players.phone, "+919876543221")));
    expect(friends).toHaveLength(1);
  });

  it("lets the captain top up the rest of the advance", async () => {
    const { bookingToken } = await hold(1, { splitCount: 10 });
    const v = await bookingView(db, bookingToken, NOW);
    const s = await startCheckout(db, bookingToken, { purpose: "share", shareId: v.shares[0].id }, NOW);
    await completePayment(db, s.ref, "success", NOW);
    const top = await startCheckout(db, bookingToken, { purpose: "advance" }, NOW);
    expect(top.amountPaise).toBe(28000);
    expect((await completePayment(db, top.ref, "success", NOW)).bookingStatus).toBe("confirmed");
  });
});

describe("staff desk", () => {
  it("books a walk-in with cash, marks played and blocks the slot online", async () => {
    const { bookingId } = await createStaffBooking(db, STAFF, { resourceId: "res_badminton", dateKey: LATER, startMin: 600, slots: 2, source: "walkin", ...player(5), payment: "later" }, NOW);
    await expect(createHold(db, venueToken, { resourceId: "res_badminton", dateKey: LATER, startMin: 660, slots: 1, splitCount: 1, ...player(6) }, NOW)).rejects.toThrow(/just taken/);
    const at = istToEpoch(LATER, 600) + 30 * 60_000;
    expect((await collectBalance(db, STAFF, bookingId, "cash", at)).collectedPaise).toBe(80000);
    await markPlayed(db, STAFF, bookingId, "completed", at);
    await expect(markPlayed(db, STAFF, bookingId, "no_show", at)).rejects.toThrow();
  });

  it("enforces org isolation on staff actions", async () => {
    const { bookingId } = await createStaffBooking(db, STAFF, { resourceId: "res_cricket", dateKey: LATER, startMin: 600, slots: 1, source: "phone", ...player(7), payment: "later" }, NOW);
    await expect(collectBalance(db, { ...STAFF, orgId: "org_other" }, bookingId, "cash", NOW)).rejects.toThrow(/not found/);
    expect(OWNER.role).toBe("owner");
  });
});
