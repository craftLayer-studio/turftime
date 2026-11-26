import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * TurfTime schema. Every business row carries org_id and every query filters by it.
 * Money is integer paise. Times are UTC timestamptz.
 *
 * No double booking is guaranteed by `slot_claims`: one row per (resource, slot start), primary key
 * on exactly that pair. A booking (or hold) inserts one claim per slot it covers inside the same
 * transaction that creates it. A second booking for the same slot fails on the primary key, whatever
 * the channel (online, phone, walk-in, marketplace block). Cancelled and expired bookings delete
 * their claims, which frees the slot.
 */
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const orgs = pgTable("orgs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  mapsUrl: text("maps_url"),
  upiVpa: text("upi_vpa").notNull(),
  /** Unguessable token in the public booking URL /b/<token> (printed on the QR). */
  publicToken: text("public_token").notNull().unique(),
  advancePercent: integer("advance_percent").notNull().default(30),
  minAdvancePaise: integer("min_advance_paise").notNull().default(30000),
  holdMinutes: integer("hold_minutes").notNull().default(7),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const resources = pgTable(
  "resources",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    name: text("name").notNull(),
    sport: text("sport").notNull(),
    slotMinutes: integer("slot_minutes").notNull(),
    openMin: integer("open_min").notNull(),
    closeMin: integer("close_min").notNull(),
    basePricePaise: integer("base_price_paise").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    index("resources_org_idx").on(t.orgId),
    check("resources_hours_ck", sql`${t.openMin} >= 0 and ${t.closeMin} <= 1440 and ${t.openMin} < ${t.closeMin}`),
    check("resources_slot_ck", sql`${t.slotMinutes} in (30, 60, 90)`),
    check("resources_price_ck", sql`${t.basePricePaise} >= 0`),
  ],
);

export const priceRules = pgTable(
  "price_rules",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    resourceId: text("resource_id").references(() => resources.id),
    kind: text("kind").notNull(),
    /** Comma-separated days of week, 0 = Sunday. Empty = every day. */
    days: text("days").notNull().default(""),
    startMin: integer("start_min").notNull(),
    endMin: integer("end_min").notNull(),
    onDate: text("on_date"),
    pricePaise: integer("price_paise").notNull(),
    priority: integer("priority").notNull().default(10),
  },
  (t) => [index("price_rules_org_idx").on(t.orgId), check("price_rules_price_ck", sql`${t.pricePaise} >= 0`)],
);

export const staffUsers = pgTable(
  "staff_users",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull(),
  },
  (t) => [uniqueIndex("staff_users_phone_uq").on(t.phone), check("staff_users_role_ck", sql`${t.role} in ('owner', 'staff')`)],
);

