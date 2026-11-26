import { getDb } from "@/server/db/client";
import { handle } from "@/server/http";
import { requireApiSession } from "@/server/session";
import { deletePriceRule } from "@/server/store/settings";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireApiSession(["owner"]);
    const { id } = await ctx.params;
    await deletePriceRule(await getDb(), s, id);
    return { ok: true };
  });
}
