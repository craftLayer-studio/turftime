"use client";

import { useEffect, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { CONSENT_NOTICE, STATUS_LABEL, formatINR, formatIstDateTime, formatMinute, istMinuteOfDay, type BookingView } from "@/lib/booking-view";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/live";
import { PaymentDialog, type CheckoutInfo } from "./PaymentDialog";

type View = BookingView;

const STATUS_VARIANT: Record<View["status"], "success" | "warning" | "error" | "neutral" | "info"> = {
  held: "warning",
  confirmed: "success",
  completed: "info",
  no_show: "error",
  cancelled: "neutral",
  expired: "neutral",
};

function useCountdown(until: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (until === null) return null;
  const left = Math.max(0, Math.floor((until - now) / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

export function BookingStatus({ token }: { token: string }) {
  const [checkout, setCheckout] = useState<CheckoutInfo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sharePayer, setSharePayer] = useState<{ shareId: string } | null>(null);
  const [payer, setPayer] = useState({ name: "", phone: "", consentService: false, consentMarketing: false });
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: view, error, refresh: load } = usePoll<View>(`/api/bookings/${token}`, 5000);

  const countdown = useCountdown(view?.holdExpiresAt ?? null);

  if (error && !view) return <Banner status="error" title={error} />;
  if (!view) return <Spinner label="Loading booking" />;

  async function pay(body: Record<string, unknown>) {
    setNotice(null);
    try {
      setCheckout(await api<CheckoutInfo>(`/api/bookings/${token}/checkout`, { body }));
    } catch (e) {
      setNotice((e as Error).message);
    }
  }

  async function shareOnWhatsApp() {
    const { text } = await api<{ text: string }>(`/api/bookings/${token}/invite`);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  const paidShares = view.shares.filter((s) => s.status === "paid").reduce((a, s) => a + s.amountPaise, 0);
  const isSplit = view.splitCount > 1;
  const start = formatIstDateTime(view.startsAt);
  const end = formatMinute(istMinuteOfDay(view.endsAt));

  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Heading level={1}>{view.resource.name}</Heading>
          <Badge variant={STATUS_VARIANT[view.status]} label={STATUS_LABEL[view.status]} />
          {view.venue.isDemo ? <Badge variant="warning" label="Demo" /> : null}
        </HStack>
        <Text>
          {view.venue.name}, {start} to {end}
        </Text>
        <Text type="supporting">{view.venue.address}</Text>
      </VStack>

      {view.status === "held" ? (
        <Banner status="warning" title={`Slot held for you: ${countdown ?? ""} left`} description={isSplit ? "The slot confirms once paid shares cover the advance." : "Pay the advance to confirm. The slot is released if the timer runs out."} />
      ) : null}
      {view.status === "confirmed" ? (
        <Banner status="success" title="Booking confirmed" description={view.balanceDuePaise > 0 ? `Pay the balance of ${formatINR(view.balanceDuePaise)} at the venue.` : "Fully paid. See you on the turf."} />
      ) : null}
      {view.status === "expired" ? (
        <Banner status="error" title="This hold expired" description="Any payment that arrived late is refunded in full." endContent={<Button label="Book again" href={`/b/${view.venue.publicToken}`} size="sm" />} />
      ) : null}
      {view.status === "cancelled" ? <Banner status="info" title="Booking cancelled" description={`Refund: ${formatINR(view.refundedPaise)}`} /> : null}
      {notice ? <Banner status="error" title={notice} /> : null}

      <Card>
        <MetadataList>
          <MetadataListItem label="Total">{formatINR(view.totalPaise)}</MetadataListItem>
          <MetadataListItem label="Advance to confirm">{formatINR(view.advancePaise)}</MetadataListItem>
          <MetadataListItem label="Paid online">{formatINR(view.paidPaise)}</MetadataListItem>
          <MetadataListItem label="Balance at venue">{formatINR(view.balanceDuePaise)}</MetadataListItem>
          {view.captainName ? <MetadataListItem label="Booked by">{view.captainName}</MetadataListItem> : null}
          {view.isOffer ? <MetadataListItem label="Offer">Fill-offer price applied</MetadataListItem> : null}
        </MetadataList>
      </Card>

      {view.status === "held" && !isSplit && view.dueNowPaise > 0 ? (
        <Button label={`Pay ${formatINR(view.dueNowPaise)} advance`} variant="primary" size="lg" clickAction={() => pay({ purpose: "advance" })} />
      ) : null}

      {isSplit ? (
        <VStack gap={3}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
            <Heading level={2}>Split among {view.splitCount} players</Heading>
            <Button label="Share on WhatsApp" variant="secondary" clickAction={shareOnWhatsApp} />
          </HStack>
          <ProgressBar label="Advance covered" value={Math.min(100, Math.round((paidShares / Math.max(1, view.advancePaise)) * 100))} />
          <Text type="supporting">
            {formatINR(paidShares)} paid of {formatINR(view.advancePaise)} advance. Send this page link to your friends; each pays their own share.
          </Text>
          <Table
            data={view.shares}
            idKey="id"
            density="compact"
            columns={[
              { key: "position", header: "Player", renderCell: (s) => (s.position === 0 ? "Captain" : `Player ${s.position + 1}`) },
              { key: "payerName", header: "Name", renderCell: (s) => s.payerName ?? "-" },
              { key: "amountPaise", header: "Share", renderCell: (s) => formatINR(s.amountPaise) },
              {
                key: "status",
                header: "Status",
                renderCell: (s) =>
                  s.status === "paid" ? (
                    <Badge variant="success" label="Paid" />
                  ) : view.status === "held" || view.status === "confirmed" ? (
                    <Button
                      label="Pay"
                      tooltip={s.position === 0 ? "Pay my share" : "Pay this share"}
                      size="sm"
                      variant="secondary"
                      clickAction={async () => {
                        if (s.position === 0) await pay({ purpose: "share", shareId: s.id });
                        else setSharePayer({ shareId: s.id });
                      }}
                    />
                  ) : (
                    <Badge variant="neutral" label="Unpaid" />
                  ),
              },
            ]}
          />
          {view.status === "held" && view.dueNowPaise > 0 ? (
            <Button label={`Captain pays remaining ${formatINR(view.dueNowPaise)} now`} variant="ghost" clickAction={() => pay({ purpose: "advance" })} />
          ) : null}
        </VStack>
      ) : null}

      {view.canCancel ? (
        <Button label="Cancel booking" variant="destructive" onClick={() => setConfirmCancel(true)} />
      ) : null}

      <Text type="supporting">Cancellation policy: full refund 24 hours or more before start, 50% from 4 to 24 hours, no refund within 4 hours.</Text>

      <PaymentDialog
        checkout={checkout}
        onClose={() => setCheckout(null)}
        onDone={(status) => {
          setCheckout(null);
          setNotice(status === "failed" ? "Payment failed. Nothing was charged; try again." : status === "refunded" ? "The hold had expired, so the payment was refunded in full." : null);
          load();
        }}
      />

      <Dialog isOpen={sharePayer !== null} onOpenChange={(o) => !o && setSharePayer(null)} purpose="form" padding={6}>
        <VStack gap={3}>
          <Heading level={2}>Your details</Heading>
          <TextInput label="Your name" value={payer.name} onChange={(v) => setPayer({ ...payer, name: v })} width="100%" />
          <TextInput label="Mobile number" type="tel" inputMode="tel" value={payer.phone} onChange={(v) => setPayer({ ...payer, phone: v })} width="100%" />
          <CheckboxInput label={CONSENT_NOTICE.service_updates} value={payer.consentService} onChange={(v) => setPayer({ ...payer, consentService: v })} />
          <CheckboxInput label={CONSENT_NOTICE.marketing} value={payer.consentMarketing} onChange={(v) => setPayer({ ...payer, consentMarketing: v })} />
          <Button
            label="Continue to pay"
            variant="primary"
            isDisabled={!payer.name.trim() || !payer.phone.trim()}
            clickAction={async () => {
              const id = sharePayer!.shareId;
              setSharePayer(null);
              await pay({ purpose: "share", shareId: id, ...payer });
            }}
          />
        </VStack>
      </Dialog>

      <Dialog isOpen={confirmCancel} onOpenChange={setConfirmCancel} padding={6}>
        <VStack gap={3}>
          <Heading level={2}>Cancel this booking?</Heading>
          <Text>
            {view.status === "held" ? "The held slot will be released." : `You will get ${formatINR(view.refundIfCancelledPaise)} back under the venue policy.`}
          </Text>
          <HStack gap={2}>
            <Button
              label="Yes, cancel"
              variant="destructive"
              clickAction={async () => {
                try {
                  await api(`/api/bookings/${token}/cancel`, { body: {} });
                } catch (e) {
                  setNotice((e as Error).message);
                }
                setConfirmCancel(false);
                load();
              }}
            />
            <Button label="Keep booking" variant="ghost" onClick={() => setConfirmCancel(false)} />
          </HStack>
        </VStack>
      </Dialog>
    </VStack>
  );
}
