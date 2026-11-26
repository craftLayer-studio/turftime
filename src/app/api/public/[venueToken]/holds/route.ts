import { getDb } from "@/server/db/client";
import { bool, handle, int, optStr, readBody, str } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createHold } from "@/server/store/bookings";

/** Hold a slot (7 minutes by default) while the player pays the advance. */
export async function POST(request: Request, ctx: { params: Promise<{ venueToken: string }> }) {
  return handle(async () => {
    rateLimit(request, "public-hold", 10);
    const { venueToken } = await ctx.params;
    const body = await readBody(request);
    const db = await getDb();
    return createHold(db, venueToken, {
      resourceId: str(body, "resourceId", 64),
      dateKey: str(body, "date", 10),
      startMin: int(body, "startMin", 0, 1440),
      slots: int(body, "slots", 1, 6),
      name: str(body, "name", 80),
      phone: str(body, "phone", 25),
      consentService: bool(body, "consentService"),
      consentMarketing: bool(body, "consentMarketing"),
      splitCount: int(body, "splitCount", 1, 22),
      offerToken: optStr(body, "offerToken", 64),
    });
  });
}
