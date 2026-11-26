"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Table, proportional } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { formatIstDateTime, formatPhone, waMeLink } from "@/domain";
import { api } from "@/lib/api";

export type OutboxRow = { id: string; toPhone: string; template: string; kind: string; status: string; body: string; sendAfter: number; sentAt: number | null; error: string | null };

const STATUS_VARIANT: Record<string, "success" | "warning" | "neutral" | "error"> = { sent: "success", scheduled: "warning", skipped: "neutral", failed: "error" };

export function Outbox({ rows }: { rows: OutboxRow[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <VStack gap={4}>
      <HStack hAlign="between" vAlign="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Heading level={1}>WhatsApp outbox</Heading>
          <Text type="supporting">Simulated: nothing leaves this server. A WhatsApp Business adapter would send these same rows. Messages without consent are kept as skipped.</Text>
        </VStack>
        <Button
          label="Send due messages now"
          variant="secondary"
          clickAction={async () => {
            const r = await api<{ sent: number; skipped: number }>("/api/owner/outbox/dispatch", { body: {} });
            setMsg(`Sent ${r.sent}, skipped ${r.skipped}.`);
            router.refresh();
          }}
        />
      </HStack>
      {msg ? <Banner status="info" title={msg} isDismissable onDismiss={() => setMsg(null)} /> : null}
      <Table
        data={rows}
        idKey="id"
        density="compact"
        verticalAlign="top"
        columns={[
          { key: "sendAfter", header: "When", renderCell: (r) => formatIstDateTime(r.sentAt ?? r.sendAfter) },
          { key: "toPhone", header: "To", renderCell: (r) => formatPhone(r.toPhone) },
          { key: "template", header: "Type", renderCell: (r) => <Badge label={r.template.replace("_", " ")} variant={r.kind === "marketing" ? "purple" : "blue"} /> },
          { key: "status", header: "Status", renderCell: (r) => <VStack gap={0.5}><Badge label={r.status} variant={STATUS_VARIANT[r.status] ?? "neutral"} />{r.error ? <Text type="supporting">{r.error}</Text> : null}</VStack> },
          { key: "body", header: "Message", width: proportional(4), renderCell: (r) => <Text type="supporting">{r.body}</Text> },
          { key: "id", header: "", renderCell: (r) => <Button label="Open in WhatsApp" size="sm" variant="ghost" href={waMeLink(r.toPhone, r.body)} target="_blank" rel="noopener noreferrer" /> },
        ]}
        emptyState={<Text type="supporting">No messages yet.</Text>}
      />
    </VStack>
  );
}
