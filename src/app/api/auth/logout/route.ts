import { handle } from "@/server/http";
import { endSession } from "@/server/session";

export async function POST() {
  return handle(async () => {
    await endSession();
    return { ok: true };
  });
}
