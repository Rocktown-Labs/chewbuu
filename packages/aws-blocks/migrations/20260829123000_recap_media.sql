ALTER TABLE "recap" ALTER COLUMN "video_url" DROP NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recap_media" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "date_media_id" text NOT NULL,
  "recap_id" text NOT NULL,
  CONSTRAINT "recap_media_recap_id_date_media_id_pk" PRIMARY KEY ("recap_id", "date_media_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recap_media" ADD CONSTRAINT "recap_media_recap_id_recap_id_fk" FOREIGN KEY ("recap_id") REFERENCES "public"."recap"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recap_media" ADD CONSTRAINT "recap_media_date_media_id_date_media_id_fk" FOREIGN KEY ("date_media_id") REFERENCES "public"."date_media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recap_media_dateMediaId_idx" ON "recap_media" USING btree ("date_media_id");
