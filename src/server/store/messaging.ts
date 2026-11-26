import { and, desc, eq, lte } from "drizzle-orm";
import type { MessageKind } from "@/domain";
import { simulatedWhatsApp, type Messenger } from "../adapters/messaging";
import type { DbOrTx } from "../db/client";
import { bookings, outbox } from "../db/schema";
import { newId } from "./ids";
import { consentFor } from "./players";

export interface QueueInput {
  orgId: string;
  playerId: string;
  phone: string;
  kind: MessageKind;
  template: "confirmation" | "reminder" | "cancellation" | "split_invite" | "fill_offer";
  body: string;
  sendAfter: number;
  bookingId?: string;
  offerId?: string;
}

/**
 * Put a message in the outbox. Consent is checked here and again at send time:
 * utility messages need service-updates consent, marketing needs marketing consent.
 * Without consent the row is kept as "skipped" so the owner can see why nothing went out.
 */
export async function queueMessage(tx: DbOrTx, m: QueueInput, now: number): Promise<void> {
  const consent = await consentFor(tx, m.orgId, m.playerId);
  const allowed = m.kind === "marketing" ? consent.marketing : consent.service_updates;
  await tx.insert(outbox).values({
    id: newId("msg"),
    orgId: m.orgId,
    channel: "whatsapp",
    kind: m.kind,
    template: m.template,
    toPhone: m.phone,
    playerId: m.playerId,
    bookingId: m.bookingId ?? null,
    offerId: m.offerId ?? null,
    body: m.body,
    status: allowed ? "scheduled" : "skipped",
    error: allowed ? null : `No ${m.kind === "marketing" ? "marketing" : "service updates"} consent`,
    sendAfter: new Date(m.sendAfter),
    createdAt: new Date(now),
  });
}

/** Send every scheduled message that is due. Reminders for bookings no longer confirmed are skipped. */
export async function dispatchDue(db: DbOrTx, orgId: string, now: number, messenger: Messenger = simulatedWhatsApp): Promise<{ sent: number; skipped: number }> {
  const due = await db
    .select()
    .from(outbox)
    .where(and(eq(outbox.orgId, orgId), eq(outbox.status, "scheduled"), lte(outbox.sendAfter, new Date(now))));
  let sent = 0;
  let skipped = 0;
  for (const m of due) {
    let skip: string | null = null;
    if (m.playerId) {
      const consent = await consentFor(db, orgId, m.playerId);
      if (m.kind === "marketing" ? !consent.marketing : !consent.service_updates) skip = "Consent withdrawn before sending";
    }
    if (!skip && m.template === "reminder" && m.bookingId) {
      const [b] = await db.select({ status: bookings.status }).from(bookings).where(and(eq(bookings.orgId, orgId), eq(bookings.id, m.bookingId)));
      if (!b || b.status !== "confirmed") skip = "Booking no longer confirmed";
    }
    if (skip) {
      await db.update(outbox).set({ status: "skipped", error: skip }).where(eq(outbox.id, m.id));
      skipped += 1;
      continue;
    }
    const result = await messenger.send({ channel: "whatsapp", to: m.toPhone, body: m.body });
    if (result.ok) {
      await db.update(outbox).set({ status: "sent", sentAt: new Date(now) }).where(eq(outbox.id, m.id));
      sent += 1;
    } else {
      await db.update(outbox).set({ status: "failed", error: result.error }).where(eq(outbox.id, m.id));
    }
  }
  return { sent, skipped };
}

export async function listOutbox(db: DbOrTx, orgId: string, limit = 100) {
  return db.select().from(outbox).where(eq(outbox.orgId, orgId)).orderBy(desc(outbox.createdAt)).limit(limit);
}
