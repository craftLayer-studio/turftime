import { formatINR, type Paise } from "./money";
import { formatIstDateTime } from "./time";

/**
 * WhatsApp message texts. Utility messages (confirmations, reminders) need service-updates consent;
 * marketing messages (fill offers) need marketing consent. Every marketing message carries an opt-out link.
 */
export type MessageKind = "utility" | "marketing";

export const REMINDER_LEAD_MS = 3 * 3_600_000;

export interface BookingMessageInput {
  venueName: string;
  resourceName: string;
  startsAt: number;
  playerName: string;
  totalPaise: Paise;
  paidPaise: Paise;
  link: string;
}

export function confirmationText(b: BookingMessageInput): string {
  const balance = Math.max(0, b.totalPaise - b.paidPaise);
  return [
    `Hi ${b.playerName}, your booking at ${b.venueName} is confirmed.`,
    `${b.resourceName}, ${formatIstDateTime(b.startsAt)}.`,
    `Paid ${formatINR(b.paidPaise)}${balance > 0 ? `, balance ${formatINR(balance)} at the venue` : ""}.`,
    `Details and cancellation policy: ${b.link}`,
  ].join("\n");
}

export function reminderText(b: BookingMessageInput): string {
  return `Reminder: ${b.resourceName} at ${b.venueName}, ${formatIstDateTime(b.startsAt)}. Reach 10 minutes early. ${b.link}`;
}

export function cancellationText(b: BookingMessageInput & { refundPaise: Paise }): string {
  return `Your booking for ${b.resourceName} at ${b.venueName} on ${formatIstDateTime(b.startsAt)} is cancelled. Refund: ${formatINR(b.refundPaise)}.`;
}

export function splitInviteText(p: { captainName: string; venueName: string; resourceName: string; startsAt: number; sharePaise: Paise; link: string }): string {
  return `${p.captainName} booked ${p.resourceName} at ${p.venueName}, ${formatIstDateTime(p.startsAt)}. Your share is ${formatINR(p.sharePaise)}. Pay here: ${p.link}`;
}

/** Whether a reminder should be scheduled, and when. Bookings made inside the lead window get none. */
export function reminderAt(startsAt: number, now: number): number | null {
  const at = startsAt - REMINDER_LEAD_MS;
  return at > now ? at : null;
}

export function offerText(p: { venueName: string; resourceName: string; startsAt: number; pricePaise: Paise; wasPaise: Paise; link: string; optOutLink: string }): string {
  return [
    `${p.venueName}: ${p.resourceName} is free at ${formatIstDateTime(p.startsAt)}.`,
    `Book now for ${formatINR(p.pricePaise)} (usually ${formatINR(p.wasPaise)}): ${p.link}`,
    `Stop offers: ${p.optOutLink}`,
  ].join("\n");
}
