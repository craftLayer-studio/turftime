/**
 * DPDP Act 2023 consent. Two separate purposes, both opt-in (unticked by default).
 * Every grant or withdrawal is a new consent record; the latest record per purpose wins.
 */
export const CONSENT_PURPOSES = ["service_updates", "marketing"] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CONSENT_CHANNELS = ["booking_page", "staff", "opt_out_link", "owner"] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

/** Bump when the notice text below changes. Stored on every consent record. */
export const NOTICE_VERSION = "tt-notice-2026-11-v1";

export const CONSENT_NOTICE: Record<ConsentPurpose, string> = {
  service_updates: "Send me booking confirmations and reminders on WhatsApp for this venue.",
  marketing: "Send me offers and empty-slot deals from this venue on WhatsApp (max 2 a week).",
};

export interface ConsentRecordLike {
  purpose: ConsentPurpose;
  granted: boolean;
  at: number;
}

export interface ConsentState {
  service_updates: boolean;
  marketing: boolean;
}

/** Current consent per purpose: the latest record wins; no record means no consent. */
export function currentConsent(records: readonly ConsentRecordLike[]): ConsentState {
  const state: ConsentState = { service_updates: false, marketing: false };
  const latest = new Map<ConsentPurpose, ConsentRecordLike>();
  for (const r of records) {
    const prev = latest.get(r.purpose);
    if (!prev || r.at >= prev.at) latest.set(r.purpose, r);
  }
  for (const [purpose, r] of latest) state[purpose] = r.granted;
  return state;
}
