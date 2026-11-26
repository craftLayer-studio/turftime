import { and, asc, eq, gte, lt } from "drizzle-orm";
import {
  addDays,
  advanceCovered,
  assertTransition,
  balanceDue,
  buildUpiUri,
  cancellationText,
  computeAdvance,
  confirmationText,
  consecutiveSlots,
  holdExpiresAt,
  isHoldExpired,
  istToEpoch,
  MAX_SPLIT,
  MIN_SPLIT,
  normalizeIndianPhone,
  priceForRange,
  refundOnCancel,
  reminderAt,
  reminderText,
  splitAmount,
  splitInviteText,
  topUpNeeded,
  type BookingSource,
  type BookingStatus,
} from "@/domain";
import { simulatedGateway, type PaymentGateway } from "../adapters/payments";
import type { Db, DbOrTx, Tx } from "../db/client";
import { bookings, offers, payments, players, resources, slotClaims, splitShares } from "../db/schema";
import { StoreError, isUniqueViolation } from "./errors";
import { newId, newToken } from "./ids";
import { dispatchDue, queueMessage } from "./messaging";
import { recordOptIns, upsertPlayer } from "./players";
import { appUrl } from "./urls";
import { assertBookableDate, getOrg, getOrgByPublicToken, getResource, listPriceRules, releaseExpiredHolds, toHours, type OrgRow } from "./venue";

export type BookingRow = typeof bookings.$inferSelect;

export interface StaffActor {
  userId: string;
  orgId: string;
  role: "owner" | "staff";
}

const SLOT_TAKEN = "That slot was just taken. Please pick another.";

interface Contact {
  name: string;
  phone: string;
  consentService: boolean;
  consentMarketing: boolean;
}

function cleanName(name: string): string {
  const n = name.trim().replace(/\s+/g, " ");
  if (n.length < 2 || n.length > 60) throw new StoreError(400, "Enter a name (2 to 60 characters)");
  return n;
}

function cleanPhone(phone: string): string {
  const p = normalizeIndianPhone(phone);
  if (!p) throw new StoreError(400, "Enter a valid Indian mobile number");
  return p;
}

/** Insert the booking and one claim row per slot. The claim primary key is the double-booking guard. */
async function insertWithClaims(tx: Tx, row: typeof bookings.$inferInsert, starts: number[]): Promise<void> {
  await tx.insert(bookings).values(row);
  await tx.insert(slotClaims).values(starts.map((s) => ({ orgId: row.orgId, resourceId: row.resourceId, startsAt: new Date(s), bookingId: row.id })));
}

async function messageInput(tx: DbOrTx, b: BookingRow, org: OrgRow, playerName: string) {
  const [r] = await tx.select({ name: resources.name }).from(resources).where(eq(resources.id, b.resourceId));
  return {
    venueName: org.name,
    resourceName: r?.name ?? "Court",
    startsAt: b.startsAt.getTime(),
    playerName,
    totalPaise: b.totalPaise,
    paidPaise: b.paidPaise + b.balancePaidPaise,
    link: `${appUrl()}/p/${b.publicToken}`,
  };
}

/** Confirmation now plus a reminder 3 hours before (consent is checked in the outbox). */
async function queueConfirmation(tx: Tx, b: BookingRow, org: OrgRow, now: number): Promise<void> {
  if (!b.playerId) return;
  const [p] = await tx.select().from(players).where(eq(players.id, b.playerId));
  const input = await messageInput(tx, b, org, p.name);
  await queueMessage(tx, { orgId: org.id, playerId: p.id, phone: p.phone, kind: "utility", template: "confirmation", body: confirmationText(input), sendAfter: now, bookingId: b.id }, now);
  const at = reminderAt(b.startsAt.getTime(), now);
  if (at !== null) {
    await queueMessage(tx, { orgId: org.id, playerId: p.id, phone: p.phone, kind: "utility", template: "reminder", body: reminderText(input), sendAfter: at, bookingId: b.id }, now);
  }
}

// ---------------------------------------------------------------------------------------------
// Online hold (public booking page)
// ---------------------------------------------------------------------------------------------

