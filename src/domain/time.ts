/**
 * Time helpers. Instants are epoch milliseconds (stored as UTC timestamptz).
 * Venue-local dates and times are India Standard Time (UTC+5:30, no daylight saving).
 * A "date key" is a venue-local calendar date as "YYYY-MM-DD".
 * A "minute of day" is minutes since venue-local midnight (0 to 1440).
 */
export const IST_OFFSET_MINUTES = 330;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const OFFSET_MS = IST_OFFSET_MINUTES * MINUTE_MS;

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateKey(value: string): boolean {
  const m = DATE_KEY_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

/** Venue-local date of an instant. */
export function istDateKey(epochMs: number): string {
  return new Date(epochMs + OFFSET_MS).toISOString().slice(0, 10);
}

/** Venue-local minute of day of an instant. */
export function istMinuteOfDay(epochMs: number): number {
  const local = epochMs + OFFSET_MS;
  return Math.floor((((local % DAY_MS) + DAY_MS) % DAY_MS) / MINUTE_MS);
}

/** Instant for a venue-local date and minute of day. */
export function istToEpoch(dateKey: string, minuteOfDay: number): number {
  if (!isDateKey(dateKey)) throw new Error(`Invalid date ${dateKey}`);
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d) + minuteOfDay * MINUTE_MS - OFFSET_MS;
}

/** Day of week for a date key: 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((istToEpoch(b, 0) - istToEpoch(a, 0)) / DAY_MS);
}

/** 1080 -> "6:00 pm", 0 -> "12:00 am", 1440 -> "12:00 am". */
export function formatMinute(minuteOfDay: number): string {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const suffix = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${suffix}`;
}

/** Compact hour label: 1080 -> "6 pm", 1110 -> "6:30 pm". */
export function formatHourShort(minuteOfDay: number): string {
  const text = formatMinute(minuteOfDay);
  return text.replace(":00", "");
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function weekdayName(dow: number): string {
  return WEEKDAYS[dow] ?? "?";
}

/** "2026-11-25" -> "Wed 25 Nov". */
export function formatDateKey(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${weekdayName(dayOfWeek(dateKey))} ${d} ${MONTHS[m - 1]}`;
}

/** Venue-local date and time of an instant: "Wed 25 Nov, 6:00 pm". */
export function formatIstDateTime(epochMs: number): string {
  return `${formatDateKey(istDateKey(epochMs))}, ${formatMinute(istMinuteOfDay(epochMs))}`;
}
