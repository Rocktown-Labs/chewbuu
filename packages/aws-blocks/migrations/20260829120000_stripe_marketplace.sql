-- Stripe is the source of truth for payment state; these tables retain the
-- local identifiers needed for authorization, reconciliation, and reporting.
ALTER TABLE "organization"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
--> statement-breakpoint

ALTER TABLE "membership_plan"
  ADD COLUMN IF NOT EXISTS "stripe_product_id" text,
  ADD COLUMN IF NOT EXISTS "stripe_currency" text NOT NULL DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS "stripe_mode" text,
  ADD COLUMN IF NOT EXISTS "stripe_sync_status" text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "stripe_synced_at" timestamp;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sync_plan" (
  "active" boolean DEFAULT true NOT NULL,
  "code" text PRIMARY KEY NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "description" text NOT NULL,
  "id" text NOT NULL,
  "max_staff" integer DEFAULT 50 NOT NULL,
  "monthly_price_cents" integer DEFAULT 6000 NOT NULL,
  "monthly_stripe_price_id" text,
  "name" text NOT NULL,
  "referral_reward_cents" integer DEFAULT 5000 NOT NULL,
  "stripe_currency" text DEFAULT 'usd' NOT NULL,
  "stripe_mode" text,
  "stripe_product_id" text,
  "stripe_sync_status" text DEFAULT 'pending' NOT NULL,
  "stripe_synced_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "sync_plan_id_unique" UNIQUE("id")
);
--> statement-breakpoint

INSERT INTO "sync_plan" (
  "active", "code", "description", "id", "max_staff", "monthly_price_cents",
  "name", "referral_reward_cents"
) VALUES (
  true, 'sync_50', 'Venue operations for up to 50 active staff members.',
  'plan-sync-50', 50, 6000, 'Chewbuu Sync', 5000
) ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint

