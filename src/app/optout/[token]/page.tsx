import type { Metadata } from "next";
import { Center } from "@astryxdesign/core/Center";
import { getDb } from "@/server/db/client";
import { playerByOptOutToken } from "@/server/store/players";
import { getOrg } from "@/server/store/venue";
import { OptOutForm } from "@/components/OptOutForm";

export const metadata: Metadata = { title: "Stop messages", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OptOutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb();
  let venue: string | null = null;
  try {
    const p = await playerByOptOutToken(db, token);
    venue = (await getOrg(db, p.orgId)).name;
  } catch {
    venue = null;
  }
  return (
    <Center role="main" axis="both" padding={6} minHeight="100dvh">
      <OptOutForm token={token} venue={venue} />
    </Center>
  );
}
