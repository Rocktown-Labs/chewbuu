CREATE TABLE IF NOT EXISTS "date_media" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "date_request_id" text NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "thumbnail_url" text,
  "uploaded_by_user_id" text NOT NULL,
  "url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "date_request_party_member" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'friend' NOT NULL;
ALTER TABLE "date_request_party_member" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'invited' NOT NULL;
ALTER TABLE "date_match" ADD COLUMN IF NOT EXISTS "group_id" text;
ALTER TABLE "date_match" ADD COLUMN IF NOT EXISTS "match_kind" text DEFAULT 'individual' NOT NULL;
ALTER TABLE "date_request" ADD COLUMN IF NOT EXISTS "chime_meeting_id" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "date_review_media" (
  "date_media_id" text NOT NULL,
  "review_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "friendship" (
  "accepted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "friend_user_id" text NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recap" (
  "author_user_id" text NOT NULL,
  "caption" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "date_request_id" text NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "published_at" timestamp,
  "review_id" text,
  "story_expires_at" timestamp,
  "thumbnail_url" text,
  "video_url" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "date_media" ADD CONSTRAINT "date_media_date_request_id_date_request_id_fk" FOREIGN KEY ("date_request_id") REFERENCES "public"."date_request"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "date_media" ADD CONSTRAINT "date_media_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "date_review_media" ADD CONSTRAINT "date_review_media_date_media_id_date_media_id_fk" FOREIGN KEY ("date_media_id") REFERENCES "public"."date_media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "date_review_media" ADD CONSTRAINT "date_review_media_review_id_date_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."date_review"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendship" ADD CONSTRAINT "friendship_friend_user_id_user_id_fk" FOREIGN KEY ("friend_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recap" ADD CONSTRAINT "recap_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recap" ADD CONSTRAINT "recap_date_request_id_date_request_id_fk" FOREIGN KEY ("date_request_id") REFERENCES "public"."date_request"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recap" ADD CONSTRAINT "recap_review_id_date_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."date_review"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "date_media_dateRequestId_idx" ON "date_media" USING btree ("date_request_id");
CREATE INDEX IF NOT EXISTS "date_media_uploadedByUserId_idx" ON "date_media" USING btree ("uploaded_by_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "date_review_media_reviewId_dateMediaId_idx" ON "date_review_media" USING btree ("review_id", "date_media_id");
CREATE INDEX IF NOT EXISTS "date_review_media_dateMediaId_idx" ON "date_review_media" USING btree ("date_media_id");
CREATE UNIQUE INDEX IF NOT EXISTS "friendship_userId_friendUserId_idx" ON "friendship" USING btree ("user_id", "friend_user_id");
CREATE INDEX IF NOT EXISTS "friendship_friendUserId_idx" ON "friendship" USING btree ("friend_user_id");
CREATE INDEX IF NOT EXISTS "recap_authorUserId_publishedAt_idx" ON "recap" USING btree ("author_user_id", "published_at");
CREATE INDEX IF NOT EXISTS "recap_storyExpiresAt_idx" ON "recap" USING btree ("story_expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "recap_authorUserId_dateRequestId_idx" ON "recap" USING btree ("author_user_id", "date_request_id");
