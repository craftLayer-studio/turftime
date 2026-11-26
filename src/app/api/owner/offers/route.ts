import { getDb } from "@/server/db/client";
import { handle, int, readBody, str } from "@/server/http";
import { requireApiSession } from "@/server/session";
import { sendFillOffer } from "@/server/store/offers";

export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireApiSession(["owner"]);
    const body = await readBody(request);
    return sendFillOffer(await getDb(), s, {
      resourceId: str(body, "resourceId", 64),
      dateKey: str(body, "date", 10),
      startMin: int(body, "startMin", 0, 1440),
      discountPercent: int(body, "discountPercent", 5, 50),
    });
  });
}
