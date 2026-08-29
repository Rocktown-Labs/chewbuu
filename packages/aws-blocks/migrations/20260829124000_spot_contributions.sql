CREATE TABLE IF NOT EXISTS "spot_contribution" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "date_media_id" text NOT NULL,
  "date_request_id" text NOT NULL,
  "google_place_id" text NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "reward_points" integer DEFAULT 0 NOT NULL,
  "reward_status" text DEFAULT 'pending' NOT NULL,
  "reviewed_at" timestamp,
  "status" text DEFAULT 'pending' NOT NULL,
  "submitted_by_user_id" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spot_contribution" ADD CONSTRAINT "spot_contribution_date_media_id_date_media_id_fk" FOREIGN KEY ("date_media_id") REFERENCES "public"."date_media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spot_contribution" ADD CONSTRAINT "spot_contribution_date_request_id_date_request_id_fk" FOREIGN KEY ("date_request_id") REFERENCES "public"."date_request"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spot_contribution" ADD CONSTRAINT "spot_contribution_submitted_by_user_id_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spot_contribution_user_place_kind_media_idx" ON "spot_contribution" USING btree ("submitted_by_user_id", "google_place_id", "kind", "date_media_id");
CREATE INDEX IF NOT EXISTS "spot_contribution_place_status_idx" ON "spot_contribution" USING btree ("google_place_id", "status");
