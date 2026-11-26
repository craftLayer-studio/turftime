import { getDb } from "@/server/db/client";
import { bool, handle, oneOf, optStr, readBody, str } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { startCheckout } from "@/server/store/bookings";

/** Start a payment for the advance, a top-up or one split share. The server sets the amount. */
export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    rateLimit(request, "public-checkout", 20);
    const { token } = await ctx.params;
    const body = await readBody(request);
    const purpose = oneOf(body, "purpose", ["advance", "share"] as const);
    const hasPayer = typeof body.name === "string" && body.name !== "";
    return startCheckout(await getDb(), token, {
      purpose,
      shareId: optStr(body, "shareId", 64),
      payer: hasPayer
        ? { name: str(body, "name", 80), phone: str(body, "phone", 25), consentService: bool(body, "consentService"), consentMarketing: bool(body, "consentMarketing") }
        : undefined,
    });
  });
}
