import { getDb } from "@/server/db/client";
import { handle, readBody, str } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { requestOtp } from "@/server/store/auth";

export async function POST(request: Request) {
  return handle(async () => {
    rateLimit(request, "auth-otp", 10);
    const body = await readBody(request);
    return requestOtp(await getDb(), str(body, "phone", 25));
  });
}
