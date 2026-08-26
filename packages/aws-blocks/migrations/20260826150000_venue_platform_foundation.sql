CREATE TABLE IF NOT EXISTS "venue_organization" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "venue_organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_location" (
  "address" text,
  "claimed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "discovery_place_id" text,
  "id" text PRIMARY KEY NOT NULL,
  "menu_url" text,
  "name" text NOT NULL,
  "organization_id" text NOT NULL REFERENCES "venue_organization"("id") ON DELETE CASCADE,
  "phone" text,
  "status" text DEFAULT 'unclaimed' NOT NULL,
  "submitted_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "stripe_account_id" text,
  "verified_at" timestamp,
  "website_url" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_location_discovery_place_id_idx" ON "venue_location" ("discovery_place_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_member" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "venue_organization"("id") ON DELETE CASCADE,
  "role" text DEFAULT 'staff' NOT NULL,
  "status" text DEFAULT 'invited' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "venue_member_organization_user_unique" UNIQUE("organization_id", "user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_contribution" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "media_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "reviewed_at" timestamp,
  "reviewed_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "submitted_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_contribution_location_status_idx" ON "venue_contribution" ("location_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_menu" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "extracted_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "published_at" timestamp,
  "reviewed_at" timestamp,
  "source_kind" text NOT NULL,
  "source_url" text,
  "status" text DEFAULT 'unverified' NOT NULL,
  "submitted_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_menu_location_status_idx" ON "venue_menu" ("location_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_media" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "source" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "uploaded_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_follow" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "venue_follow_location_user_unique" UNIQUE("location_id", "user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_referral" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "paid_at" timestamp,
  "referrer_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "reward_amount_cents" integer DEFAULT 5000 NOT NULL,
  "reward_payout_id" text,
  "status" text DEFAULT 'referred' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "venue_referral_location_referrer_unique" UNIQUE("location_id", "referrer_user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_referral_status_idx" ON "venue_referral" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_shift" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "end_at" timestamp NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "start_at" timestamp NOT NULL,
  "status" text DEFAULT 'scheduled' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_shift_location_time_idx" ON "venue_shift" ("location_id", "start_at", "end_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_shift_swap" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "manager_note" text,
  "replacement_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "requester_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "shift_id" text NOT NULL REFERENCES "venue_shift"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'requested' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_reservation" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "guest_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "notes" text,
  "party_size" integer NOT NULL,
  "assigned_staff_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "requested_at" timestamp NOT NULL,
  "status" text DEFAULT 'requested' NOT NULL,
  "table_label" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_reservation_location_time_idx" ON "venue_reservation" ("location_id", "requested_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_dining_session" (
  "ended_at" timestamp,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "reservation_id" text REFERENCES "venue_reservation"("id") ON DELETE SET NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "table_label" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_order" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "currency" text DEFAULT 'usd' NOT NULL,
  "dining_session_id" text REFERENCES "venue_dining_session"("id") ON DELETE SET NULL,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "assigned_staff_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "payment_status" text DEFAULT 'unpaid' NOT NULL,
  "reservation_id" text REFERENCES "venue_reservation"("id") ON DELETE SET NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "subtotal_cents" integer DEFAULT 0 NOT NULL,
  "tip_cents" integer DEFAULT 0 NOT NULL,
  "total_cents" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "stripe_payment_intent_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_order_item" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "notes" text,
  "order_id" text NOT NULL REFERENCES "venue_order"("id") ON DELETE CASCADE,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_price_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_tip_allocation" (
  "amount_cents" integer NOT NULL,
  "beneficiary_kind" text NOT NULL,
  "beneficiary_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL REFERENCES "venue_order"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'recorded' NOT NULL
);
