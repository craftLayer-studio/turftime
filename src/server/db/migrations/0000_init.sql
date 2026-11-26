CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"player_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"total_paise" integer NOT NULL,
	"advance_paise" integer NOT NULL,
	"paid_paise" integer DEFAULT 0 NOT NULL,
	"balance_paid_paise" integer DEFAULT 0 NOT NULL,
	"refunded_paise" integer DEFAULT 0 NOT NULL,
	"split_count" integer DEFAULT 1 NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"public_token" text NOT NULL,
	"offer_id" text,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_public_token_unique" UNIQUE("public_token"),
	CONSTRAINT "bookings_status_ck" CHECK ("bookings"."status" in ('held', 'confirmed', 'completed', 'no_show', 'cancelled', 'expired')),
	CONSTRAINT "bookings_source_ck" CHECK ("bookings"."source" in ('online', 'phone', 'walkin', 'marketplace', 'block')),
	CONSTRAINT "bookings_money_ck" CHECK ("bookings"."total_paise" >= 0 and "bookings"."advance_paise" >= 0 and "bookings"."paid_paise" >= 0 and "bookings"."balance_paid_paise" >= 0 and "bookings"."refunded_paise" >= 0),
	CONSTRAINT "bookings_time_ck" CHECK ("bookings"."ends_at" > "bookings"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"player_id" text NOT NULL,
	"purpose" text NOT NULL,
	"granted" boolean NOT NULL,
	"notice_version" text NOT NULL,
	"channel" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_purpose_ck" CHECK ("consent_records"."purpose" in ('service_updates', 'marketing'))
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"discount_percent" integer NOT NULL,
	"price_paise" integer NOT NULL,
	"was_paise" integer NOT NULL,
	"token" text NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"redeemed_booking_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"maps_url" text,
	"upi_vpa" text NOT NULL,
	"public_token" text NOT NULL,
	"advance_percent" integer DEFAULT 30 NOT NULL,
	"min_advance_paise" integer DEFAULT 30000 NOT NULL,
	"hold_minutes" integer DEFAULT 7 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orgs_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"channel" text NOT NULL,
	"kind" text NOT NULL,
	"template" text NOT NULL,
	"to_phone" text NOT NULL,
	"player_id" text,
	"booking_id" text,
	"offer_id" text,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"send_after" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_status_ck" CHECK ("outbox"."status" in ('scheduled', 'sent', 'skipped', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"share_id" text,
	"kind" text NOT NULL,
	"method" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"status" text NOT NULL,
	"gateway_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_kind_ck" CHECK ("payments"."kind" in ('advance', 'share', 'balance', 'refund')),
	CONSTRAINT "payments_amount_ck" CHECK ("payments"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"opt_out_token" text NOT NULL,
	"last_marketing_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_opt_out_token_unique" UNIQUE("opt_out_token")
);
--> statement-breakpoint
CREATE TABLE "price_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"resource_id" text,
	"kind" text NOT NULL,
	"days" text DEFAULT '' NOT NULL,
	"start_min" integer NOT NULL,
	"end_min" integer NOT NULL,
	"on_date" text,
	"price_paise" integer NOT NULL,
	"priority" integer DEFAULT 10 NOT NULL,
	CONSTRAINT "price_rules_price_ck" CHECK ("price_rules"."price_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"sport" text NOT NULL,
	"slot_minutes" integer NOT NULL,
	"open_min" integer NOT NULL,
	"close_min" integer NOT NULL,
	"base_price_paise" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "resources_hours_ck" CHECK ("resources"."open_min" >= 0 and "resources"."close_min" <= 1440 and "resources"."open_min" < "resources"."close_min"),
	CONSTRAINT "resources_slot_ck" CHECK ("resources"."slot_minutes" in (30, 60, 90)),
	CONSTRAINT "resources_price_ck" CHECK ("resources"."base_price_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "slot_claims" (
	"org_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"booking_id" text NOT NULL,
	CONSTRAINT "slot_claims_pk" PRIMARY KEY("resource_id","starts_at")
);
--> statement-breakpoint
CREATE TABLE "split_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"position" integer NOT NULL,
	"amount_paise" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payer_name" text,
	"player_id" text,
	"paid_at" timestamp with time zone,
	CONSTRAINT "split_status_ck" CHECK ("split_shares"."status" in ('pending', 'paid'))
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "staff_users_role_ck" CHECK ("staff_users"."role" in ('owner', 'staff'))
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_share_id_split_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."split_shares"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_org_start_idx" ON "bookings" USING btree ("org_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_player_idx" ON "bookings" USING btree ("org_id","player_id");--> statement-breakpoint
CREATE INDEX "consent_player_idx" ON "consent_records" USING btree ("org_id","player_id");--> statement-breakpoint
CREATE INDEX "offers_org_idx" ON "offers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "outbox_org_idx" ON "outbox" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_org_idx" ON "payments" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_gateway_ref_uq" ON "payments" USING btree ("gateway_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "players_org_phone_uq" ON "players" USING btree ("org_id","phone");--> statement-breakpoint
CREATE INDEX "price_rules_org_idx" ON "price_rules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "resources_org_idx" ON "resources" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "slot_claims_booking_idx" ON "slot_claims" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "split_shares_pos_uq" ON "split_shares" USING btree ("booking_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_users_phone_uq" ON "staff_users" USING btree ("phone");