import type { Metadata } from "next";
import { Outbox } from "@/components/owner/Outbox";
import { ownerPage } from "@/components/owner/OwnerPage";
import { listOutbox } from "@/server/store/messaging";

export const metadata: Metadata = { title: "WhatsApp outbox" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  return ownerPage("/owner/messages", async ({ db, org }) => {
    const rows = await listOutbox(db, org.id, 60);
    return (
      <Outbox
        rows={rows.map((r) => ({ id: r.id, toPhone: r.toPhone, template: r.template, kind: r.kind, status: r.status, body: r.body, sendAfter: r.sendAfter.getTime(), sentAt: r.sentAt?.getTime() ?? null, error: r.error }))}
      />
    );
  });
}
