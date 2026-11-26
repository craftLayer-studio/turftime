"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { PRICE_KIND_LABEL, formatINR, formatIstDateTime, offerPrice, type PriceKind } from "@/domain";
import type { FillCandidate } from "@/server/store/offers";
import { api } from "@/lib/api";

export type OfferRow = { id: string; resourceName: string; startsAt: number; discountPercent: number; pricePaise: number; wasPaise: number; sentCount: number; redeemed: boolean; createdAt: number };

export function FillOffers({ slots, offers, audience }: { slots: (FillCandidate & { id: string })[]; offers: OfferRow[]; audience: { optedIn: number; total: number } }) {
  const router = useRouter();
  const [discount, setDiscount] = useState("20");
  const [result, setResult] = useState<string | null>(null);

  async function send(s: FillCandidate) {
    setResult(null);
    try {
      const r = await api<{ sent: number }>("/api/owner/offers", { body: { resourceId: s.resourceId, date: s.dateKey, startMin: s.startMin, discountPercent: Number(discount) } });
      setResult(r.sent > 0 ? `Offer sent to ${r.sent} players on WhatsApp (simulated). See the outbox.` : "No eligible players right now: everyone opted in got an offer in the last 3 days.");
      router.refresh();
    } catch (e) {
      setResult((e as Error).message);
    }
  }

  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <Heading level={1}>Fill empty slots</Heading>
        <Text type="supporting">
          Empty slots today and tomorrow. An offer goes only to players who opted in to offers ({audience.optedIn} of {audience.total}), closest usual play time first, at most one offer per player every 3 days. Each message has an opt-out link.
        </Text>
      </VStack>
      <HStack gap={3} vAlign="end">
        <Selector label="Discount" value={discount} options={["10", "15", "20", "25", "30", "40"].map((d) => ({ value: d, label: `${d}% off` }))} onChange={(v) => v && setDiscount(v)} />
      </HStack>
      {result ? <Banner status="info" title={result} isDismissable onDismiss={() => setResult(null)} /> : null}
      <Table
        data={slots}
        idKey="id"
        density="compact"
        hasHover
        columns={[
          { key: "startsAt", header: "Slot", renderCell: (s) => formatIstDateTime(s.startsAt) },
          { key: "resourceName", header: "Court" },
          { key: "priceKind", header: "Rate", renderCell: (s) => <Badge label={PRICE_KIND_LABEL[s.priceKind as PriceKind | "standard"]} variant={s.priceKind === "offpeak" ? "info" : "neutral"} /> },
          { key: "pricePaise", header: "Price", renderCell: (s) => formatINR(s.pricePaise) },
          { key: "dateKey", header: "Offer price", renderCell: (s) => formatINR(offerPrice(s.pricePaise, Number(discount))) },
          { key: "startMin", header: "", renderCell: (s) => <Button label="Send offer" size="sm" variant="primary" clickAction={() => send(s)} /> },
        ]}
        emptyState={<Text type="supporting">No empty slots far enough ahead. Nice.</Text>}
      />
      <VStack gap={2}>
        <Heading level={2}>Sent offers</Heading>
        <Table
          data={offers}
          idKey="id"
          density="compact"
          columns={[
            { key: "createdAt", header: "Sent", renderCell: (o) => formatIstDateTime(o.createdAt) },
            { key: "resourceName", header: "Slot", renderCell: (o) => `${o.resourceName}, ${formatIstDateTime(o.startsAt)}` },
            { key: "discountPercent", header: "Deal", renderCell: (o) => `${formatINR(o.pricePaise)} (was ${formatINR(o.wasPaise)})` },
            { key: "sentCount", header: "Players messaged" },
            { key: "redeemed", header: "Result", renderCell: (o) => (o.redeemed ? <Badge variant="success" label="Booked" /> : <Badge variant="neutral" label="Waiting" />) },
          ]}
          emptyState={<Text type="supporting">No offers sent yet.</Text>}
        />
      </VStack>
    </VStack>
  );
}
