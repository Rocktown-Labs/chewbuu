ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS "banned" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ban_reason" text,
  ADD COLUMN IF NOT EXISTS "ban_expires" timestamp,
  ADD COLUMN IF NOT EXISTS "membership_tier" text NOT NULL DEFAULT 'social',
  ADD COLUMN IF NOT EXISTS "daily_date_limit" integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;

ALTER TABLE "session"
  ADD COLUMN IF NOT EXISTS "impersonated_by" text;

CREATE TABLE IF NOT EXISTS "subscription" (
  "id" text PRIMARY KEY NOT NULL,
  "plan" text NOT NULL,
  "reference_id" text NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "status" text NOT NULL DEFAULT 'incomplete',
  "period_start" timestamp,
  "period_end" timestamp,
  "trial_start" timestamp,
  "trial_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false,
  "cancel_at" timestamp,
  "canceled_at" timestamp,
  "ended_at" timestamp,
  "seats" integer,
  "billing_interval" text,
  "stripe_schedule_id" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "subscription_referenceId_idx"
  ON "subscription" ("reference_id");
