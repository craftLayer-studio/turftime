import { getDb } from "@/server/db/client";
import { handle, readBody, str } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { startSession } from "@/server/session";
import { verifyOtp } from "@/server/store/auth";

export async function POST(request: Request) {
  return handle(async () => {
    rateLimit(request, "auth-verify", 20);
    const body = await readBody(request);
    const user = await verifyOtp(await getDb(), str(body, "phone", 25), str(body, "code", 6));
    await startSession(user);
    return { role: user.role, name: user.name };
  });
}
