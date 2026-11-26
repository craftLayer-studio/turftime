"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { TAG_LABEL, formatINR, formatIstDateTime, formatPhone, waMeLink } from "@/domain";
import type { CrmRow } from "@/server/store/players";
import { api } from "@/lib/api";

const FILTERS = { all: "All", repeat: "Repeat", lapsed: "Lapsed", offers: "Offers opt-in" } as const;
type Filter = keyof typeof FILTERS;

export function PlayersCrm({ rows }: { rows: CrmRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const shown = rows.filter((r) => {
    if (filter === "repeat" && r.visits < 2) return false;
    if (filter === "lapsed" && !r.tags.includes("lapsed")) return false;
    if (filter === "offers" && !r.consent.marketing) return false;
    const s = q.trim().toLowerCase();
    return !s || r.name.toLowerCase().includes(s) || r.phone.includes(s.replace(/\s/g, ""));
  });

  async function setConsent(id: string, purpose: "marketing" | "service_updates", granted: boolean) {
    await api(`/api/owner/players/${id}/consent`, { body: { purpose, granted } });
    router.refresh();
  }

  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={1}>Players</Heading>
        <Text type="supporting">
          Every player who booked or paid a share, keyed by mobile number. {rows.filter((r) => r.visits >= 2).length} of {rows.length} are repeat players. Consent is recorded separately for booking messages and offers.
        </Text>
      </VStack>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <SegmentedControl label="Filter players" value={filter} onChange={(v) => setFilter(v as Filter)}>
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <SegmentedControlItem key={f} value={f} label={FILTERS[f]} />
          ))}
        </SegmentedControl>
        <TextInput label="Search" isLabelHidden placeholder="Search name or phone" value={q} onChange={setQ} startIcon="search" />
      </HStack>
      <Table
        data={shown}
        idKey="id"
        density="compact"
        hasHover
        columns={[
          {
            key: "name",
            header: "Player",
            renderCell: (r) => (
              <VStack gap={0.5}>
                <Text weight="semibold">{r.name}</Text>
                <Text type="supporting">{formatPhone(r.phone)}</Text>
              </VStack>
            ),
          },
          { key: "visits", header: "Visits" },
          { key: "noShows", header: "No-shows" },
          { key: "spendPaise", header: "Spend", renderCell: (r) => formatINR(r.spendPaise) },
          { key: "lastVisitAt", header: "Last played", renderCell: (r) => (r.lastVisitAt ? formatIstDateTime(r.lastVisitAt) : "-") },
          {
            key: "tags",
            header: "Tags",
            renderCell: (r) => (
              <HStack gap={1} wrap="wrap">
                {r.tags.map((t) => (
                  <Badge key={t} label={TAG_LABEL[t]} variant={t === "no_show_risk" ? "error" : t === "lapsed" ? "warning" : t === "loyal" ? "success" : "neutral"} />
                ))}
              </HStack>
            ),
          },
          {
            key: "consent",
            header: "Consent",
            renderCell: (r) => (
              <VStack gap={1}>
                <Badge label={r.consent.service_updates ? "Booking msgs: yes" : "Booking msgs: no"} variant={r.consent.service_updates ? "success" : "neutral"} />
                <Badge label={r.consent.marketing ? "Offers: yes" : "Offers: no"} variant={r.consent.marketing ? "success" : "neutral"} />
              </VStack>
            ),
          },
          {
            key: "id",
            header: "Actions",
            renderCell: (r) => (
              <HStack gap={1} wrap="wrap">
                <Button label="WhatsApp" size="sm" variant="secondary" href={waMeLink(r.phone, `Hi ${r.name.split(" ")[0]}, `)} target="_blank" rel="noopener noreferrer" />
                {r.consent.marketing ? (
                  <Button label="Stop offers" size="sm" variant="ghost" clickAction={() => setConsent(r.id, "marketing", false)} tooltip="Record that this player asked to stop offers" />
                ) : null}
              </HStack>
            ),
          },
        ]}
        emptyState={<Text type="supporting">No players match.</Text>}
      />
    </VStack>
  );
}
