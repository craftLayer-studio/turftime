import { getDb } from "@/server/db/client";
import { seedDemo, wipe } from "@/server/db/seed";
import { handle } from "@/server/http";
import { endSession, requireApiSession } from "@/server/session";
import { StoreError } from "@/server/store/errors";
import { getOrg } from "@/server/store/venue";

/** Reset the demo venue to fresh demo data. Only for the demo org. */
export async function POST() {
  return handle(async () => {
    const s = await requireApiSession(["owner"]);
    const db = await getDb();
    if (!(await getOrg(db, s.orgId)).isDemo) throw new StoreError(403, "Only the demo venue can be reset");
    await wipe(db);
    await seedDemo(db);
    await endSession();
    return { ok: true };
  });
}
