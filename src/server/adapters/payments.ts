import { randomBytes } from "node:crypto";

/**
 * Payment gateway adapter. The venue is merchant of record (its own Razorpay/UPI account);
 * TurfTime never holds player money. The simulated gateway issues an unguessable order ref and
 * confirms or fails it when the demo "gateway" page calls back. No network calls.
 */
export interface GatewayOrder {
  ref: string;
  amountPaise: number;
}

export interface PaymentGateway {
  readonly name: string;
  createOrder(amountPaise: number, receipt: string): Promise<GatewayOrder>;
}

export const simulatedGateway: PaymentGateway = {
  name: "simulated-gateway",
  async createOrder(amountPaise) {
    return { ref: `simpay_${randomBytes(12).toString("base64url")}`, amountPaise };
  },
};
