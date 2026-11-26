"use client";

import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { SOURCE_LABEL, STATUS_LABEL, formatDateKey, formatHourShort, formatINR, formatMinute, formatPhone, istMinuteOfDay, type GridSlot } from "@/domain";
import type { DayBooking } from "@/server/store/bookings";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/live";

interface DayData {
  date: string;
  dates: string[];
  grids: { resource: { id: string; name: string; sport: string; slotMinutes: number }; slots: GridSlot[] }[];
  bookings: DayBooking[];
  now: number;
}

type NewBooking = { resourceId: string; resourceName: string; startMin: number };

const SOURCE_OPTIONS = [
  { value: "walkin", label: "Walk-in" },
  { value: "phone", label: "Phone call" },
  { value: "marketplace", label: "Marketplace (Playo, Hudle...)" },
  { value: "block", label: "Block (maintenance, private)" },
];

export function StaffDesk() {
  const [date, setDate] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewBooking | null>(null);
  const [form, setForm] = useState({ source: "walkin", name: "", phone: "", payment: "cash", slots: "1", note: "", consentService: false, consentMarketing: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState<DayBooking | null>(null);

  const { data, error, refresh: load } = usePoll<DayData>(`/api/staff/day${date ? `?date=${date}` : ""}`, 10_000);
  const dateKey = date ?? data?.date ?? null;

  if (!data || !dateKey) return error ? <Banner status="error" title={error} /> : <Spinner label="Loading the desk" />;

  const bookingAt = (resourceId: string, startsAt: number) =>
    data.bookings.find((b) => b.resourceId === resourceId && b.startsAt <= startsAt && b.endsAt > startsAt && b.status !== "cancelled");

  const isBlock = form.source === "marketplace" || form.source === "block";

  async function create() {
    if (!draft) return;
    setFormError(null);
    try {
      await api("/api/staff/bookings", {
        body: {
          resourceId: draft.resourceId,
          date: dateKey,
          startMin: draft.startMin,
          slots: Number(form.slots),
          source: form.source,
          name: isBlock ? undefined : form.name,
          phone: isBlock ? undefined : form.phone,
          payment: isBlock ? "later" : form.payment,
          note: form.note || undefined,
          consentService: form.consentService,
          consentMarketing: form.consentMarketing,
        },
      });
      setFlash(`${isBlock ? "Blocked" : "Booked"} ${draft.resourceName} at ${formatMinute(draft.startMin)}. The slot is gone from the online page.`);
      setDraft(null);
      setForm({ ...form, name: "", phone: "", note: "", consentService: false, consentMarketing: false });
      load();
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  async function act(b: DayBooking, body: Record<string, unknown>, msg: string) {
    try {
      await api(`/api/staff/bookings/${b.id}/action`, { body });
      setFlash(msg);
      setOpen(null);
      load();
    } catch (e) {
      setFlash((e as Error).message);
    }
  }

  const active = data.bookings.filter((b) => b.status !== "cancelled");

  return (
    <VStack gap={5}>
      <HStack hAlign="between" vAlign="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Heading level={1}>Booking desk</Heading>
          <Text type="supporting">One calendar for online, phone, walk-in and marketplace bookings. Tap an open slot to book it.</Text>
        </VStack>
        <Selector label="Date" value={dateKey} options={data.dates.map((d, i) => ({ value: d, label: i === 0 ? `Today, ${formatDateKey(d)}` : formatDateKey(d) }))} onChange={(v) => v && setDate(v)} />
      </HStack>
      {flash ? <Banner status="info" title={flash} isDismissable onDismiss={() => setFlash(null)} /> : null}

      {data.grids.map((g) => (
        <VStack key={g.resource.id} gap={2}>
          <Heading level={2}>{g.resource.name}</Heading>
          <Grid columns={{ minWidth: 120, repeat: "fill" }} gap={2}>
            {g.slots.map((s) => {
              const b = bookingAt(g.resource.id, s.startsAt);
              if (b) {
                return (
                  <ClickableCard
                    key={s.startMin}
                    label={`${formatHourShort(s.startMin)} ${b.playerName ?? SOURCE_LABEL[b.source]}, ${STATUS_LABEL[b.status]}`}
                    onClick={() => setOpen(b)}
                    padding={2}
                    variant={b.status === "held" ? "yellow" : b.source === "marketplace" || b.source === "block" ? "gray" : b.status === "no_show" ? "red" : "green"}
                  >
                    <VStack gap={0.5}>
                      <Text weight="semibold">{formatHourShort(s.startMin)}</Text>
                      <Text type="supporting" maxLines={1}>
                        {b.playerName ?? SOURCE_LABEL[b.source]}
                      </Text>
                      <Text type="supporting" size="xsm">
                        {STATUS_LABEL[b.status]}
                        {b.balanceDuePaise > 0 ? `, due ${formatINR(b.balanceDuePaise)}` : ""}
                      </Text>
                    </VStack>
                  </ClickableCard>
                );
              }
              const over = s.state === "past";
              const ended = over && s.startsAt + g.resource.slotMinutes * 60_000 <= data.now;
              return (
                <ClickableCard
                  key={s.startMin}
                  label={`${formatHourShort(s.startMin)} open, ${formatINR(s.pricePaise)}`}
                  isDisabled={ended}
                  onClick={() => {
                    setFormError(null);
                    setDraft({ resourceId: g.resource.id, resourceName: g.resource.name, startMin: s.startMin });
                  }}
                  padding={2}
                  variant={ended ? "muted" : "default"}
                >
                  <VStack gap={0.5}>
                    <Text weight="semibold">{formatHourShort(s.startMin)}</Text>
                    <Text type="supporting">{ended ? "Over" : formatINR(s.pricePaise)}</Text>
                    <Text type="supporting" size="xsm" color="accent">
                      {ended ? " " : over ? "Now, walk-in" : "Open"}
                    </Text>
                  </VStack>
                </ClickableCard>
              );
            })}
          </Grid>
        </VStack>
      ))}

      <VStack gap={2}>
        <Heading level={2}>All bookings, {formatDateKey(dateKey)}</Heading>
        <Table
          data={active}
          idKey="id"
          density="compact"
          hasHover
          columns={[
            { key: "startsAt", header: "Time", renderCell: (b) => formatMinute(istMinuteOfDay(b.startsAt)) },
            { key: "resourceId", header: "Court", renderCell: (b) => data.grids.find((g) => g.resource.id === b.resourceId)?.resource.name ?? "" },
            { key: "playerName", header: "Player", renderCell: (b) => (b.playerName ? <Button label={b.playerName} variant="ghost" size="sm" onClick={() => setOpen(b)} /> : SOURCE_LABEL[b.source]) },
            { key: "source", header: "Source", renderCell: (b) => <Badge label={SOURCE_LABEL[b.source]} variant={b.source === "online" ? "info" : "neutral"} /> },
            { key: "status", header: "Status", renderCell: (b) => STATUS_LABEL[b.status] },
            { key: "balanceDuePaise", header: "Due", renderCell: (b) => (b.balanceDuePaise > 0 ? formatINR(b.balanceDuePaise) : "-") },
          ]}
          emptyState={<Text type="supporting">No bookings on this date yet.</Text>}
        />
      </VStack>

      <Dialog isOpen={draft !== null} onOpenChange={(o) => !o && setDraft(null)} purpose="form" padding={6} width="32rem">
        {draft ? (
          <VStack gap={3}>
            <Heading level={2}>
              {draft.resourceName}, {formatMinute(draft.startMin)}
            </Heading>
            <Selector label="Booking type" value={form.source} options={SOURCE_OPTIONS} onChange={(v) => v && setForm({ ...form, source: v })} width="100%" />
            <Selector label="Length" value={form.slots} options={["1", "2", "3"].map((n) => ({ value: n, label: `${n} slot${n === "1" ? "" : "s"}` }))} onChange={(v) => v && setForm({ ...form, slots: v })} width="100%" />
            {!isBlock ? (
              <>
                <TextInput label="Player name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} width="100%" />
                <TextInput label="Mobile number" type="tel" inputMode="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} width="100%" />
                <RadioList label="Payment" value={form.payment} onChange={(v) => setForm({ ...form, payment: v })} orientation="horizontal">
                  <RadioListItem value="cash" label="Cash now" />
                  <RadioListItem value="upi" label="UPI now" />
                  <RadioListItem value="later" label="At the slot" />
                </RadioList>
                <Text type="label">Ask the player before ticking (consent):</Text>
                <CheckboxInput label="Player agrees to WhatsApp booking messages" value={form.consentService} onChange={(v) => setForm({ ...form, consentService: v })} />
                <CheckboxInput label="Player agrees to WhatsApp offers" value={form.consentMarketing} onChange={(v) => setForm({ ...form, consentMarketing: v })} />
              </>
            ) : null}
            <TextInput label="Note" value={form.note} onChange={(v) => setForm({ ...form, note: v })} isOptional width="100%" />
            {formError ? <Banner status="error" title={formError} /> : null}
            <Button label={isBlock ? "Block slot" : "Book slot"} variant="primary" clickAction={create} isDisabled={!isBlock && (!form.name.trim() || !form.phone.trim())} />
          </VStack>
        ) : null}
      </Dialog>

      <Dialog isOpen={open !== null} onOpenChange={(o) => !o && setOpen(null)} padding={6} width="32rem">
        {open ? (
          <VStack gap={3}>
            <Heading level={2}>{open.playerName ?? SOURCE_LABEL[open.source]}</Heading>
            <MetadataList>
              <MetadataListItem label="Time">
                {formatMinute(istMinuteOfDay(open.startsAt))} to {formatMinute(istMinuteOfDay(open.endsAt))}
              </MetadataListItem>
              {open.playerPhone ? <MetadataListItem label="Phone">{formatPhone(open.playerPhone)}</MetadataListItem> : null}
              <MetadataListItem label="Source">{SOURCE_LABEL[open.source]}</MetadataListItem>
              <MetadataListItem label="Status">{STATUS_LABEL[open.status]}</MetadataListItem>
              <MetadataListItem label="Total">{formatINR(open.totalPaise)}</MetadataListItem>
              <MetadataListItem label="Paid">{formatINR(open.paidPaise)}</MetadataListItem>
              <MetadataListItem label="Balance due">{formatINR(open.balanceDuePaise)}</MetadataListItem>
              {open.splitCount > 1 ? <MetadataListItem label="Split">{open.splitCount} players</MetadataListItem> : null}
              {open.note ? <MetadataListItem label="Note">{open.note}</MetadataListItem> : null}
            </MetadataList>
            <HStack gap={2} wrap="wrap">
              {open.balanceDuePaise > 0 && (open.status === "confirmed" || open.status === "completed") ? (
                <>
                  <Button label={`Collect ${formatINR(open.balanceDuePaise)} cash`} variant="primary" clickAction={() => act(open, { action: "collect", method: "cash" }, "Balance collected in cash.")} />
                  <Button label="Collected by UPI" variant="secondary" clickAction={() => act(open, { action: "collect", method: "upi" }, "Balance collected by UPI.")} />
                </>
              ) : null}
              {open.status === "confirmed" && open.startsAt <= data.now && open.playerName ? (
                <>
                  <Button label="Mark played" variant="secondary" clickAction={() => act(open, { action: "completed" }, "Marked as played.")} />
                  <Button label="Mark no-show" variant="secondary" clickAction={() => act(open, { action: "no_show" }, "Marked as no-show.")} />
                </>
              ) : null}
              {open.status === "confirmed" || open.status === "held" ? (
                <Button label={open.playerName ? "Cancel (venue fault, full refund)" : "Remove block"} variant="destructive" clickAction={() => act(open, { action: "cancel", venueFault: true }, "Cancelled. The slot is open again.")} />
              ) : null}
            </HStack>
          </VStack>
        ) : null}
      </Dialog>
    </VStack>
  );
}
