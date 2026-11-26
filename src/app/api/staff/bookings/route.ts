import { getDb } from "@/server/db/client";
import { bool, handle, int, oneOf, optStr, readBody, str } from "@/server/http";
import { requireApiSession } from "@/server/session";
import { createStaffBooking, STAFF_PAYMENT, STAFF_SOURCES } from "@/server/store/bookings";

/** Phone or walk-in booking, or a marketplace block, on the shared calendar. */
export async function POST(request: Request) {
  return handle(async () => {
    const s = await requireApiSession();
    const body = await readBody(request);
    return createStaffBooking(await getDb(), s, {
      resourceId: str(body, "resourceId", 64),
      dateKey: str(body, "date", 10),
      startMin: int(body, "startMin", 0, 1440),
      slots: int(body, "slots", 1, 6),
      source: oneOf(body, "source", STAFF_SOURCES),
      name: optStr(body, "name", 80),
      phone: optStr(body, "phone", 25),
      consentService: bool(body, "consentService"),
      consentMarketing: bool(body, "consentMarketing"),
      payment: oneOf(body, "payment", STAFF_PAYMENT),
      note: optStr(body, "note", 200),
    });
  });
}
