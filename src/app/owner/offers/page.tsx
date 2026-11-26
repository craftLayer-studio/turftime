import type { Metadata } from "next";
import { FillOffers } from "@/components/owner/Offers";
import { ownerPage } from "@/components/owner/OwnerPage";
import { audiencePreview, fillCandidates, listOffers } from "@/server/store/offers";
import { listResources } from "@/server/store/venue";

export const metadata: Metadata = { title: "Fill offers" };
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  return ownerPage("/owner/offers", async ({ db, org }) => {
    const now = Date.now();
    const [slots, offers, res, audience] = await Promise.all([fillCandidates(db, org.id, now), listOffers(db, org.id), listResources(db, org.id, true), audiencePreview(db, org.id, 900, now)]);
    const names = new Map(res.map((r) => [r.id, r.name]));
    return (
      <FillOffers
        slots={slots.map((s) => ({ ...s, id: `${s.resourceId}-${s.startsAt}` }))}
        audience={audience}
        offers={offers.map((o) => ({
          id: o.id,
          resourceName: names.get(o.resourceId) ?? "",
          startsAt: o.startsAt.getTime(),
          discountPercent: o.discountPercent,
          pricePaise: o.pricePaise,
          wasPaise: o.wasPaise,
          sentCount: o.sentCount,
          redeemed: o.redeemedBookingId !== null,
          createdAt: o.createdAt.getTime(),
        }))}
      />
    );
  });
}
