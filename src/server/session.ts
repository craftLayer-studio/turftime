import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { StaffActor } from "./store/bookings";
import { StoreError } from "./store/errors";

/**
 * Staff/owner session: an httpOnly cookie holding a signed payload (HMAC-SHA256).
 * The secret comes from SESSION_SECRET; a dev fallback is used (with a warning) when it is missing.
 */
const COOKIE = "tt_session";
const TTL_MS = 12 * 3_600_000;
const DEV_SECRET = "turftime-dev-only-secret-change-me";
let warned = false;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (!warned) {
    console.warn("[turftime] SESSION_SECRET is missing or shorter than 32 characters; using the dev fallback. Set it in production.");
    warned = true;
  }
  return DEV_SECRET;
}

export interface Session extends StaffActor {
  name: string;
  exp: number;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function encodeSession(s: Session): string {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value: string | undefined, now = Date.now()): Session | null {
  if (!value) return null;
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (typeof s.exp !== "number" || s.exp < now) return null;
    if (s.role !== "owner" && s.role !== "staff") return null;
    return s;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

export async function startSession(actor: StaffActor & { name: string }): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, encodeSession({ ...actor, exp: Date.now() + TTL_MS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** For route handlers: 401 without a session, 403 when the role is not allowed. */
export async function requireApiSession(roles: StaffActor["role"][] = ["owner", "staff"]): Promise<Session> {
  const s = await getSession();
  if (!s) throw new StoreError(401, "Please sign in");
  if (!roles.includes(s.role)) throw new StoreError(403, "Only the owner can do this");
  return s;
}

/** For pages: redirect to the login page without a session; staff are sent to /staff from owner pages. */
export async function requirePageSession(roles: StaffActor["role"][], next: string): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!roles.includes(s.role)) redirect("/staff");
  return s;
}
