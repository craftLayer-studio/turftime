import { and, asc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { addDays, buildSlotGrid, istDateKey, istToEpoch, type GridSlot, type PriceRule, type ResourceHours, type SlotClaimView } from "@/domain";
import type { DbOrTx } from "../db/client";
import { bookings, orgs, priceRules, resources, slotClaims } from "../db/schema";
import { StoreError } from "./errors";

export type OrgRow = typeof orgs.$inferSelect;
export type ResourceRow = typeof resources.$inferSelect;

/** How far ahead players can book. */
export const BOOKING_WINDOW_DAYS = 14;

export async function getOrg(db: DbOrTx, orgId: string): Promise<OrgRow> {
  const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId));
  if (!org) throw new StoreError(404, "Venue not found");
  return org;
}

export async function getOrgByPublicToken(db: DbOrTx, token: string): Promise<OrgRow> {
  const [org] = await db.select().from(orgs).where(eq(orgs.publicToken, token));
  if (!org) throw new StoreError(404, "Venue not found");
  return org;
}

export async function listResources(db: DbOrTx, orgId: string, includeInactive = false): Promise<ResourceRow[]> {
  const rows = await db.select().from(resources).where(eq(resources.orgId, orgId)).orderBy(asc(resources.sortOrder), asc(resources.name));
  return includeInactive ? rows : rows.filter((r) => r.active);
}

export async function getResource(db: DbOrTx, orgId: string, resourceId: string): Promise<ResourceRow> {
  const [r] = await db.select().from(resources).where(and(eq(resources.orgId, orgId), eq(resources.id, resourceId)));
  if (!r || !r.active) throw new StoreError(404, "Court not found");
  return r;
}

export function toHours(r: ResourceRow): ResourceHours {
  return { id: r.id, slotMinutes: r.slotMinutes, openMin: r.openMin, closeMin: r.closeMin, basePricePaise: r.basePricePaise };
}

export function toPriceRule(row: typeof priceRules.$inferSelect): PriceRule {
  return {
    id: row.id,
    resourceId: row.resourceId,
    kind: row.kind as PriceRule["kind"],
    days: row.days === "" ? [] : row.days.split(",").map(Number),
    startMin: row.startMin,
    endMin: row.endMin,
    onDate: row.onDate,
    pricePaise: row.pricePaise,
    priority: row.priority,
  };
}

export async function listPriceRules(db: DbOrTx, orgId: string): Promise<PriceRule[]> {
  const rows = await db.select().from(priceRules).where(eq(priceRules.orgId, orgId));
  return rows.map(toPriceRule);
}

/**
 * Expire holds whose timer ran out and free their slots. Runs inside the same transaction as any
 * new claim, so a stale hold never blocks a real booking.
 */
export async function releaseExpiredHolds(tx: DbOrTx, orgId: string, now: number): Promise<number> {
  const expired = await tx
    .update(bookings)
    .set({ status: "expired", updatedAt: new Date(now) })
    .where(and(eq(bookings.orgId, orgId), eq(bookings.status, "held"), lte(bookings.holdExpiresAt, new Date(now))))
    .returning({ id: bookings.id });
  if (expired.length > 0) {
    await tx.delete(slotClaims).where(inArray(slotClaims.bookingId, expired.map((e) => e.id)));
  }
  return expired.length;
}

export async function claimsForDate(db: DbOrTx, orgId: string, dateKey: string): Promise<Map<string, SlotClaimView[]>> {
  const from = new Date(istToEpoch(dateKey, 0));
  const to = new Date(istToEpoch(addDays(dateKey, 1), 0));
  const rows = await db
    .select({ resourceId: slotClaims.resourceId, startsAt: slotClaims.startsAt, status: bookings.status, source: bookings.source })
    .from(slotClaims)
    .innerJoin(bookings, eq(bookings.id, slotClaims.bookingId))
    .where(and(eq(slotClaims.orgId, orgId), gte(slotClaims.startsAt, from), lt(slotClaims.startsAt, to)));
  const out = new Map<string, SlotClaimView[]>();
  for (const r of rows) {
    const list = out.get(r.resourceId) ?? [];
    list.push({ startsAt: r.startsAt.getTime(), bookingStatus: r.status, source: r.source });
    out.set(r.resourceId, list);
  }
  return out;
}

export interface ResourceGrid {
  resource: Pick<ResourceRow, "id" | "name" | "sport" | "slotMinutes">;
  slots: GridSlot[];
}

export async function venueGrid(db: DbOrTx, orgId: string, dateKey: string, now: number): Promise<ResourceGrid[]> {
  await releaseExpiredHolds(db, orgId, now);
  const [list, rules, claims] = await Promise.all([listResources(db, orgId), listPriceRules(db, orgId), claimsForDate(db, orgId, dateKey)]);
  return list.map((r) => ({
    resource: { id: r.id, name: r.name, sport: r.sport, slotMinutes: r.slotMinutes },
    slots: buildSlotGrid({ resource: toHours(r), rules, dateKey, now, claims: claims.get(r.id) ?? [] }),
  }));
}

/** Dates a player can pick: today plus the booking window. */
export function bookableDates(now: number): string[] {
  const today = istDateKey(now);
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(today, i));
}

export function assertBookableDate(dateKey: string, now: number): void {
  if (!bookableDates(now).includes(dateKey)) throw new StoreError(400, `Pick a date within the next ${BOOKING_WINDOW_DAYS} days`);
}
