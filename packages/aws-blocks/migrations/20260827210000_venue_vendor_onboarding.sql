-- Venue setup can be retried safely after the initial foundation migration.
ALTER TABLE "venue_location"
  ADD COLUMN IF NOT EXISTS "description" text,
  ADD COLUMN IF NOT EXISTS "stripe_identity_status" text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS "stripe_identity_verification_session_id" text,
  ADD COLUMN IF NOT EXISTS "stripe_identity_verified_at" timestamp,
  ADD COLUMN IF NOT EXISTS "stripe_identity_verified_name" text;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "venue_location_identity_status_idx"
  ON "venue_location" ("stripe_identity_status");
--> statement-breakpoint

-- Firecrawl rows remain unverified previews. These rows are the venue-owned catalog.
CREATE TABLE IF NOT EXISTS "venue_menu_item" (
  "available" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "description" text,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "menu_id" text REFERENCES "venue_menu"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "photo_url" text,
  "price_cents" integer NOT NULL DEFAULT 0,
  "section" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'draft',
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "venue_menu_item_location_order_idx"
  ON "venue_menu_item" ("location_id", "sort_order");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_menu_modifier_group" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "max_selections" integer NOT NULL DEFAULT 1,
  "menu_item_id" text NOT NULL REFERENCES "venue_menu_item"("id") ON DELETE CASCADE,
  "min_selections" integer NOT NULL DEFAULT 0,
  "name" text NOT NULL,
  "selection_type" text NOT NULL DEFAULT 'single',
  "sort_order" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "venue_menu_modifier_group_item_order_idx"
  ON "venue_menu_modifier_group" ("menu_item_id", "sort_order");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_menu_modifier_option" (
  "available" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "group_id" text NOT NULL REFERENCES "venue_menu_modifier_group"("id") ON DELETE CASCADE,
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "price_delta_cents" integer NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "venue_menu_modifier_option_group_order_idx"
  ON "venue_menu_modifier_option" ("group_id", "sort_order");
