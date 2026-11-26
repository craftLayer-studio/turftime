import type { Metadata } from "next";
import { ownerPage } from "@/components/owner/OwnerPage";
import { SettingsPanel } from "@/components/owner/Settings";
import { listPriceRules, listResources } from "@/server/store/venue";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return ownerPage("/owner/settings", async ({ db, org }) => {
    const [resources, rules] = await Promise.all([listResources(db, org.id, true), listPriceRules(db, org.id)]);
    return (
      <SettingsPanel
        data={{
          venue: { advancePercent: org.advancePercent, minAdvancePaise: org.minAdvancePaise, holdMinutes: org.holdMinutes, upiVpa: org.upiVpa, isDemo: org.isDemo },
          resources: resources.map((r) => ({ id: r.id, name: r.name, sport: r.sport, slotMinutes: r.slotMinutes, openMin: r.openMin, closeMin: r.closeMin, basePricePaise: r.basePricePaise, active: r.active })),
          rules: [...rules].sort((a, b) => b.priority - a.priority),
        }}
      />
    );
  });
}
