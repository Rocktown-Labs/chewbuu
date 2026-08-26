ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "username" text;

CREATE UNIQUE INDEX IF NOT EXISTS "user_username_lower_idx"
  ON "user" (lower("username"))
  WHERE "username" IS NOT NULL;

ALTER TABLE "circle"
  ADD COLUMN IF NOT EXISTS "handle" text,
  ADD COLUMN IF NOT EXISTS "description" text,
  ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'circle',
  ADD COLUMN IF NOT EXISTS "style" jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS "circle_handle_lower_idx"
  ON "circle" (lower("handle"))
  WHERE "handle" IS NOT NULL;

ALTER TABLE "venue_organization"
  ADD COLUMN IF NOT EXISTS "handle" text,
  ADD COLUMN IF NOT EXISTS "description" text,
  ADD COLUMN IF NOT EXISTS "style" jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS "venue_organization_handle_lower_idx"
  ON "venue_organization" (lower("handle"))
  WHERE "handle" IS NOT NULL;

ALTER TABLE "venue_location"
  ADD COLUMN IF NOT EXISTS "handle" text;

CREATE UNIQUE INDEX IF NOT EXISTS "venue_location_handle_lower_idx"
  ON "venue_location" (lower("handle"))
  WHERE "handle" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "sync_subscription" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "ended_at" timestamp,
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text REFERENCES "venue_organization"("id") ON DELETE CASCADE,
  "plan" text NOT NULL DEFAULT 'sync',
  "status" text NOT NULL DEFAULT 'inactive',
  "stripe_subscription_id" text,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "sync_subscription_user_status_idx"
  ON "sync_subscription" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "sync_subscription_organization_status_idx"
  ON "sync_subscription" ("organization_id", "status");

CREATE TABLE IF NOT EXISTS "venue_member_invite" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "email" text NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "invite_token" text NOT NULL,
  "name" text,
  "organization_id" text NOT NULL REFERENCES "venue_organization"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'staff',
  "status" text NOT NULL DEFAULT 'sent',
  "invited_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "venue_member_invite_token_unique" UNIQUE("invite_token")
);

CREATE INDEX IF NOT EXISTS "venue_member_invite_organization_status_idx"
  ON "venue_member_invite" ("organization_id", "status");

CREATE INDEX IF NOT EXISTS "friend_invite_circle_status_idx"
  ON "friend_invite" ("circle_id", "status");
