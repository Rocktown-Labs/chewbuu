ALTER TABLE "profile"
ADD COLUMN IF NOT EXISTS "favorite_places" jsonb NOT NULL DEFAULT '{}'::jsonb;
