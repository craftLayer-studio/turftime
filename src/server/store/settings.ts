import { and, eq } from "drizzle-orm";
import { isValidVpa, validatePriceRule, type PriceRule } from "@/domain";
import type { Db } from "../db/client";
import { orgs, priceRules, resources } from "../db/schema";
import type { StaffActor } from "./bookings";
import { StoreError } from "./errors";
import { newId } from "./ids";

function ownerOnly(actor: StaffActor) {
  if (actor.role !== "owner") throw new StoreError(403, "Only the owner can change settings");
}

export interface VenueSettings {
  advancePercent: number;
  minAdvancePaise: number;
  holdMinutes: number;
  upiVpa: string;
}

export async function updateVenueSettings(db: Db, actor: StaffActor, s: VenueSettings): Promise<void> {
  ownerOnly(actor);
  if (!Number.isInteger(s.advancePercent) || s.advancePercent < 0 || s.advancePercent > 100) throw new StoreError(400, "Advance must be 0 to 100%");
  if (!Number.isInteger(s.minAdvancePaise) || s.minAdvancePaise < 0 || s.minAdvancePaise > 1_000_000) throw new StoreError(400, "Minimum advance must be ₹0 to ₹10,000");
  if (!Number.isInteger(s.holdMinutes) || s.holdMinutes < 3 || s.holdMinutes > 30) throw new StoreError(400, "Hold must be 3 to 30 minutes");
  if (!isValidVpa(s.upiVpa)) throw new StoreError(400, "Enter a valid UPI ID, like venue@okbank");
  await db.update(orgs).set(s).where(eq(orgs.id, actor.orgId));
}

export interface ResourceSettings {
  basePricePaise: number;
  openMin: number;
  closeMin: number;
  active: boolean;
}

export async function updateResource(db: Db, actor: StaffActor, resourceId: string, s: ResourceSettings): Promise<void> {
  ownerOnly(actor);
  if (!Number.isInteger(s.basePricePaise) || s.basePricePaise < 0 || s.basePricePaise > 10_000_000) throw new StoreError(400, "Price must be ₹0 to ₹1,00,000");
  if (!Number.isInteger(s.openMin) || !Number.isInteger(s.closeMin) || s.openMin < 0 || s.closeMin > 1440 || s.openMin >= s.closeMin) throw new StoreError(400, "Opening must be before closing");
  const res = await db.update(resources).set(s).where(and(eq(resources.orgId, actor.orgId), eq(resources.id, resourceId))).returning({ id: resources.id });
  if (res.length === 0) throw new StoreError(404, "Court not found");
}

export async function addPriceRule(db: Db, actor: StaffActor, rule: Omit<PriceRule, "id">): Promise<string> {
  ownerOnly(actor);
  const errors = validatePriceRule(rule);
  if (errors.length) throw new StoreError(400, errors.join(". "));
  if (rule.resourceId) {
    const [r] = await db.select({ id: resources.id }).from(resources).where(and(eq(resources.orgId, actor.orgId), eq(resources.id, rule.resourceId)));
    if (!r) throw new StoreError(404, "Court not found");
  }
  const id = newId("pr");
  await db.insert(priceRules).values({ id, orgId: actor.orgId, ...rule, days: rule.days.join(",") });
  return id;
}

export async function deletePriceRule(db: Db, actor: StaffActor, ruleId: string): Promise<void> {
  ownerOnly(actor);
  const res = await db.delete(priceRules).where(and(eq(priceRules.orgId, actor.orgId), eq(priceRules.id, ruleId))).returning({ id: priceRules.id });
  if (res.length === 0) throw new StoreError(404, "Rule not found");
}
