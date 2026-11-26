"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import {
  CONSENT_NOTICE,
  MAX_SPLIT,
  MIN_SPLIT,
  PRICE_KIND_LABEL,
  computeAdvance,
  formatDateKey,
  formatHourShort,
  formatINR,
  splitAmount,
  type GridSlot,
} from "@/domain";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/live";

interface VenueData {
  venue: { name: string; city: string; address: string; isDemo: boolean; advancePercent: number; minAdvancePaise: number; holdMinutes: number };
  date: string;
  dates: string[];
  grids: { resource: { id: string; name: string; sport: string; slotMinutes: number }; slots: GridSlot[] }[];
  offer: { resourceId: string; startsAt: number; pricePaise: number; wasPaise: number; discountPercent: number } | null;
}

const STATE_LABEL: Record<GridSlot["state"], string> = { open: "Open", held: "Being booked", booked: "Booked", blocked: "Booked", past: "Over" };

export function BookingApp({ venueToken, offerToken }: { venueToken: string; offerToken: string | null }) {
  const router = useRouter();
  const [date, setDate] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [hours, setHours] = useState("1");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [split, setSplit] = useState(false);
  const [players, setPlayers] = useState("10");
  const [consentService, setConsentService] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = new URLSearchParams();
  if (date) q.set("date", date);
  if (offerToken) q.set("offer", offerToken);
  const { data, error: loadError, refresh: load } = usePoll<VenueData>(`/api/public/${venueToken}?${q}`, 15_000);
  const dateKey = date ?? data?.date ?? null;
  const rid = resourceId ?? data?.offer?.resourceId ?? data?.grids[0]?.resource.id ?? null;

  const grid = data?.grids.find((g) => g.resource.id === rid) ?? null;
  const offer = data?.offer ?? null;
  const offerSlot = offer && grid && offer.resourceId === grid.resource.id ? grid.slots.find((s) => s.startsAt === offer.startsAt) : undefined;

  // Selected slots: consecutive open slots from the chosen start.
  const selection = useMemo(() => {
    if (!grid || startMin === null) return null;
    const i = grid.slots.findIndex((s) => s.startMin === startMin);
    if (i < 0 || grid.slots[i].state !== "open") return null;
    let maxLen = 0;
    while (maxLen < 3 && grid.slots[i + maxLen]?.state === "open") maxLen++;
    const isOffer = offerSlot?.startMin === startMin;
    const len = isOffer ? 1 : Math.min(Number(hours), maxLen);
    const chosen = grid.slots.slice(i, i + len);
    const total = isOffer ? offer!.pricePaise : chosen.reduce((s, x) => s + x.pricePaise, 0);
    return { chosen, maxLen: isOffer ? 1 : maxLen, total, isOffer };
  }, [grid, startMin, hours, offerSlot, offer]);

  if (loadError && !data) {
    return (
      <VStack padding={6}>
        <Banner status="error" title="This booking page could not load" description={loadError} />
      </VStack>
    );
  }
  if (!data || !dateKey) {
    return (
      <VStack padding={10} hAlign="center">
        <Spinner label="Loading slots" />
      </VStack>
    );
  }

  const advance = selection ? computeAdvance(selection.total, { advancePercent: data.venue.advancePercent, minAdvancePaise: data.venue.minAdvancePaise }) : 0;
  const playerCount = Number(players);
  const splitValid = Number.isInteger(playerCount) && playerCount >= MIN_SPLIT && playerCount <= MAX_SPLIT;

  async function submit() {
    if (!selection || !grid) return;
    setError(null);
    try {
      const res = await api<{ bookingToken: string }>(`/api/public/${venueToken}/holds`, {
        body: {
          resourceId: grid.resource.id,
          date: dateKey,
          startMin: selection.chosen[0].startMin,
          slots: selection.chosen.length,
          name,
          phone,
          consentService,
          consentMarketing,
          splitCount: split ? playerCount : 1,
          offerToken: selection.isOffer ? offerToken : undefined,
        },
      });
      router.push(`/p/${res.bookingToken}`);
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  }

  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Heading level={1}>{data.venue.name}</Heading>
          {data.venue.isDemo ? <Badge variant="warning" label="Demo" /> : null}
        </HStack>
        <Text type="supporting">{data.venue.address}</Text>
      </VStack>

      {offer ? (
        <Banner
          status="success"
          title={`Offer: ${offer.discountPercent}% off one slot`}
          description={`${formatINR(offer.pricePaise)} instead of ${formatINR(offer.wasPaise)}. Pick the highlighted slot to use it.`}
        />
      ) : null}

      <VStack gap={2}>
        <Selector
          label="Date"
          value={dateKey}
          options={data.dates.map((d, i) => ({ value: d, label: i === 0 ? `Today, ${formatDateKey(d)}` : i === 1 ? `Tomorrow, ${formatDateKey(d)}` : formatDateKey(d) }))}
          onChange={(v) => {
            if (v) {
              setDate(v);
              setStartMin(null);
            }
          }}
          width="100%"
        />
        <Selector
          label="Court or turf"
          value={rid ?? undefined}
          options={data.grids.map((g) => ({ value: g.resource.id, label: `${g.resource.name} (${g.resource.sport})` }))}
          onChange={(v) => {
            if (v) {
              setResourceId(v);
              setStartMin(null);
            }
          }}
          width="100%"
        />
      </VStack>

      {grid ? (
        <VStack gap={3}>
          <HStack hAlign="between" vAlign="center">
            <Heading level={2}>{grid.resource.name}</Heading>
            <Text type="supporting">{grid.resource.slotMinutes} min slots</Text>
          </HStack>
          <Grid columns={{ minWidth: 96, repeat: "fill" }} gap={2}>
            {grid.slots.map((s) => {
              const isOffer = offerSlot?.startMin === s.startMin && s.state === "open";
              const inSelection = selection?.chosen.some((c) => c.startMin === s.startMin) ?? false;
              return (
                <SelectableCard
                  key={s.startMin}
                  label={`${formatHourShort(s.startMin)}, ${s.state === "open" ? formatINR(isOffer ? offer!.pricePaise : s.pricePaise) : STATE_LABEL[s.state]}`}
                  isSelected={inSelection}
                  isDisabled={s.state !== "open"}
                  onChange={() => setStartMin(inSelection && startMin === s.startMin ? null : s.startMin)}
                  padding={2}
                  variant={isOffer ? "green" : s.state === "open" ? "default" : "muted"}
                >
                  <VStack gap={0.5}>
                    <Text weight="semibold">{formatHourShort(s.startMin)}</Text>
                    {s.state === "open" ? (
                      <Text type="supporting">{formatINR(isOffer ? offer!.pricePaise : s.pricePaise)}</Text>
                    ) : (
                      <Text type="supporting" color="disabled">
                        {STATE_LABEL[s.state]}
                      </Text>
                    )}
                    {s.state === "open" && (isOffer || s.priceKind !== "standard") ? (
                      <Text type="supporting" size="xsm" color="accent">
                        {isOffer ? "Offer" : PRICE_KIND_LABEL[s.priceKind]}
                      </Text>
                    ) : null}
                  </VStack>
                </SelectableCard>
              );
            })}
          </Grid>
        </VStack>
      ) : null}

      {selection ? (
        <Card elevation="med">
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2}>
                {grid!.resource.name}, {formatDateKey(dateKey)}
              </Heading>
              <Text>
                {formatHourShort(selection.chosen[0].startMin)} to {formatHourShort(selection.chosen[selection.chosen.length - 1].endMin)}: total{" "}
                <Text weight="bold">{formatINR(selection.total)}</Text>. Pay <Text weight="bold">{formatINR(advance)}</Text> now to confirm, the rest at the venue.
              </Text>
            </VStack>
            {selection.maxLen > 1 ? (
              <SegmentedControl label="Duration" value={hours} onChange={setHours}>
                {[1, 2, 3].filter((h) => h <= selection.maxLen).map((h) => (
                  <SegmentedControlItem key={h} value={String(h)} label={`${h} ${h === 1 ? "slot" : "slots"}`} />
                ))}
              </SegmentedControl>
            ) : null}
            <TextInput label="Your name" value={name} onChange={setName} autoComplete="name" width="100%" isRequired />
            <TextInput label="Mobile number" value={phone} onChange={setPhone} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" width="100%" isRequired />
            <CheckboxInput label="Split the payment among players" description="Each friend pays their share from a link you send on WhatsApp." value={split} onChange={setSplit} />
            {split ? (
              <TextInput
                label="Number of players"
                value={players}
                onChange={setPlayers}
                inputMode="numeric"
                width="100%"
                status={splitValid ? undefined : { type: "error", message: `${MIN_SPLIT} to ${MAX_SPLIT} players` }}
                description={splitValid ? `About ${formatINR(splitAmount(selection.total, playerCount)[playerCount - 1])} each. The slot confirms when shares cover the advance.` : undefined}
              />
            ) : null}
            <VStack gap={2}>
              <Text type="label">WhatsApp messages (optional, you can stop them any time)</Text>
              <CheckboxInput label={CONSENT_NOTICE.service_updates} value={consentService} onChange={setConsentService} />
              <CheckboxInput label={CONSENT_NOTICE.marketing} value={consentMarketing} onChange={setConsentMarketing} />
              <Text type="supporting">
                {data.venue.name} stores your name and number to manage your booking. The slot is held for {data.venue.holdMinutes} minutes while you pay.
              </Text>
            </VStack>
            {error ? <Banner status="error" title={error} /> : null}
            <Button
              label={`Hold slot and pay ${formatINR(advance)}`}
              variant="primary"
              size="lg"
              isDisabled={!name.trim() || !phone.trim() || (split && !splitValid)}
              clickAction={submit}
            />
          </VStack>
        </Card>
      ) : (
        <Text type="supporting">Pick an open slot to book. Prices include peak, off-peak and weekend rates set by the venue.</Text>
      )}
    </VStack>
  );
}
