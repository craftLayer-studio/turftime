import { and, eq, gte, lt } from "drizzle-orm";
import { addDays, istDateKey, istToEpoch, summarise, utilisationHeatmap, type BookingSource, type BookingStatus, type Heatmap, type ReportPayment, type RevenueSummary } from "@/domain";
import type { Db } from "../db/client";
import { bookings, payments } from "../db/schema";
import { listCrm } from "./players";
import { listResources } from "./venue";

export interface Dashboard {
  today: RevenueSummary;
  last7: RevenueSummary;
  last28: RevenueSummary;
  heatmap: Heatmap;
  heatmapFrom: string;
  heatmapTo: string;
  upcomingToday: number;
  players: { total: number; repeat: number; marketingOptIn: number };
  overallUtilisation: number;
}

export async function dashboard(db: Db, orgId: string, now = Date.now()): Promise<Dashboard> {
  const today = istDateKey(now);
  const from28 = addDays(today, -27);
  const start = new Date(istToEpoch(from28, 0));
  const end = new Date(istToEpoch(addDays(today, 1), 0));
  const [res, brows, prows, crm] = await Promise.all([
    listResources(db, orgId),
    db.select().from(bookings).where(and(eq(bookings.orgId, orgId), gte(bookings.startsAt, start), lt(bookings.startsAt, end))),
    db.select().from(payments).where(and(eq(payments.orgId, orgId), eq(payments.status, "paid"), gte(payments.createdAt, start), lt(payments.createdAt, end))),
    listCrm(db, orgId, now),
  ]);
  const rb = brows.map((b) => ({
    resourceId: b.resourceId,
    startsAt: b.startsAt.getTime(),
    endsAt: b.endsAt.getTime(),
    status: b.status as BookingStatus,
    source: b.source as BookingSource,
    totalPaise: b.totalPaise,
    offerId: b.offerId,
  }));
  const rp: ReportPayment[] = prows.map((p) => ({ kind: p.kind as ReportPayment["kind"], amountPaise: p.amountPaise, at: p.createdAt.getTime() }));
  const endMs = end.getTime();
  const heatmap = utilisationHeatmap(res, rb, from28, today);
  const cells = heatmap.rows.flat().filter((v): v is number => v !== null);
  return {
    today: summarise(rb, rp, istToEpoch(today, 0), endMs),
    last7: summarise(rb, rp, istToEpoch(addDays(today, -6), 0), endMs),
    last28: summarise(rb, rp, start.getTime(), endMs),
    heatmap,
    heatmapFrom: from28,
    heatmapTo: today,
    upcomingToday: rb.filter((b) => b.status === "confirmed" && b.startsAt > now && istDateKey(b.startsAt) === today).length,
    players: { total: crm.length, repeat: crm.filter((p) => p.visits >= 2).length, marketingOptIn: crm.filter((p) => p.consent.marketing).length },
    overallUtilisation: cells.length ? cells.reduce((a, b) => a + b, 0) / cells.length : 0,
  };
}
