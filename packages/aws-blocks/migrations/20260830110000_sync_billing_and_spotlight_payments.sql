ALTER TABLE "sync_plan"
  ADD COLUMN IF NOT EXISTS "annual_price_cents" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "annual_stripe_price_id" text;
--> statement-breakpoint

UPDATE "sync_plan"
SET "annual_price_cents" = CASE "code"
  WHEN 'sync_50' THEN 70800
  WHEN 'sync_100' THEN 142800
  WHEN 'sync_enterprise' THEN 262800
  ELSE "annual_price_cents"
END,
"stripe_sync_status" = 'pending',
"stripe_synced_at" = NULL
WHERE "code" IN ('sync_50', 'sync_100', 'sync_enterprise');
--> statement-breakpoint

ALTER TABLE "venue_spotlight"
  ADD COLUMN IF NOT EXISTS "free_entitlement_month" text,
  ADD COLUMN IF NOT EXISTS "is_free" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "payment_status" text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" text,
  ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" text;
--> statement-breakpoint

-- The original Spotlight table allowed unpaid rows to be active. Only rows created
-- by the new checkout/entitlement flow may be served as active promotions.
UPDATE "venue_spotlight"
SET "payment_status" = 'failed',
    "status" = 'cancelled',
    "updated_at" = now()
WHERE "status" = 'active';
--> statement-breakpoint

UPDATE "venue_special"
SET "featured" = false,
    "updated_at" = now()
WHERE "featured" = true;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "venue_spotlight_free_entitlement_idx"
  ON "venue_spotlight" ("organization_id", "free_entitlement_month")
  WHERE "is_free" = true AND "free_entitlement_month" IS NOT NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "venue_spotlight_public_active_idx"
  ON "venue_spotlight" ("status", "starts_at", "ends_at", "location_id");
