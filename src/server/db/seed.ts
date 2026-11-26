import { sql } from "drizzle-orm";
import {
  addDays,
  computeAdvance,
  CONSENT_PURPOSES,
  confirmationText,
  dayOfWeek,
  istDateKey,
  istToEpoch,
  NOTICE_VERSION,
  priceForRange,
  reminderText,
  slotStarts,
  splitAmount,
  type PriceRule,
} from "@/domain";
import { newId, newToken } from "../store/ids";
import { appUrl } from "../store/urls";
import type { Db } from "./client";
import { bookings, consentRecords, orgs, outbox, payments, players, priceRules, resources, slotClaims, splitShares, staffUsers } from "./schema";

/**
 * Fictional demo venue with Indian data. Every name and number here is made up.
 * Phones use the +91 90001 xxxxx range so they cannot be mistaken for real contacts.
 */
export const DEMO_ORG_ID = "org_demo";
export const DEMO_OWNER_PHONE = "+919000000001";
export const DEMO_STAFF_PHONE = "+919000000002";

const FIRST = [
  "Karthik", "Ananya", "Rohan", "Priya", "Aditya", "Sneha", "Vikram", "Meera", "Arjun", "Kavya", "Siddharth", "Pooja", "Rahul", "Neha",
  "Aman", "Divya", "Harsh", "Ishita", "Nikhil", "Tanvi", "Saurabh", "Riya", "Kunal", "Shruti", "Yash", "Aditi", "Manish", "Gauri",
  "Omkar", "Lavanya", "Farhan", "Zoya", "Tejas", "Ira", "Dev", "Sana",
];
const LAST = ["Iyer", "Rao", "Deshpande", "Nair", "Joshi", "Patil", "Singh", "Kulkarni", "Menon", "Reddy", "Jain", "Shinde", "Gupta", "Bhosale", "Verma", "Pillai", "Mehta", "Chawla", "Pawar", "Gokhale", "Mishra", "Sharma"];
/** 90 fictional players: first names cycle through the list, surnames are spread so names stay distinct. */
const PLAYER_NAMES = Array.from({ length: 90 }, (_, i) => `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length]}`);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function chunked<T>(rows: T[], size: number, fn: (part: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

export async function isEmpty(db: Db): Promise<boolean> {
  const rows = await db.select({ id: orgs.id }).from(orgs).limit(1);
  return rows.length === 0;
}

export async function seedIfEmpty(db: Db, now = Date.now()): Promise<boolean> {
  if (!(await isEmpty(db))) return false;
  await seedDemo(db, now);
  return true;
}

/** Remove all rows (demo reset). Order respects foreign keys. */
export async function wipe(db: Db): Promise<void> {
  await db.execute(sql`truncate table outbox, payments, split_shares, slot_claims, bookings, offers, consent_records, players, otp_codes, staff_users, price_rules, resources, orgs`);
}

export async function seedDemo(db: Db, now = Date.now()): Promise<{ publicToken: string }> {
  const rand = rng(20261125);
  const publicToken = newToken();
  const orgId = DEMO_ORG_ID;
  await db.insert(orgs).values({
    id: orgId,
    name: "TurfTime Demo Arena",
    city: "Pune",
    address: "Plot 14, Demo Lane, Baner, Pune 411045 (fictional)",
    mapsUrl: null,
    upiVpa: "demoarena@okdemo",
    publicToken,
    advancePercent: 30,
    minAdvancePaise: 30000,
    holdMinutes: 7,
    isDemo: true,
    createdAt: new Date(now - 60 * 86_400_000),
  });
  await db.insert(staffUsers).values([
    { id: "su_owner", orgId, phone: DEMO_OWNER_PHONE, name: "Sandeep Kulkarni", role: "owner" },
    { id: "su_staff", orgId, phone: DEMO_STAFF_PHONE, name: "Imran Shaikh", role: "staff" },
  ]);
  const res = [
    { id: "res_cricket", name: "Box Cricket A", sport: "Box cricket", slotMinutes: 60, openMin: 360, closeMin: 1440, basePricePaise: 100000, sortOrder: 1 },
    { id: "res_football", name: "Football 5s Turf", sport: "Football", slotMinutes: 60, openMin: 360, closeMin: 1440, basePricePaise: 120000, sortOrder: 2 },
    { id: "res_badminton", name: "Badminton Court 1", sport: "Badminton", slotMinutes: 60, openMin: 360, closeMin: 1320, basePricePaise: 40000, sortOrder: 3 },
    { id: "res_pickleball", name: "Pickleball Court 1", sport: "Pickleball", slotMinutes: 60, openMin: 360, closeMin: 1320, basePricePaise: 50000, sortOrder: 4 },
  ];
  await db.insert(resources).values(res.map((r) => ({ ...r, orgId, active: true })));

  const weekdays = [1, 2, 3, 4, 5];
  const rules: PriceRule[] = [
    { id: "pr_c_peak", resourceId: "res_cricket", kind: "peak", days: weekdays, startMin: 1080, endMin: 1380, onDate: null, pricePaise: 140000, priority: 10 },
    { id: "pr_c_off", resourceId: "res_cricket", kind: "offpeak", days: weekdays, startMin: 360, endMin: 960, onDate: null, pricePaise: 70000, priority: 10 },
    { id: "pr_c_wknd", resourceId: "res_cricket", kind: "weekend", days: [0, 6], startMin: 360, endMin: 1440, onDate: null, pricePaise: 150000, priority: 20 },
    { id: "pr_f_peak", resourceId: "res_football", kind: "peak", days: weekdays, startMin: 1080, endMin: 1380, onDate: null, pricePaise: 160000, priority: 10 },
    { id: "pr_f_off", resourceId: "res_football", kind: "offpeak", days: weekdays, startMin: 360, endMin: 960, onDate: null, pricePaise: 80000, priority: 10 },
    { id: "pr_f_wknd", resourceId: "res_football", kind: "weekend", days: [0, 6], startMin: 360, endMin: 1440, onDate: null, pricePaise: 180000, priority: 20 },
    { id: "pr_b_peak", resourceId: "res_badminton", kind: "peak", days: [], startMin: 1080, endMin: 1320, onDate: null, pricePaise: 55000, priority: 10 },
    { id: "pr_p_peak", resourceId: "res_pickleball", kind: "peak", days: [], startMin: 1080, endMin: 1320, onDate: null, pricePaise: 65000, priority: 10 },
    { id: "pr_xmas", resourceId: null, kind: "holiday", days: [], startMin: 360, endMin: 1440, onDate: `${istDateKey(now).slice(0, 4)}-12-25`, pricePaise: 180000, priority: 30 },
  ];
  await db.insert(priceRules).values(rules.map((r) => ({ ...r, orgId, days: r.days.join(",") })));

  // Players with consent records (most opt in to service updates, about 60% to offers).
  const playerRows = PLAYER_NAMES.map((name, i) => ({
    id: `pl_demo_${String(i + 1).padStart(2, "0")}`,
    orgId,
    phone: `+9190001${String(10000 + i * 137).padStart(5, "0")}`,
    name,
    optOutToken: newToken(),
    createdAt: new Date(now - (40 + i) * 86_400_000),
  }));
  await db.insert(players).values(playerRows);
  const consentRows: (typeof consentRecords.$inferInsert)[] = [];
  playerRows.forEach((p, i) => {
    for (const purpose of CONSENT_PURPOSES) {
      const grant = purpose === "service_updates" ? i % 10 !== 9 : i % 5 < 3;
      if (grant) consentRows.push({ id: newId("cr"), orgId, playerId: p.id, purpose, granted: true, noticeVersion: NOTICE_VERSION, channel: "booking_page", createdAt: p.createdAt });
    }
  });
  await db.insert(consentRecords).values(consentRows);
  const consent = new Map(playerRows.map((p, i) => [p.id, { service: i % 10 !== 9 }]));

  // Players 1-12 are regulars, 13-40 come now and then, the rest rarely and appear far more often.
  const pickPlayer = () => {
    const r = rand();
    const idx = r < 0.45 ? Math.floor(rand() * 12) : r < 0.75 ? 12 + Math.floor(rand() * 28) : 40 + Math.floor(rand() * (playerRows.length - 40));
    return playerRows[idx];
  };

  const today = istDateKey(now);
  const bookingRows: (typeof bookings.$inferInsert)[] = [];
  const claimRows: (typeof slotClaims.$inferInsert)[] = [];
  const paymentRows: (typeof payments.$inferInsert)[] = [];
  const outboxRows: (typeof outbox.$inferInsert)[] = [];
  const H = 3_600_000;
  const venueName = "TurfTime Demo Arena";

  for (let d = addDays(today, -27); d <= addDays(today, 1); d = addDays(d, 1)) {
    const weekend = [0, 6].includes(dayOfWeek(d));
    for (const r of res) {
      for (const m of slotStarts(r)) {
        const startsAt = istToEpoch(d, m);
        const hour = m / 60;
        let p = hour >= 18 ? (weekend ? 0.85 : 0.72) : hour >= 16 ? 0.35 : hour < 9 ? 0.45 : weekend ? 0.5 : 0.12;
        if (r.id === "res_badminton" || r.id === "res_pickleball") p *= hour < 9 || hour >= 18 ? 1 : 0.8;
        const future = startsAt > now;
        if (future) p *= 0.55;
        if (rand() >= p) continue;

        const roll = rand();
        const source = roll < 0.55 ? "online" : roll < 0.75 ? "phone" : roll < 0.9 ? "walkin" : "marketplace";
        const block = source === "marketplace";
        const player = block ? null : pickPlayer();
        const total = block ? 0 : priceForRange(r, rules, d, [m]);
        const advance = source === "online" ? computeAdvance(total, { advancePercent: 30, minAdvancePaise: 30000 }) : 0;
        let status = "confirmed";
        if (!future) {
          const s = rand();
          status = block ? "completed" : s < 0.04 ? "no_show" : s < 0.07 ? "cancelled" : "completed";
          if (startsAt + r.slotMinutes * 60_000 > now && status !== "cancelled") status = "confirmed";
        }
        const id = newId("bk");
        const createdAt = startsAt - Math.round((1 + rand() * 47) * H);
        const paid = advance;
        const balancePaid = status === "completed" && !block ? total - paid : 0;
        const refunded = status === "cancelled" ? paid : 0;
        bookingRows.push({
          id,
          orgId,
          resourceId: r.id,
          playerId: player?.id ?? null,
          startsAt: new Date(startsAt),
          endsAt: new Date(startsAt + r.slotMinutes * 60_000),
          source,
          status,
          totalPaise: total,
          advancePaise: advance,
          paidPaise: paid,
          balancePaidPaise: balancePaid,
          refundedPaise: refunded,
          publicToken: newToken(),
          note: block ? "Marketplace booking (blocked by staff)" : null,
          createdBy: source === "online" ? null : "su_staff",
          createdAt: new Date(Math.min(createdAt, now)),
          updatedAt: new Date(Math.min(createdAt, now)),
        });
        if (status !== "cancelled") claimRows.push({ orgId, resourceId: r.id, startsAt: new Date(startsAt), bookingId: id });
        if (paid > 0) paymentRows.push({ id: newId("pay"), orgId, bookingId: id, kind: "advance", method: "upi", amountPaise: paid, status: "paid", gatewayRef: `seed_${id}`, createdAt: new Date(Math.min(createdAt, now)) });
        if (balancePaid > 0) paymentRows.push({ id: newId("pay"), orgId, bookingId: id, kind: "balance", method: rand() < 0.6 ? "upi" : "cash", amountPaise: balancePaid, status: "paid", createdAt: new Date(startsAt + r.slotMinutes * 60_000) });
        if (refunded > 0) paymentRows.push({ id: newId("pay"), orgId, bookingId: id, kind: "refund", method: "upi", amountPaise: refunded, status: "paid", createdAt: new Date(Math.min(startsAt - 26 * H, now)) });

        if (player && consent.get(player.id)?.service && startsAt > now - 2 * 86_400_000) {
          const input = { venueName, resourceName: r.name, startsAt, playerName: player.name.split(" ")[0], totalPaise: total, paidPaise: paid, link: `${appUrl()}/p/${bookingRows[bookingRows.length - 1].publicToken}` };
          outboxRows.push({ id: newId("msg"), orgId, channel: "whatsapp", kind: "utility", template: "confirmation", toPhone: player.phone, playerId: player.id, bookingId: id, body: confirmationText(input), status: "sent", sendAfter: new Date(Math.min(createdAt, now)), sentAt: new Date(Math.min(createdAt, now)), createdAt: new Date(Math.min(createdAt, now)) });
          if (status === "confirmed" && startsAt - 3 * H > now) {
            outboxRows.push({ id: newId("msg"), orgId, channel: "whatsapp", kind: "utility", template: "reminder", toPhone: player.phone, playerId: player.id, bookingId: id, body: reminderText(input), status: "scheduled", sendAfter: new Date(startsAt - 3 * H), createdAt: new Date(Math.min(createdAt, now)) });
          }
        }
      }
    }
  }

  // One split-pay booking tomorrow evening: 10 players, 5 have paid, which covers the advance.
  const tomorrow = addDays(today, 1);
  const splitStart = istToEpoch(tomorrow, 21 * 60);
  const taken = claimRows.some((c) => c.resourceId === "res_football" && (c.startsAt as Date).getTime() === splitStart);
  if (!taken) {
    const total = priceForRange(res[1], rules, tomorrow, [21 * 60]);
    const advance = computeAdvance(total, { advancePercent: 30, minAdvancePaise: 30000 });
    const shares = splitAmount(total, 10);
    const paid = shares.slice(0, 5).reduce((a, b) => a + b, 0);
    const id = "bk_demo_split";
    bookingRows.push({ id, orgId, resourceId: "res_football", playerId: playerRows[0].id, startsAt: new Date(splitStart), endsAt: new Date(splitStart + H), source: "online", status: paid >= advance ? "confirmed" : "held", totalPaise: total, advancePaise: advance, paidPaise: paid, splitCount: 10, publicToken: newToken(), createdAt: new Date(now - 5 * H), updatedAt: new Date(now - 4 * H) });
    claimRows.push({ orgId, resourceId: "res_football", startsAt: new Date(splitStart), bookingId: id });
    shares.forEach((amount, i) => {
      paymentRows.push(...(i < 5 ? [{ id: newId("pay"), orgId, bookingId: id, kind: "share", method: "upi", amountPaise: amount, status: "paid", gatewayRef: `seed_share_${i}`, createdAt: new Date(now - 4 * H) }] : []));
    });
    await chunked(bookingRows, 200, (part) => db.insert(bookings).values(part));
    await db.insert(splitShares).values(
      shares.map((amount, i) => ({ id: `sh_demo_${i}`, orgId, bookingId: id, position: i, amountPaise: amount, status: i < 5 ? "paid" : "pending", payerName: i < 5 ? playerRows[i].name : null, playerId: i < 5 ? playerRows[i].id : null, paidAt: i < 5 ? new Date(now - 4 * H) : null })),
    );
  } else {
    await chunked(bookingRows, 200, (part) => db.insert(bookings).values(part));
  }
  await chunked(claimRows, 300, (part) => db.insert(slotClaims).values(part));
  await chunked(paymentRows, 300, (part) => db.insert(payments).values(part));
  await chunked(outboxRows, 200, (part) => db.insert(outbox).values(part));
  return { publicToken };
}
