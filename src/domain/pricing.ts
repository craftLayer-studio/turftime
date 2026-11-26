import { assertPaise, type Paise } from "./money";
import { dayOfWeek } from "./time";

export const PRICE_KINDS = ["peak", "offpeak", "weekend", "holiday"] as const;
export type PriceKind = (typeof PRICE_KINDS)[number];

export const PRICE_KIND_LABEL: Record<PriceKind | "standard", string> = {
  standard: "Standard",
  peak: "Peak",
  offpeak: "Off-peak",
  weekend: "Weekend",
  holiday: "Holiday",
};

/**
 * A price rule sets the price of a slot by resource, day, time and date.
 * The matching rule with the highest priority wins; no match means the resource's base price.
 */
export interface PriceRule {
  id: string;
  /** null applies to every resource. */
  resourceId: string | null;
  kind: PriceKind;
  /** Days of week (0 = Sunday). Empty means every day. */
  days: number[];
  /** Minute-of-day window [startMin, endMin) that the slot start must fall in. */
  startMin: number;
  endMin: number;
  /** A single venue-local date ("YYYY-MM-DD"), for holidays. null means any date. */
  onDate: string | null;
  pricePaise: Paise;
  priority: number;
}

export interface PricedSlot {
  pricePaise: Paise;
  kind: PriceKind | "standard";
  ruleId: string | null;
}

export function ruleMatches(rule: PriceRule, resourceId: string, dateKey: string, startMin: number): boolean {
  if (rule.resourceId !== null && rule.resourceId !== resourceId) return false;
  if (rule.onDate !== null && rule.onDate !== dateKey) return false;
  if (rule.days.length > 0 && !rule.days.includes(dayOfWeek(dateKey))) return false;
  return startMin >= rule.startMin && startMin < rule.endMin;
}

export function priceForSlot(
  resource: { id: string; basePricePaise: Paise },
  rules: readonly PriceRule[],
  dateKey: string,
  startMin: number,
): PricedSlot {
  let best: PriceRule | null = null;
  for (const rule of rules) {
    if (!ruleMatches(rule, resource.id, dateKey, startMin)) continue;
    if (best === null || rule.priority > best.priority) best = rule;
  }
  if (!best) return { pricePaise: resource.basePricePaise, kind: "standard", ruleId: null };
  return { pricePaise: best.pricePaise, kind: best.kind, ruleId: best.id };
}

export function validatePriceRule(rule: Omit<PriceRule, "id">): string[] {
  const errors: string[] = [];
  try {
    assertPaise(rule.pricePaise, "price");
  } catch {
    errors.push("Price must be a whole number of paise, zero or more");
  }
  if (!Number.isInteger(rule.startMin) || !Number.isInteger(rule.endMin) || rule.startMin < 0 || rule.endMin > 1440 || rule.startMin >= rule.endMin) {
    errors.push("Time window must start before it ends, within the day");
  }
  if (rule.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) errors.push("Days must be 0 (Sunday) to 6 (Saturday)");
  if (!PRICE_KINDS.includes(rule.kind)) errors.push("Unknown rule type");
  return errors;
}