export interface HoldInput extends Contact {
  resourceId: string;
  dateKey: string;
  startMin: number;
  slots: number;
  splitCount: number;
  offerToken?: string;
}

export async function createHold(db: Db, venueToken: string, input: HoldInput, now = Date.now()): Promise<{ bookingToken: string }> {
  const org = await getOrgByPublicToken(db, venueToken);
  const resource = await getResource(db, org.id, input.resourceId);
  assertBookableDate(input.dateKey, now);
  const name = cleanName(input.name);
  const phone = cleanPhone(input.phone);
  const split = input.splitCount > 1;
  if (!Number.isInteger(input.splitCount) || (split && (input.splitCount < MIN_SPLIT || input.splitCount > MAX_SPLIT)) || input.splitCount < 1) {
    throw new StoreError(400, `Split among ${MIN_SPLIT} to ${MAX_SPLIT} players`);
  }
  const startMins = consecutiveSlots(toHours(resource), input.startMin, input.slots);
  if (!startMins) throw new StoreError(400, "Pick a valid slot");
  const starts = startMins.map((m) => istToEpoch(input.dateKey, m));
  if (starts[0] <= now) throw new StoreError(400, "That slot has already started");
  const endsAt = starts[starts.length - 1] + resource.slotMinutes * 60_000;

  const rules = await listPriceRules(db, org.id);
  let total = priceForRange(toHours(resource), rules, input.dateKey, startMins);
  let offerId: string | null = null;
  if (input.offerToken) {
    const [offer] = await db.select().from(offers).where(and(eq(offers.orgId, org.id), eq(offers.token, input.offerToken)));
    if (offer && !offer.redeemedBookingId && offer.resourceId === resource.id && offer.startsAt.getTime() === starts[0] && input.slots === 1) {
      total = offer.pricePaise;
      offerId = offer.id;
    }
  }
  const advance = computeAdvance(total, { advancePercent: org.advancePercent, minAdvancePaise: org.minAdvancePaise });
  const bookingId = newId("bk");
  const bookingToken = newToken();

  try {
    await db.transaction(async (tx) => {
      await releaseExpiredHolds(tx, org.id, now);
      const player = await upsertPlayer(tx, org.id, phone, name, now);
      await recordOptIns(tx, org.id, player.id, { service: input.consentService, marketing: input.consentMarketing }, "booking_page", now);
      await insertWithClaims(
        tx,
        {
          id: bookingId,
          orgId: org.id,
          resourceId: resource.id,
          playerId: player.id,
          startsAt: new Date(starts[0]),
          endsAt: new Date(endsAt),
          source: "online",
          status: "held",
          totalPaise: total,
          advancePaise: advance,
          splitCount: input.splitCount,
          holdExpiresAt: new Date(holdExpiresAt(now, org.holdMinutes, split)),
          publicToken: bookingToken,
          offerId,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
        starts,
      );
      if (split) {
        const shares = splitAmount(total, input.splitCount);
        await tx.insert(splitShares).values(
          shares.map((amount, i) => ({
            id: newId("sh"),
            orgId: org.id,
            bookingId,
            position: i,
            amountPaise: amount,
            payerName: i === 0 ? name : null,
            playerId: i === 0 ? player.id : null,
          })),
        );
      }
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new StoreError(409, SLOT_TAKEN);
    throw err;
  }
  return { bookingToken };
}

// ---------------------------------------------------------------------------------------------
// Player booking page
// ---------------------------------------------------------------------------------------------

export interface BookingView {
  token: string;
  status: BookingStatus;
  source: BookingSource;
  venue: { name: string; city: string; address: string; mapsUrl: string | null; publicToken: string; isDemo: boolean };
  resource: { name: string; sport: string };
  captainName: string | null;
  startsAt: number;
  endsAt: number;
  totalPaise: number;
  advancePaise: number;
  paidPaise: number;
  balancePaidPaise: number;
  refundedPaise: number;
  balanceDuePaise: number;
  holdExpiresAt: number | null;
  splitCount: number;
  shares: { id: string; position: number; amountPaise: number; status: string; payerName: string | null }[];
  /** Amount the captain pays now to confirm (advance or split top-up). 0 when nothing is due. */
  dueNowPaise: number;
  refundIfCancelledPaise: number;
  canCancel: boolean;
  isOffer: boolean;
}

export async function getBookingByToken(db: DbOrTx, token: string): Promise<BookingRow> {
  const [b] = await db.select().from(bookings).where(eq(bookings.publicToken, token));
  if (!b) throw new StoreError(404, "Booking not found");
  return b;
}

export async function bookingView(db: Db, token: string, now = Date.now()): Promise<BookingView> {
  let b = await getBookingByToken(db, token);
  if (isHoldExpired({ status: b.status as BookingStatus, holdExpiresAt: b.holdExpiresAt?.getTime() ?? null }, now)) {
    await releaseExpiredHolds(db, b.orgId, now);
    b = await getBookingByToken(db, token);
  }
  const org = await getOrg(db, b.orgId);
  const [r] = await db.select().from(resources).where(eq(resources.id, b.resourceId));
  const captain = b.playerId ? (await db.select().from(players).where(eq(players.id, b.playerId)))[0] : null;
  const shares = await db.select().from(splitShares).where(eq(splitShares.bookingId, b.id)).orderBy(asc(splitShares.position));
  const status = b.status as BookingStatus;
  const dueNow = status === "held" ? (b.splitCount > 1 ? topUpNeeded(b.paidPaise, b.advancePaise) : Math.max(0, b.advancePaise - b.paidPaise)) : 0;
  const canCancel = (status === "held" || status === "confirmed") && b.startsAt.getTime() > now && b.source === "online";
  return {
    token,
    status,
    source: b.source as BookingSource,
    venue: { name: org.name, city: org.city, address: org.address, mapsUrl: org.mapsUrl, publicToken: org.publicToken, isDemo: org.isDemo },
    resource: { name: r.name, sport: r.sport },
    captainName: captain?.name ?? null,
    startsAt: b.startsAt.getTime(),
    endsAt: b.endsAt.getTime(),
    totalPaise: b.totalPaise,
    advancePaise: b.advancePaise,
    paidPaise: b.paidPaise,
    balancePaidPaise: b.balancePaidPaise,
    refundedPaise: b.refundedPaise,
    balanceDuePaise: status === "cancelled" || status === "expired" ? 0 : balanceDue({ totalPaise: b.totalPaise, paidPaise: b.paidPaise + b.balancePaidPaise }),
    holdExpiresAt: status === "held" ? (b.holdExpiresAt?.getTime() ?? null) : null,
    splitCount: b.splitCount,
    shares: shares.map((s) => ({ id: s.id, position: s.position, amountPaise: s.amountPaise, status: s.status, payerName: s.payerName })),
    dueNowPaise: dueNow,
    refundIfCancelledPaise: status === "confirmed" ? refundOnCancel(b.paidPaise, b.startsAt.getTime(), now) : 0,
    canCancel,
    isOffer: b.offerId !== null,
  };
}

// ---------------------------------------------------------------------------------------------
// Payments (simulated gateway + UPI intent)
// ---------------------------------------------------------------------------------------------

export type CheckoutPurpose = "advance" | "share";

export interface CheckoutInput {
  purpose: CheckoutPurpose;
  shareId?: string;
  payer?: Contact;
}

export interface Checkout {
  ref: string;
  amountPaise: number;
  upiUri: string;
}

/**
 * Start a payment. The amount always comes from the booking on the server, never from the client.
 * "advance" pays the advance (or, on a split booking, the captain's top-up of whatever is still missing).
 * "share" pays one player's share of a split booking.
 */
export async function startCheckout(db: Db, token: string, input: CheckoutInput, now = Date.now(), gateway: PaymentGateway = simulatedGateway): Promise<Checkout> {
  const view = await bookingView(db, token, now);
  const b = await getBookingByToken(db, token);
  const org = await getOrg(db, b.orgId);
  let amount = 0;
  let shareId: string | null = null;

  if (input.purpose === "advance") {
    if (view.status !== "held") throw new StoreError(409, view.status === "expired" ? "This hold has expired. Please book again." : "Nothing to pay right now");
    amount = view.dueNowPaise;
  } else {
    if (view.status !== "held" && view.status !== "confirmed") throw new StoreError(409, "This booking is not open for payment");
    const share = view.shares.find((s) => s.id === input.shareId);
    if (!share) throw new StoreError(404, "Share not found");
    if (share.status === "paid") throw new StoreError(409, "This share is already paid");
    if (!input.payer && share.position !== 0) throw new StoreError(400, "Enter your name and phone");
    shareId = share.id;
    amount = share.amountPaise;
    if (input.payer) {
      const name = cleanName(input.payer.name);
      const phone = cleanPhone(input.payer.phone);
      const payer = input.payer;
      await db.transaction(async (tx) => {
        const p = await upsertPlayer(tx, org.id, phone, name, now);
        await recordOptIns(tx, org.id, p.id, { service: payer.consentService, marketing: payer.consentMarketing }, "booking_page", now);
        await tx.update(splitShares).set({ payerName: name, playerId: p.id }).where(and(eq(splitShares.id, share.id), eq(splitShares.status, "pending")));
      });
    }
  }
  if (amount <= 0) throw new StoreError(409, "Nothing to pay right now");

  const order = await gateway.createOrder(amount, b.id);
  await db.insert(payments).values({
    id: newId("pay"),
    orgId: org.id,
    bookingId: b.id,
    shareId,
    kind: shareId ? "share" : "advance",
    method: "upi",
    amountPaise: amount,
    status: "created",
    gatewayRef: order.ref,
    createdAt: new Date(now),
  });
  const upiUri = buildUpiUri({ vpa: org.upiVpa, payeeName: org.name, amount, note: `TurfTime ${view.resource.name}`, reference: order.ref.slice(-30) });
  return { ref: order.ref, amountPaise: amount, upiUri };
}

export type PaymentOutcome = "success" | "failure";

export interface PaymentResult {
  status: "paid" | "failed" | "refunded";
  bookingStatus: BookingStatus;
  bookingToken: string;
}

/**
 * Gateway callback (simulated). Idempotent on the gateway ref. A payment that arrives after the hold
 * expired is refunded in full rather than double-booking the slot.
 */
export async function completePayment(db: Db, ref: string, outcome: PaymentOutcome, now = Date.now()): Promise<PaymentResult> {
  const result = await db.transaction(async (tx): Promise<PaymentResult & { orgId: string }> => {
    const [pay] = await tx.select().from(payments).where(eq(payments.gatewayRef, ref)).for("update");
    if (!pay) throw new StoreError(404, "Payment not found");
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, pay.bookingId)).for("update");
    const base = { bookingToken: b.publicToken, orgId: b.orgId };
    if (pay.status !== "created") {
      return { ...base, status: pay.status === "failed" ? "failed" : pay.status === "refunded" ? "refunded" : "paid", bookingStatus: b.status as BookingStatus };
    }
    if (outcome === "failure") {
      await tx.update(payments).set({ status: "failed" }).where(eq(payments.id, pay.id));
      return { ...base, status: "failed", bookingStatus: b.status as BookingStatus };
    }
    let status = b.status as BookingStatus;
    if (isHoldExpired({ status, holdExpiresAt: b.holdExpiresAt?.getTime() ?? null }, now)) {
      await tx.update(bookings).set({ status: "expired", updatedAt: new Date(now) }).where(eq(bookings.id, b.id));
      await tx.delete(slotClaims).where(eq(slotClaims.bookingId, b.id));
      status = "expired";
    }
    if (status === "expired" || status === "cancelled") {
      await tx.update(payments).set({ status: "refunded" }).where(eq(payments.id, pay.id));
      await tx.insert(payments).values({
        id: newId("pay"),
        orgId: b.orgId,
        bookingId: b.id,
        kind: "refund",
        method: pay.method,
        amountPaise: pay.amountPaise,
        status: "paid",
        gatewayRef: `${ref}_refund`,
        createdAt: new Date(now),
      });
      return { ...base, status: "refunded", bookingStatus: status };
    }

    await tx.update(payments).set({ status: "paid" }).where(eq(payments.id, pay.id));
    if (pay.shareId) await tx.update(splitShares).set({ status: "paid", paidAt: new Date(now) }).where(eq(splitShares.id, pay.shareId));
    const paid = b.paidPaise + pay.amountPaise;
    const confirm = status === "held" && advanceCovered(paid, b.advancePaise);
    const [updated] = await tx
      .update(bookings)
      .set({ paidPaise: paid, status: confirm ? "confirmed" : status, holdExpiresAt: confirm ? null : b.holdExpiresAt, updatedAt: new Date(now) })
      .where(eq(bookings.id, b.id))
      .returning();
    if (confirm) {
      if (b.offerId) await tx.update(offers).set({ redeemedBookingId: b.id }).where(eq(offers.id, b.offerId));
      await queueConfirmation(tx, updated, await getOrg(tx, b.orgId), now);
    }
    return { ...base, status: "paid", bookingStatus: updated.status as BookingStatus };
  });
  await dispatchDue(db, result.orgId, now);
  return { status: result.status, bookingStatus: result.bookingStatus, bookingToken: result.bookingToken };
}

/** WhatsApp text the captain shares with friends for split pay (sent via wa.me by the captain). */
export async function splitInvite(db: Db, token: string): Promise<string> {
  const v = await bookingView(db, token);
  const pending = v.shares.find((s) => s.status === "pending" && s.position > 0);
  return splitInviteText({
    captainName: v.captainName ?? "Your captain",
    venueName: v.venue.name,
    resourceName: v.resource.name,
    startsAt: v.startsAt,
    sharePaise: pending?.amountPaise ?? v.shares[1]?.amountPaise ?? 0,
    link: `${appUrl()}/p/${token}`,
  });
}

// ---------------------------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------------------------

async function cancelInTx(tx: Tx, b: BookingRow, now: number, refundFull: boolean): Promise<number> {
  assertTransition(b.status as BookingStatus, "cancelled");
  const refund = b.source === "online" ? (refundFull ? b.paidPaise : refundOnCancel(b.paidPaise, b.startsAt.getTime(), now)) : 0;
  await tx.update(bookings).set({ status: "cancelled", refundedPaise: b.refundedPaise + refund, holdExpiresAt: null, updatedAt: new Date(now) }).where(eq(bookings.id, b.id));
  await tx.delete(slotClaims).where(eq(slotClaims.bookingId, b.id));
  if (refund > 0) {
    await tx.insert(payments).values({ id: newId("pay"), orgId: b.orgId, bookingId: b.id, kind: "refund", method: "upi", amountPaise: refund, status: "paid", gatewayRef: `refund_${newToken()}`, createdAt: new Date(now) });
  }
  if (b.playerId && b.status === "confirmed") {
    const org = await getOrg(tx, b.orgId);
    const [p] = await tx.select().from(players).where(eq(players.id, b.playerId));
    const input = await messageInput(tx, b, org, p.name);
    await queueMessage(tx, { orgId: b.orgId, playerId: p.id, phone: p.phone, kind: "utility", template: "cancellation", body: cancellationText({ ...input, refundPaise: refund }), sendAfter: now, bookingId: b.id }, now);
  }
  return refund;
}

export async function cancelByPlayer(db: Db, token: string, now = Date.now()): Promise<{ refundPaise: number }> {
  const orgId = (await getBookingByToken(db, token)).orgId;
  const refund = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.publicToken, token)).for("update");
    if (b.source !== "online" || b.startsAt.getTime() <= now) throw new StoreError(409, "This booking can no longer be cancelled online. Please call the venue.");
    if (b.status !== "held" && b.status !== "confirmed") throw new StoreError(409, "This booking is not active");
    return cancelInTx(tx, b, now, false);
  });
  await dispatchDue(db, orgId, now);
  return { refundPaise: refund };
}

