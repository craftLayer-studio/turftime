"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { ScrollableArea } from "@astryxdesign/core/ScrollableArea";
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { SOURCE_LABEL, formatDateKey, formatHourShort, formatINR, weekdayName, type BookingSource, type RevenueSummary } from "@/domain";
import type { Dashboard } from "@/server/store/reports";
import styles from "./owner.module.css";

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <VStack gap={1}>
        <Text type="supporting">{label}</Text>
        <Text size="3xl" weight="bold">
          {value}
        </Text>
        {note ? <Text type="supporting">{note}</Text> : null}
      </VStack>
    </Card>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const heatClass = (v: number | null) => (v === null ? styles.heatNone : styles[`heat${Math.min(5, Math.ceil(v * 5))}`]);
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

type PeriodRow = { id: string; period: string } & RevenueSummary;

export function OwnerDashboard({ data, venueName }: { data: Dashboard; venueName: string }) {
  const periods: PeriodRow[] = [
    { id: "today", period: "Today", ...data.today },
    { id: "7", period: "Last 7 days", ...data.last7 },
    { id: "28", period: "Last 28 days", ...data.last28 },
  ];
  const sources = Object.entries(data.last28.bySource).sort((a, b) => b[1] - a[1]);
  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={1}>{venueName}</Heading>
        <Text type="supporting">Owner dashboard. Money is what was collected (advance, shares and balance) minus refunds.</Text>
      </VStack>

      <Grid columns={{ minWidth: 200, repeat: "fit" }} gap={4}>
        <Kpi label="Collected today" value={formatINR(data.today.collectedPaise)} note={`${data.upcomingToday} more bookings later today`} />
        <Kpi label="Collected, 28 days" value={formatINR(data.last28.collectedPaise)} note={`Advance ${formatINR(data.last28.advancePaise)}, balance ${formatINR(data.last28.balancePaise)}`} />
        <Kpi label="Utilisation, 28 days" value={pct(data.overallUtilisation)} note="Booked court-hours over open court-hours" />
        <Kpi label="No-show rate, 28 days" value={pct(data.last28.noShowRate)} note={`${data.last28.noShows} no-shows`} />
        <Kpi label="Recovered by fill offers" value={formatINR(data.last28.fillOfferRevenuePaise)} note={`${data.last28.fillOfferBookings} offer bookings`} />
        <Kpi label="Repeat players" value={`${data.players.repeat} of ${data.players.total}`} note={`${data.players.marketingOptIn} opted in to offers`} />
      </Grid>

      <VStack gap={3}>
        <Heading level={2}>Utilisation heatmap</Heading>
        <Text type="supporting">
          Share of court-hours booked, by weekday and hour, {formatDateKey(data.heatmapFrom)} to {formatDateKey(data.heatmapTo)}. Darker is busier. Empty afternoons are where fill offers help.
        </Text>
        <ScrollableArea label="Utilisation heatmap">
          <Table density="compact" dividers="none">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Day</TableHeaderCell>
                {data.heatmap.hours.map((h) => (
                  <TableHeaderCell key={h}>{formatHourShort(h)}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {DOW_ORDER.map((dow) => (
                <TableRow key={dow}>
                  <TableCell>
                    <Text weight="semibold">{weekdayName(dow)}</Text>
                  </TableCell>
                  {data.heatmap.rows[dow].map((v, i) => (
                    <TableCell key={i}>
                      <VStack padding={1} hAlign="center" className={`${styles.cell} ${heatClass(v)}`}>
                        <Text size="xsm" color="inherit">
                          {v === null ? "" : pct(v)}
                        </Text>
                      </VStack>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollableArea>
      </VStack>

      <Grid columns={{ minWidth: 320, max: 2, repeat: "fit" }} gap={4}>
        <Card>
          <VStack gap={3}>
            <Heading level={2}>Revenue</Heading>
            <Table
              data={periods}
              idKey="id"
              density="compact"
              columns={[
                { key: "period", header: "Period" },
                { key: "collectedPaise", header: "Collected", renderCell: (r) => formatINR(r.collectedPaise) },
                { key: "advancePaise", header: "Advance online", renderCell: (r) => formatINR(r.advancePaise) },
                { key: "balancePaise", header: "Balance at venue", renderCell: (r) => formatINR(r.balancePaise) },
                { key: "refundedPaise", header: "Refunds", renderCell: (r) => formatINR(r.refundedPaise) },
              ]}
            />
          </VStack>
        </Card>
        <Card>
          <VStack gap={3}>
            <Heading level={2}>Bookings and no-shows</Heading>
            <Table
              data={periods}
              idKey="id"
              density="compact"
              columns={[
                { key: "period", header: "Period" },
                { key: "bookings", header: "Bookings" },
                { key: "noShows", header: "No-shows" },
                { key: "noShowRate", header: "No-show rate", renderCell: (r) => pct(r.noShowRate) },
              ]}
            />
            <Text type="label">Where bookings came from (28 days)</Text>
            <HStack gap={2} wrap="wrap">
              {sources.map(([source, n]) => (
                <Badge key={source} variant={source === "online" ? "info" : "neutral"} label={`${SOURCE_LABEL[source as BookingSource]}: ${n}`} />
              ))}
            </HStack>
          </VStack>
        </Card>
      </Grid>
    </VStack>
  );
}
