ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "contribution_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_matching_location_idx" ON "profile" ("can_date", "onboarded", "latitude", "longitude");
