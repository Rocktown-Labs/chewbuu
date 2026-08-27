ALTER TABLE "venue_location"
  ADD COLUMN IF NOT EXISTS "style" jsonb NOT NULL DEFAULT '{}'::jsonb;
