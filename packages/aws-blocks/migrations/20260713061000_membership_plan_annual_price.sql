ALTER TABLE "membership_plan"
  ADD COLUMN IF NOT EXISTS "annual_stripe_price_id" text;
