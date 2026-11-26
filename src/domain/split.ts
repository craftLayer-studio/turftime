import { assertPaise, type Paise } from "./money";

export const MIN_SPLIT = 2;
export const MAX_SPLIT = 22;

/**
 * Split an amount into n shares that add up exactly to the amount.
 * Shares are whole rupees where possible; any leftover rupees and paise go to the first shares (the captain first).
 */
export function splitAmount(total: Paise, n: number): Paise[] {
  assertPaise(total, "total");
  if (!Number.isInteger(n) || n < MIN_SPLIT || n > MAX_SPLIT) throw new Error(`Split must be between ${MIN_SPLIT} and ${MAX_SPLIT} players`);
  const rupeesTotal = Math.floor(total / 100);
  const paiseLeft = total % 100;
  const base = Math.floor(rupeesTotal / n);
  const extra = rupeesTotal % n;
  const shares = Array.from({ length: n }, (_, i) => (base + (i < extra ? 1 : 0)) * 100);
  shares[0] += paiseLeft;
  return shares;
}

/** The slot confirms once paid shares cover the advance. */
export function advanceCovered(paid: Paise, advance: Paise): boolean {
  return paid >= advance;
}

/** What the captain must top up to cover the advance now. */
export function topUpNeeded(paid: Paise, advance: Paise): Paise {
  return Math.max(0, advance - paid);
}
