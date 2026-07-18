ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "canceled_date_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "flake_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "reliability_score" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "rescheduled_date_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "date_review" ADD COLUMN IF NOT EXISTS "person_comment" text;--> statement-breakpoint
ALTER TABLE "date_review" ADD COLUMN IF NOT EXISTS "person_criteria" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "date_review" ADD COLUMN IF NOT EXISTS "place_comment" text;--> statement-breakpoint
ALTER TABLE "date_review" ADD COLUMN IF NOT EXISTS "place_criteria" jsonb DEFAULT '{}'::jsonb NOT NULL;
