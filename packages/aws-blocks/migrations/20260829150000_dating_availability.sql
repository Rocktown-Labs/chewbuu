ALTER TABLE "profile"
ADD COLUMN IF NOT EXISTS "dating_enabled" boolean NOT NULL DEFAULT false;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "profile_dating_readiness_idx"
  ON "profile" ("can_date", "onboarded", "dating_enabled", "latitude", "longitude");
