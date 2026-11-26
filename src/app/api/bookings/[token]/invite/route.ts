import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { splitInvite } from "@/server/store/bookings";

/** Text for the captain's WhatsApp share (opened through a wa.me link on the captain's phone). */
export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    rateLimit(request, "public-invite", 30);
    const { token } = await ctx.params;
    return { text: await splitInvite(await getDb(), token) };
  });
}
