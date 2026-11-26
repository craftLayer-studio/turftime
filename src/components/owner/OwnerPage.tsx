import type { ReactNode } from "react";
import { AppFrame } from "@/components/AppFrame";
import { getDb, type Db } from "@/server/db/client";
import { requirePageSession, type Session } from "@/server/session";
import { getOrg, type OrgRow } from "@/server/store/venue";

/** Load the owner session and venue, then render inside the app frame. */
export async function ownerPage(path: string, render: (ctx: { db: Db; session: Session; org: OrgRow }) => Promise<ReactNode>) {
  const session = await requirePageSession(["owner"], path);
  const db = await getDb();
  const org = await getOrg(db, session.orgId);
  return (
    <AppFrame session={session} isDemo={org.isDemo}>
      {await render({ db, session, org })}
    </AppFrame>
  );
}
