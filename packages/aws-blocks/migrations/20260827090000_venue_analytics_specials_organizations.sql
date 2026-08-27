-- Better Auth Organizations is the canonical organization boundary for venue access.
-- Existing venue organizations keep their IDs so this bridge is non-destructive.
ALTER TABLE "session"
  ADD COLUMN IF NOT EXISTS "active_organization_id" text;

CREATE TABLE IF NOT EXISTS "organization" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "logo" text,
  "created_at" timestamp NOT NULL,
  "metadata" text,
  CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "created_at" timestamp NOT NULL,
  CONSTRAINT "member_organization_user_unique" UNIQUE("organization_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_user_id_idx" ON "member" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitation" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text,
  "status" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "inviter_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_organization_status_idx"
  ON "invitation" ("organization_id", "status");
--> statement-breakpoint

INSERT INTO "organization" ("created_at", "id", "name", "slug")
SELECT "created_at", "id", "name", "slug"
FROM "venue_organization"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "member" ("created_at", "id", "organization_id", "role", "user_id")
SELECT "created_at", "id", "organization_id",
  CASE WHEN "role" IN ('owner', 'admin', 'member') THEN "role" ELSE 'member' END,
  "user_id"
FROM "venue_member"
WHERE "status" = 'active'
ON CONFLICT ("organization_id", "user_id") DO NOTHING;
--> statement-breakpoint

ALTER TABLE "venue_location"
  ADD COLUMN IF NOT EXISTS "public_analytics_enabled" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "public_analytics_min_samples" integer DEFAULT 5 NOT NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_operational_event" (
  "actor_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "date_request_id" text REFERENCES "date_request"("id") ON DELETE SET NULL,
  "dining_session_id" text REFERENCES "venue_dining_session"("id") ON DELETE SET NULL,
  "entity_id" text,
  "entity_type" text,
  "event_type" text NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurred_at" timestamp NOT NULL,
  "order_id" text REFERENCES "venue_order"("id") ON DELETE SET NULL,
  "reservation_id" text REFERENCES "venue_reservation"("id") ON DELETE SET NULL,
  "table_id" text,
  "source" text NOT NULL DEFAULT 'staff'
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_operational_event_location_time_idx"
  ON "venue_operational_event" ("location_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "venue_operational_event_entity_time_idx"
  ON "venue_operational_event" ("entity_type", "entity_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "venue_operational_event_type_time_idx"
  ON "venue_operational_event" ("location_id", "event_type", "occurred_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_table" (
  "capacity" integer NOT NULL DEFAULT 2,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "section" text,
  "status" text NOT NULL DEFAULT 'available',
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "venue_table_location_label_unique" UNIQUE("location_id", "label")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_table_location_status_idx"
  ON "venue_table" ("location_id", "status");
--> statement-breakpoint
ALTER TABLE "venue_operational_event"
  ADD CONSTRAINT "venue_operational_event_table_id_fk"
  FOREIGN KEY ("table_id") REFERENCES "venue_table"("id") ON DELETE SET NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_special" (
  "category" text NOT NULL DEFAULT 'featured',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "description" text,
  "display_order" integer DEFAULT 0 NOT NULL,
  "ends_at" timestamp,
  "featured" boolean DEFAULT false NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "price_text" text,
  "published_at" timestamp,
  "starts_at" timestamp DEFAULT now() NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "title" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_special_location_status_time_idx"
  ON "venue_special" ("location_id", "status", "starts_at", "ends_at");
CREATE INDEX IF NOT EXISTS "venue_special_public_filter_idx"
  ON "venue_special" ("status", "category", "starts_at", "ends_at");
