import { getDb } from "@/server/db/client";
import { bool, handle, readBody } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { optOutByToken } from "@/server/store/players";

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    rateLimit(request, "public-optout", 10);
    const { token } = await ctx.params;
    const body = await readBody(request);
    await optOutByToken(await getDb(), token, bool(body, "all") ? ["marketing", "service_updates"] : ["marketing"], Date.now());
    return { ok: true };
  });
}
