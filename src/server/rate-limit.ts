import { StoreError } from "./store/errors";

/** In-memory fixed-window limiter for public endpoints. One process only; fine for the MVP. */
const windows = new Map<string, { count: number; resetAt: number }>();

export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local").slice(0, 64);
}

export function rateLimit(request: Request, bucket: string, limit: number, windowMs = 60_000, now = Date.now()): void {
  const key = `${bucket}:${clientKey(request)}`;
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    }
    return;
  }
  w.count += 1;
  if (w.count > limit) throw new StoreError(429, "Too many requests. Please wait a minute.");
}
