import { CONSENT_PURPOSES } from "@/domain";
import { getDb } from "@/server/db/client";
import { bool, handle, oneOf, readBody } from "@/server/http";
import { requireApiSession } from "@/server/session";
import { setConsent } from "@/server/store/players";

/** Owner records a withdrawal (or a consent the player gave in person) for one purpose. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const s = await requireApiSession(["owner"]);
    const { id } = await ctx.params;
    const body = await readBody(request);
    await setConsent(await getDb(), s.orgId, id, oneOf(body, "purpose", CONSENT_PURPOSES), bool(body, "granted"), "owner", Date.now());
    return { ok: true };
  });
}
