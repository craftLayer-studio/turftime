import type { Metadata } from "next";
import { AppFrame } from "@/components/AppFrame";
import { StaffDesk } from "@/components/StaffDesk";
import { getDb } from "@/server/db/client";
import { requirePageSession } from "@/server/session";
import { getOrg } from "@/server/store/venue";

export const metadata: Metadata = { title: "Booking desk" };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const s = await requirePageSession(["owner", "staff"], "/staff");
  const org = await getOrg(await getDb(), s.orgId);
  return (
    <AppFrame session={s} isDemo={org.isDemo}>
      <StaffDesk />
    </AppFrame>
  );
}
