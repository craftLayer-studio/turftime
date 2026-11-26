import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { bookingView } from "@/server/store/bookings";

export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    rateLimit(request, "public-booking", 120);
    const { token } = await ctx.params;
    return bookingView(await getDb(), token);
  });
}
