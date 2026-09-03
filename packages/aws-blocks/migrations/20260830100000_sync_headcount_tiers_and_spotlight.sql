-- Update sync_50 with updated pricing and name
UPDATE "sync_plan"
SET "name" = 'Sync 50 (Independent)',
    "description" = 'Venue operations for up to 50 active staff members with full KDS, tables, and shifts.',
    "monthly_price_cents" = 6900
WHERE "code" = 'sync_50';

-- Add sync_100 and sync_enterprise
INSERT INTO "sync_plan" (
  "active", "code", "description", "id", "max_staff", "monthly_price_cents",
  "name", "referral_reward_cents"
) VALUES
  (true, 'sync_100', 'High-volume operations for up to 100 active staff with multi-station KDS and 1 monthly Spotlight.', 'plan-sync-100', 100, 13900, 'Sync 100 (High-Volume)', 5000),
  (true, 'sync_enterprise', 'Unlimited staff, multi-location brand controls, enterprise payroll export, and dedicated account manager.', 'plan-sync-enterprise', 999999, 24900, 'Sync Enterprise', 5000)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "max_staff" = EXCLUDED."max_staff",
  "monthly_price_cents" = EXCLUDED."monthly_price_cents";

-- Create venue_spotlight table for advertising and promotion campaigns
CREATE TABLE IF NOT EXISTS "venue_spotlight" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "description" text,
  "ends_at" timestamp NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL,
  "price_cents" integer NOT NULL,
  "special_id" text REFERENCES "venue_special"("id") ON DELETE SET NULL,
  "starts_at" timestamp NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "stripe_payment_id" text,
  "title" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "venue_spotlight_location_status_idx"
  ON "venue_spotlight" ("location_id", "status");
CREATE INDEX IF NOT EXISTS "venue_spotlight_kind_time_idx"
  ON "venue_spotlight" ("kind", "starts_at", "ends_at");
