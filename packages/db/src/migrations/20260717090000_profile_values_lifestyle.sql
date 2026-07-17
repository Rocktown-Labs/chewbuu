ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "politics" text;
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "religion" text;
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "kids" text;
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "wants_kids" text;
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "looking_for" jsonb DEFAULT '[]'::jsonb NOT NULL;
