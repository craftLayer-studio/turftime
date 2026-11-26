import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { cancelByPlayer } from "@/server/store/bookings";

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    rateLimit(request, "public-cancel", 10);
    const { token } = await ctx.params;
    return cancelByPlayer(await getDb(), token);
  });
}