ALTER TABLE "sync_subscription"
  ADD COLUMN IF NOT EXISTS "billing_interval" text,
  ADD COLUMN IF NOT EXISTS "period_end" timestamp,
  ADD COLUMN IF NOT EXISTS "period_start" timestamp,
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stripe_connected_account" (
  "account_kind" text NOT NULL,
  "account_status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "dashboard_type" text,
  "id" text PRIMARY KEY NOT NULL,
  "livemode" boolean DEFAULT false NOT NULL,
  "location_id" text REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "onboarding_status" text DEFAULT 'not_started' NOT NULL,
  "organization_id" text NOT NULL REFERENCES "venue_organization"("id") ON DELETE CASCADE,
  "requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "stripe_account_id" text NOT NULL,
  "transfer_capability_status" text DEFAULT 'inactive' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "stripe_connected_account_stripe_id_unique" UNIQUE("stripe_account_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stripe_connected_account_org_kind_idx"
  ON "stripe_connected_account" ("organization_id", "account_kind", "account_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stripe_connected_account_location_kind_idx"
  ON "stripe_connected_account" ("location_id", "account_kind", "account_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stripe_connected_account_user_kind_idx"
  ON "stripe_connected_account" ("user_id", "account_kind", "account_status");
--> statement-breakpoint

ALTER TABLE "venue_location"
  ADD COLUMN IF NOT EXISTS "stripe_onboarding_status" text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS "stripe_transfer_capability_status" text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS "stripe_requirements" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "stripe_account_updated_at" timestamp;
--> statement-breakpoint

ALTER TABLE "venue_order"
  ADD COLUMN IF NOT EXISTS "experience_kind" text NOT NULL DEFAULT 'dine_in',
  ADD COLUMN IF NOT EXISTS "tax_cents" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "platform_fee_cents" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "stripe_transfer_group" text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stripe_payment" (
  "amount_cents" integer NOT NULL,
  "charge_id" text,
  "checkout_session_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "currency" text NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "livemode" boolean DEFAULT false NOT NULL,
  "order_id" text NOT NULL REFERENCES "venue_order"("id") ON DELETE CASCADE,
  "payment_intent_id" text,
  "platform_fee_cents" integer NOT NULL DEFAULT 0,
  "status" text DEFAULT 'pending' NOT NULL,
  "transfer_group" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "stripe_payment_order_unique" UNIQUE("order_id"),
  CONSTRAINT "stripe_payment_checkout_session_unique" UNIQUE("checkout_session_id"),
  CONSTRAINT "stripe_payment_intent_unique" UNIQUE("payment_intent_id"),
  CONSTRAINT "stripe_payment_charge_unique" UNIQUE("charge_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stripe_payment_status_created_idx"
  ON "stripe_payment" ("status", "created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stripe_transfer" (
  "amount_cents" integer NOT NULL,
  "connected_account_id" text NOT NULL REFERENCES "stripe_connected_account"("id") ON DELETE RESTRICT,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "currency" text NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "idempotency_key" text NOT NULL,
  "kind" text NOT NULL,
  "payment_id" text NOT NULL REFERENCES "stripe_payment"("id") ON DELETE CASCADE,
  "reversal_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "stripe_transfer_id" text,
  "tip_allocation_id" text REFERENCES "venue_tip_allocation"("id") ON DELETE SET NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "stripe_transfer_idempotency_unique" UNIQUE("idempotency_key"),
  CONSTRAINT "stripe_transfer_stripe_id_unique" UNIQUE("stripe_transfer_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stripe_transfer_payment_status_idx"
  ON "stripe_transfer" ("payment_id", "status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stripe_transfer_reversal" (
  "amount_cents" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "reason" text NOT NULL,
  "stripe_reversal_id" text NOT NULL,
  "transfer_id" text NOT NULL REFERENCES "stripe_transfer"("id") ON DELETE CASCADE,
  CONSTRAINT "stripe_transfer_reversal_stripe_id_unique" UNIQUE("stripe_reversal_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stripe_transfer_reversal_transfer_idx"
  ON "stripe_transfer_reversal" ("transfer_id", "created_at");
--> statement-breakpoint

ALTER TABLE "venue_tip_allocation"
  ADD COLUMN IF NOT EXISTS "settled_at" timestamp,
  ADD COLUMN IF NOT EXISTS "stripe_transfer_id" text,
  ADD COLUMN IF NOT EXISTS "reversal_id" text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stripe_refund" (
  "amount_cents" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "payment_id" text NOT NULL REFERENCES "stripe_payment"("id") ON DELETE CASCADE,
  "refund_application_fee" boolean DEFAULT false NOT NULL,
  "reverse_transfer" boolean DEFAULT false NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "stripe_refund_id" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "stripe_refund_stripe_id_unique" UNIQUE("stripe_refund_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stripe_dispute" (
  "amount_cents" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "due_by" timestamp,
  "id" text PRIMARY KEY NOT NULL,
  "payment_id" text REFERENCES "stripe_payment"("id") ON DELETE SET NULL,
  "reason" text,
  "status" text NOT NULL,
  "stripe_dispute_id" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "stripe_dispute_stripe_id_unique" UNIQUE("stripe_dispute_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stripe_event" (
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "error_message" text,
  "event_type" text NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "livemode" boolean DEFAULT false NOT NULL,
  "payload" jsonb NOT NULL,
  "processed_at" timestamp,
  "received_at" timestamp DEFAULT now() NOT NULL,
  "status" text DEFAULT 'received' NOT NULL,
  "stripe_account_id" text,
  "stripe_event_id" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "webhook_kind" text NOT NULL,
  CONSTRAINT "stripe_event_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stripe_event_kind_status_idx"
  ON "stripe_event" ("webhook_kind", "status", "received_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stripe_webhook_endpoint" (
  "connect" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "enabled_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "last_verified_at" timestamp,
  "mode" text NOT NULL,
  "purpose" text NOT NULL,
  "secret_configured" boolean DEFAULT false NOT NULL,
  "status" text DEFAULT 'unknown' NOT NULL,
  "stripe_endpoint_id" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "url" text NOT NULL,
  CONSTRAINT "stripe_webhook_endpoint_stripe_id_unique" UNIQUE("stripe_endpoint_id"),
  CONSTRAINT "stripe_webhook_endpoint_purpose_mode_unique" UNIQUE("purpose", "mode")
);