export const otpCodes = pgTable("otp_codes", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const players = pgTable(
  "players",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    /** E.164, e.g. +919876543210. Unique per org. */
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    /** Token for the self-serve opt-out link. */
    optOutToken: text("opt_out_token").notNull().unique(),
    lastMarketingAt: ts("last_marketing_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("players_org_phone_uq").on(t.orgId, t.phone)],
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    playerId: text("player_id").notNull().references(() => players.id),
    purpose: text("purpose").notNull(),
    granted: boolean("granted").notNull(),
    noticeVersion: text("notice_version").notNull(),
    channel: text("channel").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("consent_player_idx").on(t.orgId, t.playerId), check("consent_purpose_ck", sql`${t.purpose} in ('service_updates', 'marketing')`)],
);

export const offers = pgTable(
  "offers",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    resourceId: text("resource_id").notNull().references(() => resources.id),
    startsAt: ts("starts_at").notNull(),
    discountPercent: integer("discount_percent").notNull(),
    pricePaise: integer("price_paise").notNull(),
    wasPaise: integer("was_paise").notNull(),
    token: text("token").notNull().unique(),
    sentCount: integer("sent_count").notNull().default(0),
    redeemedBookingId: text("redeemed_booking_id"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("offers_org_idx").on(t.orgId)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    resourceId: text("resource_id").notNull().references(() => resources.id),
    /** Captain. Null for staff blocks (marketplace bookings, maintenance). */
    playerId: text("player_id").references(() => players.id),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    source: text("source").notNull(),
    status: text("status").notNull(),
    totalPaise: integer("total_paise").notNull(),
    advancePaise: integer("advance_paise").notNull(),
    /** Online money received (advance, shares, top-ups) net of nothing; refunds are separate payments. */
    paidPaise: integer("paid_paise").notNull().default(0),
    /** Balance collected at the venue. */
    balancePaidPaise: integer("balance_paid_paise").notNull().default(0),
    refundedPaise: integer("refunded_paise").notNull().default(0),
    splitCount: integer("split_count").notNull().default(1),
    holdExpiresAt: ts("hold_expires_at"),
    /** Unguessable token for the player's booking page /p/<token> (also the split-pay link). */
    publicToken: text("public_token").notNull().unique(),
    offerId: text("offer_id").references(() => offers.id),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("bookings_org_start_idx").on(t.orgId, t.startsAt),
    index("bookings_player_idx").on(t.orgId, t.playerId),
    check("bookings_status_ck", sql`${t.status} in ('held', 'confirmed', 'completed', 'no_show', 'cancelled', 'expired')`),
    check("bookings_source_ck", sql`${t.source} in ('online', 'phone', 'walkin', 'marketplace', 'block')`),
    check("bookings_money_ck", sql`${t.totalPaise} >= 0 and ${t.advancePaise} >= 0 and ${t.paidPaise} >= 0 and ${t.balancePaidPaise} >= 0 and ${t.refundedPaise} >= 0`),
    check("bookings_time_ck", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

/** The double-booking guard. See the note at the top of this file. */
export const slotClaims = pgTable(
  "slot_claims",
  {
    orgId: text("org_id").notNull().references(() => orgs.id),
    resourceId: text("resource_id").notNull().references(() => resources.id),
    startsAt: ts("starts_at").notNull(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id),
  },
  (t) => [primaryKey({ name: "slot_claims_pk", columns: [t.resourceId, t.startsAt] }), index("slot_claims_booking_idx").on(t.bookingId)],
);

export const splitShares = pgTable(
  "split_shares",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id),
    position: integer("position").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    status: text("status").notNull().default("pending"),
    payerName: text("payer_name"),
    playerId: text("player_id").references(() => players.id),
    paidAt: ts("paid_at"),
  },
  (t) => [uniqueIndex("split_shares_pos_uq").on(t.bookingId, t.position), check("split_status_ck", sql`${t.status} in ('pending', 'paid')`)],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id),
    shareId: text("share_id").references(() => splitShares.id),
    kind: text("kind").notNull(),
    method: text("method").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    status: text("status").notNull(),
    gatewayRef: text("gateway_ref"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("payments_org_idx").on(t.orgId, t.createdAt),
    uniqueIndex("payments_gateway_ref_uq").on(t.gatewayRef),
    check("payments_kind_ck", sql`${t.kind} in ('advance', 'share', 'balance', 'refund')`),
    check("payments_amount_ck", sql`${t.amountPaise} > 0`),
  ],
);

/** Simulated messaging outbox. A real WhatsApp adapter would read the same rows. */
export const outbox = pgTable(
  "outbox",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    channel: text("channel").notNull(),
    kind: text("kind").notNull(),
    template: text("template").notNull(),
    toPhone: text("to_phone").notNull(),
    playerId: text("player_id").references(() => players.id),
    bookingId: text("booking_id").references(() => bookings.id),
    offerId: text("offer_id").references(() => offers.id),
    body: text("body").notNull(),
    status: text("status").notNull(),
    sendAfter: ts("send_after").notNull(),
    sentAt: ts("sent_at"),
    error: text("error"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("outbox_org_idx").on(t.orgId, t.createdAt), check("outbox_status_ck", sql`${t.status} in ('scheduled', 'sent', 'skipped', 'failed')`)],
);
