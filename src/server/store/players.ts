import { and, desc, eq, inArray } from "drizzle-orm";
import { currentConsent, NOTICE_VERSION, tagPlayer, type ConsentChannel, type ConsentPurpose, type ConsentState, type PlayerTag } from "@/domain";
import type { DbOrTx } from "../db/client";
import { bookings, consentRecords, players } from "../db/schema";
import { StoreError } from "./errors";
import { newId, newToken } from "./ids";

export type PlayerRow = typeof players.$inferSelect;

/** Find or create the player by phone (E.164) within the org. Updates the name if a new one is given. */
export async function upsertPlayer(tx: DbOrTx, orgId: string, phone: string, name: string, now: number): Promise<PlayerRow> {
  const [row] = await tx
    .insert(players)
    .values({ id: newId("pl"), orgId, phone, name, optOutToken: newToken(), createdAt: new Date(now) })
    .onConflictDoUpdate({ target: [players.orgId, players.phone], set: { name } })
    .returning();
  return row;
}

/** Record opt-ins given now. Unticked boxes record nothing (they never withdraw an earlier consent). */
export async function recordOptIns(
  tx: DbOrTx,
  orgId: string,
  playerId: string,
  given: { service: boolean; marketing: boolean },
  channel: ConsentChannel,
  now: number,
): Promise<void> {
  const purposes: ConsentPurpose[] = [];
  if (given.service) purposes.push("service_updates");
  if (given.marketing) purposes.push("marketing");
  if (purposes.length === 0) return;
  await tx.insert(consentRecords).values(
    purposes.map((purpose) => ({ id: newId("cr"), orgId, playerId, purpose, granted: true, noticeVersion: NOTICE_VERSION, channel, createdAt: new Date(now) })),
  );
}

export async function setConsent(tx: DbOrTx, orgId: string, playerId: string, purpose: ConsentPurpose, granted: boolean, channel: ConsentChannel, now: number): Promise<void> {
  const [p] = await tx.select({ id: players.id }).from(players).where(and(eq(players.orgId, orgId), eq(players.id, playerId)));
  if (!p) throw new StoreError(404, "Player not found");
  await tx.insert(consentRecords).values({ id: newId("cr"), orgId, playerId, purpose, granted, noticeVersion: NOTICE_VERSION, channel, createdAt: new Date(now) });
}

export async function consentMap(db: DbOrTx, orgId: string, playerIds: string[]): Promise<Map<string, ConsentState>> {
  const out = new Map<string, ConsentState>();
  if (playerIds.length === 0) return out;
  const rows = await db
    .select()
    .from(consentRecords)
    .where(and(eq(consentRecords.orgId, orgId), inArray(consentRecords.playerId, playerIds)));
  const grouped = new Map<string, { purpose: ConsentPurpose; granted: boolean; at: number }[]>();
  for (const r of rows) {
    const list = grouped.get(r.playerId) ?? [];
    list.push({ purpose: r.purpose as ConsentPurpose, granted: r.granted, at: r.createdAt.getTime() });
    grouped.set(r.playerId, list);
  }
  for (const id of playerIds) out.set(id, currentConsent(grouped.get(id) ?? []));
  return out;
}

export async function consentFor(db: DbOrTx, orgId: string, playerId: string): Promise<ConsentState> {
  return (await consentMap(db, orgId, [playerId])).get(playerId)!;
}

/** Self-serve opt-out from the link in every marketing message. */
export async function optOutByToken(db: DbOrTx, token: string, purposes: ConsentPurpose[], now: number): Promise<{ venueOrgId: string; name: string }> {
  const [p] = await db.select().from(players).where(eq(players.optOutToken, token));
  if (!p) throw new StoreError(404, "Link not found");
  for (const purpose of purposes) await setConsent(db, p.orgId, p.id, purpose, false, "opt_out_link", now);
  return { venueOrgId: p.orgId, name: p.name };
}

export async function playerByOptOutToken(db: DbOrTx, token: string): Promise<PlayerRow> {
  const [p] = await db.select().from(players).where(eq(players.optOutToken, token));
  if (!p) throw new StoreError(404, "Link not found");
  return p;
}

export type CrmRow = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  noShows: number;
  upcoming: number;
  spendPaise: number;
  lastVisitAt: number | null;
  consent: ConsentState;
  tags: PlayerTag[];
  createdAt: number;
};

/** Repeat-player CRM: one row per player with visits, spend, consent and derived tags. */
export async function listCrm(db: DbOrTx, orgId: string, now: number): Promise<CrmRow[]> {
  const [plist, blist] = await Promise.all([
    db.select().from(players).where(eq(players.orgId, orgId)).orderBy(desc(players.createdAt)),
    db.select().from(bookings).where(eq(bookings.orgId, orgId)),
  ]);
  const consents = await consentMap(db, orgId, plist.map((p) => p.id));
  const stats = new Map<string, { visits: number; noShows: number; upcoming: number; spend: number; last: number | null }>();
  for (const b of blist) {
    if (!b.playerId) continue;
    const s = stats.get(b.playerId) ?? { visits: 0, noShows: 0, upcoming: 0, spend: 0, last: null };
    if (b.status === "completed") {
      s.visits += 1;
      s.last = Math.max(s.last ?? 0, b.startsAt.getTime());
    }
    if (b.status === "no_show") s.noShows += 1;
    if (b.status === "confirmed" && b.startsAt.getTime() > now) s.upcoming += 1;
    s.spend += b.paidPaise + b.balancePaidPaise - b.refundedPaise;
    stats.set(b.playerId, s);
  }
  return plist
    .map((p) => {
      const s = stats.get(p.id) ?? { visits: 0, noShows: 0, upcoming: 0, spend: 0, last: null };
      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        visits: s.visits,
        noShows: s.noShows,
        upcoming: s.upcoming,
        spendPaise: s.spend,
        lastVisitAt: s.last,
        consent: consents.get(p.id)!,
        tags: tagPlayer({ visits: s.visits, noShows: s.noShows, spendPaise: s.spend, lastVisitAt: s.last }, now),
        createdAt: p.createdAt.getTime(),
      };
    })
    .sort((a, b) => b.visits - a.visits || b.spendPaise - a.spendPaise || a.name.localeCompare(b.name));
}
