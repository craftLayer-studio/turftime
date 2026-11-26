import { getDb } from "@/server/db/client";
import { bool, handle, int, readBody } from "@/server/http";
import { requireApiSession } from "@/server/session";
import { updateResource } from "@/server/store/settings";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireApiSession(["owner"]);
    const { id } = await ctx.params;
    const body = await readBody(request);
    await updateResource(await getDb(), s, id, {
      basePricePaise: int(body, "basePricePaise", 0, 10_000_000),
      openMin: int(body, "openMin", 0, 1440),
      closeMin: int(body, "closeMin", 0, 1440),
      active: body.active === undefined ? true : bool(body, "active"),
    });
    return { ok: true };
  });
}
