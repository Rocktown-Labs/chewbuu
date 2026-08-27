-- Personal identity verification is separate from venue verification.
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "identity_status" text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS "identity_verification_session_id" text,
  ADD COLUMN IF NOT EXISTS "identity_verified_at" timestamp,
  ADD COLUMN IF NOT EXISTS "identity_verified_name" text;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_identity_status_idx"
  ON "user" ("identity_status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "username_change_request" (
  "approved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "requested_username" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending_verification',
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "verified_at" timestamp,
  "verification_token_hash" text NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "username_change_request_token_idx"
  ON "username_change_request" ("verification_token_hash");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "username_change_request_user_status_idx"
  ON "username_change_request" ("user_id", "status", "created_at");
