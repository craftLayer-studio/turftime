import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { requireApiSession } from "@/server/session";
import { dispatchDue } from "@/server/store/messaging";

/** Send every due message through the simulated WhatsApp adapter (a cron job in production). */
export async function POST() {
  return handle(async () => {
    const s = await requireApiSession(["owner"]);
    return dispatchDue(await getDb(), s.orgId, Date.now());
  });
}
