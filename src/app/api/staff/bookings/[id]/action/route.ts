import { getDb } from "@/server/db/client";
import { bool, handle, oneOf, readBody } from "@/server/http";
import { requireApiSession } from "@/server/session";
import { cancelByStaff, collectBalance, markPlayed } from "@/server/store/bookings";

/** Staff actions on a booking: mark played or no-show, collect the balance, cancel. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireApiSession();
    const { id } = await ctx.params;
    const body = await readBody(request);
    const action = oneOf(body, "action", ["completed", "no_show", "collect", "cancel"] as const);
    const db = await getDb();
    if (action === "completed" || action === "no_show") {
      await markPlayed(db, s, id, action);
      return { ok: true };
    }
    if (action === "collect") return collectBalance(db, s, id, oneOf(body, "method", ["cash", "upi"] as const));
    return cancelByStaff(db, s, id, bool(body, "venueFault"));
  });
}
