import { getDb } from "@/server/db/client";
import { handle, oneOf, readBody, str } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { completePayment } from "@/server/store/bookings";

/**
 * Simulated payment gateway callback. In production this is the gateway webhook, verified by
 * signature. The ref is an unguessable token issued by the checkout call.
 */
export async function POST(request: Request) {
  return handle(async () => {
    rateLimit(request, "public-pay", 20);
    const body = await readBody(request);
    return completePayment(await getDb(), str(body, "ref", 80), oneOf(body, "outcome", ["success", "failure"] as const));
  });
}
