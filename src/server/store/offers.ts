import { and, desc, eq, inArray } from "drizzle-orm";
import {
  addDays,
  fillableSlots,
  istDateKey,
  istMinuteOfDay,
  istToEpoch,
  offerPrice,
  offerText,
  selectAudience,
  type AudienceCandidate,
} from "@/domain";
import type { Db } from "../db/client";
import { bookings, offers, players } from "../db/schema";
import { StoreError } from "./errors";
import { newId, newToken } from "./ids";
import { dispatchDue, queueMessage } from "./messaging";
import { consentMap } from "./players";
import { appUrl } from "./urls";
import type { StaffActor } from "./bookings";
import { getOrg, venueGrid } from "./venue";

export type FillCandidate = {
  resourceId: string;
  resourceName: string;
  dateKey: string;
  startMin: number;
  startsAt: number;
  pricePaise: number;
  priceKind: string;
};

/** Empty slots today and tomorrow that are at least an hour away. */
export async function fillCandidates(db: Db, orgId: string, now = Date.now()): Promise<FillCandidate[]> {
  const today = istDateKey(now);
  const out: FillCandidate[] = [];
  for (const dateKey of [today, addDays(today, 1)]) {
    const grids = await venueGrid(db, orgId, dateKey, now);
    for (const g of grids) {
      for (const s of fillableSlots(g.slots, now)) {
        out.push({ resourceId: g.resource.id, resourceName: g.resource.name, dateKey, startMin: s.startMin, startsAt: s.startsAt, pricePaise: s.pricePaise, priceKind: s.priceKind });
      }
    }
  }
  return out.sort((a, b) => a.startsAt - b.startsAt);
}

async function audienceCandidates(db: Db, orgId: string): Promise<AudienceCandidate[]> {
  const plist = await db.select().from(players).where(eq(players.orgId, orgId));
  const consents = await consentMap(db, orgId, plist.map((p) => p.id));
  const played = await db
    .select({ playerId: bookings.playerId, startsAt: bookings.startsAt })
    .from(bookings)
    .where(and(eq(bookings.orgId, orgId), inArray(bookings.status, ["completed", "confirmed"])));
  const minutes = new Map<string, number[]>();
  for (const r of played) {
    if (!r.playerId) continue;
    const list = minutes.get(r.playerId) ?? [];
    list.push(istMinuteOfDay(r.startsAt.getTime()));
    minutes.set(r.playerId, list);
  }
  return plist.map((p) => ({
    playerId: p.id,
    marketingOptIn: consents.get(p.id)?.marketing ?? false,
    lastMarketingAt: p.lastMarketingAt?.getTime() ?? null,
    playedMinutes: minutes.get(p.id) ?? [],
  }));
}

export async function audiencePreview(db: Db, orgId: string, startMin: number, now = Date.now()): Promise<{ eligible: number; optedIn: number; total: number }> {
  const c = await audienceCandidates(db, orgId);
  return { eligible: selectAudience(c, startMin, now).length, optedIn: c.filter((x) => x.marketingOptIn).length, total: c.length };
}

export interface SendOfferInput {
  resourceId: string;
  dateKey: string;
  startMin: number;
  discountPercent: number;
  limit?: number;
}

/** Create a fill offer for one empty slot and message the selected opted-in players. */
export async function sendFillOffer(db: Db, actor: StaffActor, input: SendOfferInput, now = Date.now()): Promise<{ offerId: string; sent: number }> {
  if (actor.role !== "owner") throw new StoreError(403, "Only the owner can send offers");
  const org = await getOrg(db, actor.orgId);
  const candidates = await fillCandidates(db, org.id, now);
  const slot = candidates.find((c) => c.resourceId === input.resourceId && c.dateKey === input.dateKey && c.startMin === input.startMin);
  if (!slot) throw new StoreError(409, "That slot is no longer empty or is too soon to offer");
  let price: number;
  try {
    price = offerPrice(slot.pricePaise, input.discountPercent);
  } catch (err) {
    throw new StoreError(400, (err as Error).message);
  }
  const audience = selectAudience(await audienceCandidates(db, org.id), slot.startMin, now, Math.min(input.limit ?? 50, 200));
  const offerId = newId("of");
  const token = newToken();
  await db.transaction(async (tx) => {
    await tx.insert(offers).values({
      id: offerId,
      orgId: org.id,
      resourceId: slot.resourceId,
      startsAt: new Date(istToEpoch(slot.dateKey, slot.startMin)),
      discountPercent: input.discountPercent,
      pricePaise: price,
      wasPaise: slot.pricePaise,
      token,
      sentCount: audience.length,
      createdAt: new Date(now),
    });
    if (audience.length === 0) return;
    const plist = await tx.select().from(players).where(and(eq(players.orgId, org.id), inArray(players.id, audience)));
    for (const p of plist) {
      const body = offerText({
        venueName: org.name,
        resourceName: slot.resourceName,
        startsAt: slot.startsAt,
        pricePaise: price,
        wasPaise: slot.pricePaise,
        link: `${appUrl()}/b/${org.publicToken}?offer=${token}`,
        optOutLink: `${appUrl()}/optout/${p.optOutToken}`,
      });
      await queueMessage(tx, { orgId: org.id, playerId: p.id, phone: p.phone, kind: "marketing", template: "fill_offer", body, sendAfter: now, offerId }, now);
    }
    await tx.update(players).set({ lastMarketingAt: new Date(now) }).where(and(eq(players.orgId, org.id), inArray(players.id, audience)));
  });
  const { sent } = await dispatchDue(db, org.id, now);
  return { offerId, sent };
}

export async function listOffers(db: Db, orgId: string) {
  return db.select().from(offers).where(eq(offers.orgId, orgId)).orderBy(desc(offers.createdAt)).limit(50);
}

export async function offerByToken(db: Db, orgId: string, token: string) {
  const [o] = await db.select().from(offers).where(and(eq(offers.orgId, orgId), eq(offers.token, token)));
  return o ?? null;
}
