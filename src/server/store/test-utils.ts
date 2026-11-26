import { eq } from "drizzle-orm";
import { addDays, istDateKey, istToEpoch } from "@/domain";
import { createPgliteDb, type Db } from "../db/client";
import { orgs } from "../db/schema";
import { DEMO_ORG_ID, seedDemo } from "../db/seed";
import type { StaffActor } from "./bookings";

/** Fixed clock: Wed 25 Nov 2026, 9:00 am IST. */
export const NOW = istToEpoch("2026-11-25", 9 * 60);
export const TODAY = istDateKey(NOW);
/** A date five days out, with no seeded bookings (seed covers up to tomorrow). */
export const LATER = addDays(TODAY, 5);

export const OWNER: StaffActor = { userId: "su_owner", orgId: DEMO_ORG_ID, role: "owner" };
export const STAFF: StaffActor = { userId: "su_staff", orgId: DEMO_ORG_ID, role: "staff" };

export async function demoDb(): Promise<{ db: Db; venueToken: string }> {
  const db = await createPgliteDb();
  await seedDemo(db, NOW);
  const [org] = await db.select().from(orgs).where(eq(orgs.id, DEMO_ORG_ID));
  return { db, venueToken: org.publicToken };
}

export const player = (n: number) => ({
  name: `Test Player ${n}`,
  phone: `98${String(76543210 + n).padStart(8, "0")}`,
  consentService: true,
  consentMarketing: false,
});
