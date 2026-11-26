import { getDb } from "@/server/db/client";
import { handle, int, readBody, str } from "@/server/http";
import { requireApiSession } from "@/server/session";
import { updateVenueSettings } from "@/server/store/settings";

export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireApiSession(["owner"]);
    const body = await readBody(request);
    await updateVenueSettings(await getDb(), s, {
      advancePercent: int(body, "advancePercent", 0, 100),
      minAdvancePaise: int(body, "minAdvancePaise", 0, 1_000_000),
      holdMinutes: int(body, "holdMinutes", 3, 30),
      upiVpa: str(body, "upiVpa", 100),
    });
    return { ok: true };
  });
}
