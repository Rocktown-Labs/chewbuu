CREATE TABLE IF NOT EXISTS "membership_plan" (
  "id" text PRIMARY KEY NOT NULL,
  "tier" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "monthly_price_cents" integer DEFAULT 0 NOT NULL,
  "annual_price_cents" integer DEFAULT 0 NOT NULL,
  "stripe_price_id" text,
  "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "stats" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cta" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "membership_plan_tier_unique" UNIQUE("tier")
);

CREATE INDEX IF NOT EXISTS "membership_plan_tier_idx" ON "membership_plan" USING btree ("tier");
CREATE INDEX IF NOT EXISTS "membership_plan_active_idx" ON "membership_plan" USING btree ("active");