// ---------------------------------------------------------------------------------------------
// Staff: walk-in, phone and marketplace blocks, day view, status, balance
// ---------------------------------------------------------------------------------------------

export const STAFF_SOURCES = ["walkin", "phone", "marketplace", "block"] as const;
export type StaffSource = (typeof STAFF_SOURCES)[number];
export const STAFF_PAYMENT = ["cash", "upi", "later"] as const;
export type StaffPayment = (typeof STAFF_PAYMENT)[number];

export interface StaffBookingInput {
  resourceId: string;
  dateKey: string;
  startMin: number;
  slots: number;
  source: StaffSource;
  name?: string;
  phone?: string;
  consentService: boolean;
  consentMarketing: boolean;
  payment: StaffPayment;
  note?: string;
}

/** Phone/walk-in booking or a marketplace block, on the same calendar and the same claim guard. */
export async function createStaffBooking(db: Db, actor: StaffActor, input: StaffBookingInput, now = Date.now()): Promise<{ bookingId: string }> {
  const org = await getOrg(db, actor.orgId);
  const resource = await getResource(db, org.id, input.resourceId);
  assertBookableDate(input.dateKey, now);
  const startMins = consecutiveSlots(toHours(resource), input.startMin, input.slots);
  if (!startMins) throw new StoreError(400, "Pick a valid slot");
  const starts = startMins.map((m) => istToEpoch(input.dateKey, m));
  const endsAt = starts[starts.length - 1] + resource.slotMinutes * 60_000;
  if (endsAt <= now) throw new StoreError(400, "That slot is over");

  const isBlock = input.source === "marketplace" || input.source === "block";
  const rules = await listPriceRules(db, org.id);
  const total = isBlock ? 0 : priceForRange(toHours(resource), rules, input.dateKey, startMins);
  const contact = isBlock ? null : { name: cleanName(input.name ?? ""), phone: cleanPhone(input.phone ?? "") };
  const bookingId = newId("bk");
  const note = input.note?.trim().slice(0, 200) || null;

  try {
    await db.transaction(async (tx) => {
      await releaseExpiredHolds(tx, org.id, now);
      let playerId: string | null = null;
      if (contact) {
        const p = await upsertPlayer(tx, org.id, contact.phone, contact.name, now);
        playerId = p.id;
        await recordOptIns(tx, org.id, p.id, { service: input.consentService, marketing: input.consentMarketing }, "staff", now);
      }
      const paidNow = !isBlock && input.payment !== "later" ? total : 0;
      await insertWithClaims(
        tx,
        {
          id: bookingId,
          orgId: org.id,
          resourceId: resource.id,
          playerId,
          startsAt: new Date(starts[0]),
          endsAt: new Date(endsAt),
          source: input.source,
          status: "confirmed",
          totalPaise: total,
          advancePaise: 0,
          balancePaidPaise: paidNow,
          publicToken: newToken(),
          note,
          createdBy: actor.userId,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
        starts,
      );
      if (paidNow > 0) {
        await tx.insert(payments).values({ id: newId("pay"), orgId: org.id, bookingId, kind: "balance", method: input.payment, amountPaise: paidNow, status: "paid", createdAt: new Date(now) });
      }
      if (playerId) {
        const [row] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
        await queueConfirmation(tx, row, org, now);
      }
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new StoreError(409, SLOT_TAKEN);
    throw err;
  }
  await dispatchDue(db, org.id, now);
  return { bookingId };
}

async function staffBooking(tx: DbOrTx, actor: StaffActor, bookingId: string): Promise<BookingRow> {
  const [b] = await tx.select().from(bookings).where(and(eq(bookings.orgId, actor.orgId), eq(bookings.id, bookingId)));
  if (!b) throw new StoreError(404, "Booking not found");
  return b;
}

export async function markPlayed(db: Db, actor: StaffActor, bookingId: string, status: "completed" | "no_show", now = Date.now()): Promise<void> {
  const b = await staffBooking(db, actor, bookingId);
  if (b.startsAt.getTime() > now) throw new StoreError(409, "This slot has not started yet");
  if (b.source === "marketplace" || b.source === "block") throw new StoreError(409, "Blocks have no player to mark");
  try {
    assertTransition(b.status as BookingStatus, status);
  } catch (err) {
    throw new StoreError(409, (err as Error).message);
  }
  await db.update(bookings).set({ status, updatedAt: new Date(now) }).where(and(eq(bookings.orgId, actor.orgId), eq(bookings.id, b.id)));
}

export async function collectBalance(db: Db, actor: StaffActor, bookingId: string, method: "cash" | "upi", now = Date.now()): Promise<{ collectedPaise: number }> {
  return db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(and(eq(bookings.orgId, actor.orgId), eq(bookings.id, bookingId))).for("update");
    if (!b) throw new StoreError(404, "Booking not found");
    if (b.status !== "confirmed" && b.status !== "completed") throw new StoreError(409, "Only confirmed or played bookings have a balance");
    const due = balanceDue({ totalPaise: b.totalPaise, paidPaise: b.paidPaise + b.balancePaidPaise });
    if (due === 0) throw new StoreError(409, "Nothing left to collect");
    await tx.update(bookings).set({ balancePaidPaise: b.balancePaidPaise + due, updatedAt: new Date(now) }).where(eq(bookings.id, b.id));
    await tx.insert(payments).values({ id: newId("pay"), orgId: b.orgId, bookingId: b.id, kind: "balance", method, amountPaise: due, status: "paid", createdAt: new Date(now) });
    return { collectedPaise: due };
  });
}

/** Staff cancel: online bookings are refunded by policy (or in full when the venue cancels). */
export async function cancelByStaff(db: Db, actor: StaffActor, bookingId: string, venueFault: boolean, now = Date.now()): Promise<{ refundPaise: number }> {
  const refund = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(and(eq(bookings.orgId, actor.orgId), eq(bookings.id, bookingId))).for("update");
    if (!b) throw new StoreError(404, "Booking not found");
    try {
      return await cancelInTx(tx, b, now, venueFault);
    } catch (err) {
      if (err instanceof StoreError) throw err;
      throw new StoreError(409, (err as Error).message);
    }
  });
  await dispatchDue(db, actor.orgId, now);
  return { refundPaise: refund };
}

