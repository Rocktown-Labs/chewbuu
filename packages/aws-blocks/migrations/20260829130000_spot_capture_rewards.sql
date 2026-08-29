ALTER TABLE "spot_contribution"
  ADD COLUMN IF NOT EXISTS "reward_cents" integer DEFAULT 500 NOT NULL;
