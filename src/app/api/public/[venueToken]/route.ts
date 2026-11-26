import { isDateKey, istDateKey } from "@/domain";
import { getDb } from "@/server/db/client";
import { BadRequest, handle } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { offerByToken } from "@/server/store/offers";
import { bookableDates, getOrgByPublicToken, venueGrid } from "@/server/store/venue";

/** Public venue page data: venue, bookable dates and the live slot grid for one date. */
export async function GET(request: Request, ctx: { params: Promise<{ venueToken: string }> }) {
  return handle(async () => {
    rateLimit(request, "public-venue", 120);
    const { venueToken } = await ctx.params;
    const url = new URL(request.url);
    const now = Date.now();
    const date = url.searchParams.get("date") ?? istDateKey(now);
    if (!isDateKey(date) || !bookableDates(now).includes(date)) throw new BadRequest("Pick a date within the booking window");
    const db = await getDb();
    const org = await getOrgByPublicToken(db, venueToken);
    const grids = await venueGrid(db, org.id, date, now);
    const offerToken = url.searchParams.get("offer");
    const offer = offerToken ? await offerByToken(db, org.id, offerToken.slice(0, 64)) : null;
    return {
      venue: { name: org.name, city: org.city, address: org.address, isDemo: org.isDemo, advancePercent: org.advancePercent, minAdvancePaise: org.minAdvancePaise, holdMinutes: org.holdMinutes },
      date,
      dates: bookableDates(now),
      grids,
      offer: offer && !offer.redeemedBookingId ? { resourceId: offer.resourceId, startsAt: offer.startsAt.getTime(), pricePaise: offer.pricePaise, wasPaise: offer.wasPaise, discountPercent: offer.discountPercent } : null,
    };
  });
}