export type DayBooking = {
  id: string;
  resourceId: string;
  startsAt: number;
  endsAt: number;
  status: BookingStatus;
  source: BookingSource;
  playerName: string | null;
  playerPhone: string | null;
  totalPaise: number;
  paidPaise: number;
  balanceDuePaise: number;
  splitCount: number;
  note: string | null;
  isOffer: boolean;
};

export async function bookingsForDate(db: DbOrTx, orgId: string, dateKey: string): Promise<DayBooking[]> {
  const from = new Date(istToEpoch(dateKey, 0));
  const to = new Date(istToEpoch(addDays(dateKey, 1), 0));
  const rows = await db
    .select({ b: bookings, name: players.name, phone: players.phone })
    .from(bookings)
    .leftJoin(players, eq(players.id, bookings.playerId))
    .where(and(eq(bookings.orgId, orgId), gte(bookings.startsAt, from), lt(bookings.startsAt, to)))
    .orderBy(asc(bookings.startsAt));
  return rows
    .filter((r) => r.b.status !== "expired")
    .map(({ b, name, phone }) => ({
      id: b.id,
      resourceId: b.resourceId,
      startsAt: b.startsAt.getTime(),
      endsAt: b.endsAt.getTime(),
      status: b.status as BookingStatus,
      source: b.source as BookingSource,
      playerName: name,
      playerPhone: phone,
      totalPaise: b.totalPaise,
      paidPaise: b.paidPaise + b.balancePaidPaise,
      balanceDuePaise: b.status === "cancelled" ? 0 : balanceDue({ totalPaise: b.totalPaise, paidPaise: b.paidPaise + b.balancePaidPaise }),
      splitCount: b.splitCount,
      note: b.note,
      isOffer: b.offerId !== null,
    }));
}
