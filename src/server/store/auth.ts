import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { normalizeIndianPhone } from "@/domain";
import type { Db } from "../db/client";
import { otpCodes, staffUsers } from "../db/schema";
import { StoreError } from "./errors";
import { newId } from "./ids";

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_10_MIN = 5;

const hash = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");

/** Demo mode shows the OTP on screen (labelled demo) instead of sending an SMS. On unless DEMO_MODE=0. */
export function demoMode(): boolean {
  return process.env.DEMO_MODE !== "0";
}

export async function requestOtp(db: Db, phoneInput: string, now = Date.now()): Promise<{ phone: string; demoCode: string | null }> {
  const phone = normalizeIndianPhone(phoneInput);
  if (!phone) throw new StoreError(400, "Enter a valid Indian mobile number");
  const recent = await db.select({ id: otpCodes.id }).from(otpCodes).where(and(eq(otpCodes.phone, phone), gte(otpCodes.createdAt, new Date(now - 10 * 60_000))));
  if (recent.length >= MAX_CODES_PER_10_MIN) throw new StoreError(429, "Too many codes requested. Wait a few minutes.");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(otpCodes).values({ id: newId("otp"), phone, codeHash: hash(phone, code), expiresAt: new Date(now + OTP_TTL_MS), createdAt: new Date(now) });
  // A real SMS/WhatsApp OTP adapter would send `code` here. Same response whether or not the number has an account.
  return { phone, demoCode: demoMode() ? code : null };
}

export async function verifyOtp(db: Db, phoneInput: string, code: string, now = Date.now()) {
  const phone = normalizeIndianPhone(phoneInput);
  if (!phone || !/^\d{6}$/.test(code)) throw new StoreError(400, "Enter the 6-digit code");
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.usedAt), gte(otpCodes.expiresAt, new Date(now))))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!otp || otp.attempts >= MAX_ATTEMPTS) throw new StoreError(401, "Code expired. Request a new one.");
  const ok = timingSafeEqual(Buffer.from(otp.codeHash), Buffer.from(hash(phone, code)));
  if (!ok) {
    await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
    throw new StoreError(401, "Wrong code");
  }
  await db.update(otpCodes).set({ usedAt: new Date(now) }).where(eq(otpCodes.id, otp.id));
  const [user] = await db.select().from(staffUsers).where(eq(staffUsers.phone, phone));
  if (!user) throw new StoreError(403, "This number is not registered as staff at any venue");
  return { userId: user.id, orgId: user.orgId, role: user.role as "owner" | "staff", name: user.name };
}

export async function getStaffUser(db: Db, userId: string, orgId: string) {
  const [u] = await db.select().from(staffUsers).where(and(eq(staffUsers.id, userId), eq(staffUsers.orgId, orgId)));
  return u ?? null;
}
