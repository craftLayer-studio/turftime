import { isDateKey, istDateKey } from "@/domain";
import { getDb } from "@/server/db/client";
import { BadRequest, handle } from "@/server/http";
import { requireApiSession } from "@/server/session";
import { bookingsForDate } from "@/server/store/bookings";
import { bookableDates, venueGrid } from "@/server/store/venue";

export async function GET(request: Request) {
  return handle(async () => {
    const s = await requireApiSession();
    const now = Date.now();
    const date = new URL(request.url).searchParams.get("date") ?? istDateKey(now);
    if (!isDateKey(date)) throw new BadRequest("Invalid date");
    const db = await getDb();
    const [grids, list] = await Promise.all([venueGrid(db, s.orgId, date, now), bookingsForDate(db, s.orgId, date)]);
    return { date, dates: bookableDates(now), grids, bookings: list, now };
  });
}
