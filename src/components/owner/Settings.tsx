"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { VStack } from "@astryxdesign/core/VStack";
import { PRICE_KINDS, PRICE_KIND_LABEL, formatINR, formatMinute, weekdayName, type PriceKind } from "@/domain";
import { api } from "@/lib/api";

export type SettingsData = {
  venue: { advancePercent: number; minAdvancePaise: number; holdMinutes: number; upiVpa: string; isDemo: boolean };
  resources: { id: string; name: string; sport: string; slotMinutes: number; openMin: number; closeMin: number; basePricePaise: number; active: boolean }[];
  rules: { id: string; resourceId: string | null; kind: string; days: number[]; startMin: number; endMin: number; onDate: string | null; pricePaise: number; priority: number }[];
};

const HOURS = Array.from({ length: 25 }, (_, h) => ({ value: String(h * 60), label: h === 24 ? "Midnight" : formatMinute(h * 60) }));
const rupeesToPaise = (v: string) => Math.round(Number(v) * 100);
const PRIORITY: Record<PriceKind, number> = { offpeak: 10, peak: 10, weekend: 20, holiday: 30 };

export function SettingsPanel({ data }: { data: SettingsData }) {
  const router = useRouter();
  const [venue, setVenue] = useState({ advancePercent: String(data.venue.advancePercent), minAdvance: String(data.venue.minAdvancePaise / 100), holdMinutes: String(data.venue.holdMinutes), upiVpa: data.venue.upiVpa });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [edit, setEdit] = useState<SettingsData["resources"][number] | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editOpen, setEditOpen] = useState("360");
  const [editClose, setEditClose] = useState("1440");
  const [rule, setRule] = useState({ kind: "peak" as PriceKind, resourceId: "all", days: ["1", "2", "3", "4", "5"], start: "1080", end: "1380", price: "1400", onDate: "" });
  const names = new Map(data.resources.map((r) => [r.id, r.name]));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  return (
    <VStack gap={6}>
      <Heading level={1}>Settings</Heading>
      {msg ? <Banner status={msg.ok ? "success" : "error"} title={msg.text} isDismissable onDismiss={() => setMsg(null)} /> : null}

      <Card>
        <VStack gap={4}>
          <Heading level={2}>Advance and payments</Heading>
          <Grid columns={{ minWidth: 200, repeat: "fit" }} gap={4}>
            <TextInput label="Advance (% of total)" inputMode="numeric" value={venue.advancePercent} onChange={(v) => setVenue({ ...venue, advancePercent: v })} />
            <TextInput label="Minimum advance (₹)" inputMode="numeric" value={venue.minAdvance} onChange={(v) => setVenue({ ...venue, minAdvance: v })} />
            <TextInput label="Hold time (minutes)" inputMode="numeric" value={venue.holdMinutes} onChange={(v) => setVenue({ ...venue, holdMinutes: v })} />
            <TextInput label="Venue UPI ID" value={venue.upiVpa} onChange={(v) => setVenue({ ...venue, upiVpa: v })} description="Players pay you directly. TurfTime never holds the money." />
          </Grid>
          <HStack>
            <Button
              label="Save"
              variant="primary"
              clickAction={() =>
                run(
                  () => api("/api/owner/settings", { body: { advancePercent: Number(venue.advancePercent), minAdvancePaise: rupeesToPaise(venue.minAdvance), holdMinutes: Number(venue.holdMinutes), upiVpa: venue.upiVpa.trim() } }),
                  "Payment settings saved.",
                )
              }
            />
          </HStack>
        </VStack>
      </Card>

      <VStack gap={3}>
        <Heading level={2}>Courts and turfs</Heading>
        <Table
          data={data.resources}
          idKey="id"
          density="compact"
          columns={[
            { key: "name", header: "Name" },
            { key: "sport", header: "Sport" },
            { key: "slotMinutes", header: "Slot", renderCell: (r) => `${r.slotMinutes} min` },
            { key: "openMin", header: "Hours", renderCell: (r) => `${formatMinute(r.openMin)} to ${formatMinute(r.closeMin)}` },
            { key: "basePricePaise", header: "Standard price", renderCell: (r) => formatINR(r.basePricePaise) },
            {
              key: "id",
              header: "",
              renderCell: (r) => (
                <Button
                  label="Edit"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEdit(r);
                    setEditPrice(String(r.basePricePaise / 100));
                    setEditOpen(String(r.openMin));
                    setEditClose(String(r.closeMin));
                  }}
                />
              ),
            },
          ]}
        />
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>Price rules</Heading>
        <Text type="supporting">The matching rule with the highest priority sets the slot price: holiday beats weekend beats peak and off-peak. No match uses the standard price.</Text>
        <Table
          data={data.rules}
          idKey="id"
          density="compact"
          columns={[
            { key: "kind", header: "Type", renderCell: (r) => <Badge label={PRICE_KIND_LABEL[r.kind as PriceKind]} variant={r.kind === "peak" ? "orange" : r.kind === "offpeak" ? "blue" : r.kind === "weekend" ? "purple" : "red"} /> },
            { key: "resourceId", header: "Court", renderCell: (r) => (r.resourceId ? names.get(r.resourceId) ?? "" : "All courts") },
            { key: "days", header: "When", renderCell: (r) => (r.onDate ? r.onDate : r.days.length === 0 ? "Every day" : r.days.map(weekdayName).join(", ")) },
            { key: "startMin", header: "Time", renderCell: (r) => `${formatMinute(r.startMin)} to ${formatMinute(r.endMin)}` },
            { key: "pricePaise", header: "Price", renderCell: (r) => formatINR(r.pricePaise) },
            { key: "priority", header: "Priority" },
            { key: "onDate", header: "", renderCell: (r) => <Button label="Delete" size="sm" variant="ghost" clickAction={() => run(() => api(`/api/owner/price-rules/${r.id}`, { method: "DELETE" }), "Rule deleted.")} /> },
          ]}
        />
        <Card variant="muted">
          <VStack gap={3}>
            <Heading level={3}>Add a rule</Heading>
            <Grid columns={{ minWidth: 180, repeat: "fit" }} gap={3}>
              <Selector label="Type" value={rule.kind} options={PRICE_KINDS.map((k) => ({ value: k, label: PRICE_KIND_LABEL[k] }))} onChange={(v) => v && setRule({ ...rule, kind: v as PriceKind })} />
              <Selector label="Court" value={rule.resourceId} options={[{ value: "all", label: "All courts" }, ...data.resources.map((r) => ({ value: r.id, label: r.name }))]} onChange={(v) => v && setRule({ ...rule, resourceId: v })} />
              <Selector label="From" value={rule.start} options={HOURS.slice(0, 24)} onChange={(v) => v && setRule({ ...rule, start: v })} />
              <Selector label="Until" value={rule.end} options={HOURS.slice(1)} onChange={(v) => v && setRule({ ...rule, end: v })} />
              <TextInput label="Price (₹ per slot)" inputMode="numeric" value={rule.price} onChange={(v) => setRule({ ...rule, price: v })} />
              {rule.kind === "holiday" ? <TextInput label="Date (YYYY-MM-DD)" value={rule.onDate} onChange={(v) => setRule({ ...rule, onDate: v })} /> : null}
            </Grid>
            {rule.kind !== "holiday" ? (
              <ToggleButtonGroup label="Days" type="multiple" value={rule.days} onChange={(v) => setRule({ ...rule, days: (v as string[]) ?? [] })} size="sm">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <ToggleButton key={d} value={String(d)} label={weekdayName(d)} />
                ))}
              </ToggleButtonGroup>
            ) : null}
            <HStack>
              <Button
                label="Add rule"
                variant="primary"
                clickAction={() =>
                  run(
                    () =>
                      api("/api/owner/price-rules", {
                        body: {
                          kind: rule.kind,
                          resourceId: rule.resourceId === "all" ? undefined : rule.resourceId,
                          days: rule.kind === "holiday" ? [] : rule.days.map(Number),
                          startMin: Number(rule.start),
                          endMin: Number(rule.end),
                          onDate: rule.kind === "holiday" ? rule.onDate : undefined,
                          pricePaise: rupeesToPaise(rule.price),
                          priority: PRIORITY[rule.kind],
                        },
                      }),
                    "Rule added.",
                  )
                }
              />
            </HStack>
          </VStack>
        </Card>
      </VStack>

      {data.venue.isDemo ? (
        <Card variant="muted">
          <VStack gap={2}>
            <Heading level={2}>Demo data</Heading>
            <Text type="supporting">Reset the demo venue to fresh sample bookings and players. You will be signed out.</Text>
            <HStack>
              <Button
                label="Reset demo data"
                variant="destructive"
                clickAction={async () => {
                  await api("/api/owner/demo-reset", { body: {} });
                  router.push("/demo");
                }}
              />
            </HStack>
          </VStack>
        </Card>
      ) : null}

      <Dialog isOpen={edit !== null} onOpenChange={(o) => !o && setEdit(null)} purpose="form" padding={6}>
        {edit ? (
          <VStack gap={3}>
            <Heading level={2}>{edit.name}</Heading>
            <TextInput label="Standard price (₹ per slot)" inputMode="numeric" value={editPrice} onChange={setEditPrice} width="100%" />
            <Selector label="Opens" value={editOpen} options={HOURS.slice(0, 24)} onChange={(v) => v && setEditOpen(v)} width="100%" />
            <Selector label="Closes" value={editClose} options={HOURS.slice(1)} onChange={(v) => v && setEditClose(v)} width="100%" />
            <Button
              label="Save"
              variant="primary"
              clickAction={async () => {
                const id = edit.id;
                setEdit(null);
                await run(() => api(`/api/owner/resources/${id}`, { body: { basePricePaise: rupeesToPaise(editPrice), openMin: Number(editOpen), closeMin: Number(editClose) } }), "Court saved.");
              }}
            />
          </VStack>
        ) : null}
      </Dialog>
    </VStack>
  );
}
