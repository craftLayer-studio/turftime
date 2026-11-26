import type { Metadata } from "next";
import { OwnerDashboard } from "@/components/owner/Dashboard";
import { ownerPage } from "@/components/owner/OwnerPage";
import { dispatchDue } from "@/server/store/messaging";
import { dashboard } from "@/server/store/reports";

export const metadata: Metadata = { title: "Owner dashboard" };
export const dynamic = "force-dynamic";

export default async function OwnerHome() {
  return ownerPage("/owner", async ({ db, org }) => {
    // Simulated scheduler: send any reminders that came due since the last visit.
    await dispatchDue(db, org.id, Date.now());
    return <OwnerDashboard data={await dashboard(db, org.id)} venueName={org.name} />;
  });
}
