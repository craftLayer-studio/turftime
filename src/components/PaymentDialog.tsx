"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { formatINR } from "@/domain";
import { api } from "@/lib/api";

export interface CheckoutInfo {
  ref: string;
  amountPaise: number;
  upiUri: string;
}

/**
 * Simulated payment gateway. In production the venue's own gateway (for example Razorpay)
 * confirms the payment by webhook; here the buttons play that role. No money moves.
 */
export function PaymentDialog({ checkout, onClose, onDone }: { checkout: CheckoutInfo | null; onClose: () => void; onDone: (status: string) => void }) {
  async function finish(outcome: "success" | "failure") {
    if (!checkout) return;
    const r = await api<{ status: string }>("/api/payments/simulate", { body: { ref: checkout.ref, outcome } });
    onDone(r.status);
  }
  return (
    <Dialog isOpen={checkout !== null} onOpenChange={(open) => !open && onClose()} purpose="form" padding={6}>
      {checkout ? (
        <VStack gap={4}>
          <Heading level={2}>Pay {formatINR(checkout.amountPaise)}</Heading>
          <Banner status="info" title="Simulated payment (demo)" description="No real money moves. A live venue connects its own UPI or Razorpay account." />
          <VStack gap={2}>
            <Text type="label">Option 1: UPI app</Text>
            <Text type="supporting">Opens Google Pay, PhonePe, Paytm or any UPI app on your phone with the amount filled in.</Text>
            <Button label="Open UPI app" href={checkout.upiUri} variant="secondary" />
          </VStack>
          <VStack gap={2}>
            <Text type="label">Option 2: payment gateway</Text>
            <Text type="supporting">The gateway would confirm the payment automatically. In this demo, choose what happens.</Text>
            <HStack gap={2} wrap="wrap">
              <Button label="Payment succeeded" variant="primary" clickAction={() => finish("success")} />
              <Button label="Payment failed" variant="ghost" clickAction={() => finish("failure")} />
            </HStack>
          </VStack>
        </VStack>
      ) : null}
    </Dialog>
  );
}
