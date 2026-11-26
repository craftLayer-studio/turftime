import type { Metadata } from "next";
import { ownerPage } from "@/components/owner/OwnerPage";
import { PlayersCrm } from "@/components/owner/Players";
import { listCrm } from "@/server/store/players";

export const metadata: Metadata = { title: "Players" };
export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  return ownerPage("/owner/players", async ({ db, org }) => <PlayersCrm rows={await listCrm(db, org.id, Date.now())} />);
}
