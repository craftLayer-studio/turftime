/**
 * Messaging adapter. The only implementation is simulated: it makes no network call and the
 * outbox table (shown in the owner UI) is the record of what would have been sent.
 * A WhatsApp Business Platform adapter would implement the same interface.
 */
export interface OutgoingMessage {
  channel: "whatsapp";
  to: string;
  body: string;
}

export type SendResult = { ok: true; providerRef: string } | { ok: false; error: string };

export interface Messenger {
  readonly name: string;
  send(message: OutgoingMessage): Promise<SendResult>;
}

let counter = 0;

export const simulatedWhatsApp: Messenger = {
  name: "simulated-whatsapp",
  async send(message) {
    if (!/^\+91\d{10}$/.test(message.to)) return { ok: false, error: "Invalid phone" };
    counter += 1;
    return { ok: true, providerRef: `sim-wa-${Date.now().toString(36)}-${counter}` };
  },
};
