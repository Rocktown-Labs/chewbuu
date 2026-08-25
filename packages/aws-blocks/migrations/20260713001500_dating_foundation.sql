ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "has_completed_onboarding" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "has_intro_video" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "has_profile_photo" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "profile" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE cascade,
  "onboarded" boolean NOT NULL DEFAULT false,
  "can_date" boolean NOT NULL DEFAULT false,
  "profile_photo_url" text,
  "intro_video_url" text,
  "birthday" text,
  "sex" text,
  "sexuality" text,
  "area" text,
  "latitude" text,
  "longitude" text,
  "height" text,
  "weight" text,
  "bio" text,
  "interests" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "interest_details" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "favorite_things" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "dating_modes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "interested_in" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "age_range_min" integer,
  "age_range_max" integer,
  "distance_miles" integer NOT NULL DEFAULT 25,
  "safety_opt_in" boolean NOT NULL DEFAULT false,
  "onboarding_completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "profile_userId_idx" ON "profile" ("user_id");
CREATE INDEX IF NOT EXISTS "profile_canDate_idx" ON "profile" ("can_date");

CREATE TABLE IF NOT EXISTS "profile_media" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "url" text NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "profile_media_userId_idx" ON "profile_media" ("user_id");

CREATE TABLE IF NOT EXISTS "trusted_contact" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "trusted_contact_userId_idx" ON "trusted_contact" ("user_id");

CREATE TABLE IF NOT EXISTS "friend_invite" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "email" text,
  "phone" text,
  "invite_token" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "friend_invite_userId_idx" ON "friend_invite" ("user_id");

CREATE TABLE IF NOT EXISTS "date_request" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "what" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "filters" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "scheduled_at" timestamp NOT NULL,
  "search_area" text NOT NULL,
  "party_size" integer NOT NULL DEFAULT 1,
  "payment_mode" text NOT NULL DEFAULT 'dutch',
  "status" text NOT NULL DEFAULT 'draft',
  "actual_start_at" timestamp,
  "actual_end_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "date_request_userId_idx" ON "date_request" ("user_id");
CREATE INDEX IF NOT EXISTS "date_request_status_idx" ON "date_request" ("status");

CREATE TABLE IF NOT EXISTS "date_request_party_member" (
  "id" text PRIMARY KEY NOT NULL,
  "request_id" text NOT NULL REFERENCES "date_request"("id") ON DELETE cascade,
  "display_name" text NOT NULL,
  "invited_user_id" text
);

CREATE INDEX IF NOT EXISTS "date_request_party_member_requestId_idx"
  ON "date_request_party_member" ("request_id");

CREATE TABLE IF NOT EXISTS "date_request_place" (
  "id" text PRIMARY KEY NOT NULL,
  "request_id" text NOT NULL REFERENCES "date_request"("id") ON DELETE cascade,
  "place_id" text NOT NULL,
  "name" text NOT NULL,
  "address" text,
  "rating" text,
  "types" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "selected" boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS "date_request_place_requestId_idx"
  ON "date_request_place" ("request_id");

CREATE TABLE IF NOT EXISTS "date_match" (
  "id" text PRIMARY KEY NOT NULL,
  "request_id" text NOT NULL REFERENCES "date_request"("id") ON DELETE cascade,
  "user_id" text NOT NULL,
  "display_name" text NOT NULL,
  "intro_video_url" text NOT NULL,
  "profile_photo_url" text,
  "profile_summary" text NOT NULL,
  "compatibility" integer NOT NULL DEFAULT 80,
  "status" text NOT NULL DEFAULT 'suggested',
  "video_replies_required" integer NOT NULL DEFAULT 3
);

CREATE INDEX IF NOT EXISTS "date_match_requestId_idx" ON "date_match" ("request_id");

CREATE TABLE IF NOT EXISTS "date_review" (
  "id" text PRIMARY KEY NOT NULL,
  "date_request_id" text NOT NULL REFERENCES "date_request"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "required" boolean NOT NULL DEFAULT true,
  "person_rating" integer,
  "place_rating" integer,
  "completed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "date_review_userId_idx" ON "date_review" ("user_id");

CREATE TABLE IF NOT EXISTS "conversation" (
  "id" text PRIMARY KEY NOT NULL,
  "date_request_id" text REFERENCES "date_request"("id") ON DELETE cascade,
  "intro_exchanged" boolean NOT NULL DEFAULT false,
  "text_unlocked" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "conversation_dateRequestId_idx"
  ON "conversation" ("date_request_id");

CREATE TABLE IF NOT EXISTS "video_message" (
  "id" text PRIMARY KEY NOT NULL,
  "conversation_id" text NOT NULL REFERENCES "conversation"("id") ON DELETE cascade,
  "sender_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "url" text NOT NULL,
  "is_intro" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "video_message_conversationId_idx"
  ON "video_message" ("conversation_id");
