import { PRICE_KINDS } from "@/domain";
import { getDb } from "@/server/db/client";
import { handle, int, intArray, oneOf, optStr, readBody } from "@/server/http";
import { requireApiSession } from "@/server/session";
import { addPriceRule } from "@/server/store/settings";

export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireApiSession(["owner"]);
    const body = await readBody(request);
    const id = await addPriceRule(await getDb(), s, {
      resourceId: optStr(body, "resourceId", 64) ?? null,
      kind: oneOf(body, "kind", PRICE_KINDS),
      days: intArray(body, "days", 0, 6),
      startMin: int(body, "startMin", 0, 1440),
      endMin: int(body, "endMin", 0, 1440),
      onDate: optStr(body, "onDate", 10) ?? null,
      pricePaise: int(body, "pricePaise", 0, 10_000_000),
      priority: int(body, "priority", 0, 100),
    });
    return { id };
  });
}
