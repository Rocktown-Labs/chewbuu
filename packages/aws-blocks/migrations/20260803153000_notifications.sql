CREATE TABLE IF NOT EXISTS "notification" (
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "dedupe_key" text NOT NULL,
  "entity_id" text,
  "entity_type" text,
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "read_at" timestamp,
  "title" text NOT NULL,
  "user_id" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_userId_dedupeKey_idx" ON "notification" USING btree ("user_id", "dedupe_key");
CREATE INDEX IF NOT EXISTS "notification_userId_createdAt_idx" ON "notification" USING btree ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "notification_userId_readAt_idx" ON "notification" USING btree ("user_id", "read_at");
--> statement-breakpoint
DELETE FROM "date_review" older
USING "date_review" newer
WHERE older."date_request_id" = newer."date_request_id"
  AND older."user_id" = newer."user_id"
  AND older.ctid < newer.ctid;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "date_review_dateRequestId_userId_idx" ON "date_review" USING btree ("date_request_id", "user_id");
