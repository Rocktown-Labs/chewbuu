ALTER TABLE "venue_member_invite"
  ALTER COLUMN "email" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "location_id" text REFERENCES "venue_location"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "phone" text;
--> statement-breakpoint

ALTER TABLE "venue_shift"
  ADD COLUMN IF NOT EXISTS "section" text;
--> statement-breakpoint

ALTER TABLE "venue_location"
  ADD COLUMN IF NOT EXISTS "latitude" double precision,
  ADD COLUMN IF NOT EXISTS "longitude" double precision,
  ADD COLUMN IF NOT EXISTS "geofence_radius_meters" integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS "service_open_minute" integer NOT NULL DEFAULT 660,
  ADD COLUMN IF NOT EXISTS "service_close_minute" integer NOT NULL DEFAULT 1320,
  ADD COLUMN IF NOT EXISTS "service_mode_override" text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_member_location" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'staff',
  "status" text NOT NULL DEFAULT 'active',
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "venue_member_location_unique" UNIQUE("location_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_member_location_user_status_idx"
  ON "venue_member_location" ("user_id", "status");
--> statement-breakpoint
INSERT INTO "venue_member_location" ("created_at", "id", "location_id", "role", "status", "updated_at", "user_id")
SELECT now(), md5("venue_location"."id" || ':' || "venue_member"."user_id"), "venue_location"."id", "venue_member"."role", "venue_member"."status", now(), "venue_member"."user_id"
FROM "venue_location"
INNER JOIN "venue_member" ON "venue_member"."organization_id" = "venue_location"."organization_id"
WHERE "venue_member"."status" = 'active'
ON CONFLICT ("location_id", "user_id") DO NOTHING;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_shift_attendance" (
  "clock_in_at" timestamp,
  "clock_out_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "current_segment_kind" text,
  "current_segment_started_at" timestamp,
  "eta_at" timestamp,
  "id" text PRIMARY KEY NOT NULL,
  "late_minutes" integer NOT NULL DEFAULT 0,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "shift_id" text NOT NULL REFERENCES "venue_shift"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'scheduled',
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "venue_shift_attendance_shift_unique" UNIQUE("shift_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_shift_attendance_location_status_idx"
  ON "venue_shift_attendance" ("location_id", "status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_attendance_segment" (
  "attendance_id" text NOT NULL REFERENCES "venue_shift_attendance"("id") ON DELETE CASCADE,
  "ended_at" timestamp,
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "started_at" timestamp NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_service_customer" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "display_name" text NOT NULL,
  "email" text,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "notes" text,
  "phone" text,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_service_customer_location_created_idx"
  ON "venue_service_customer" ("location_id", "created_at");
--> statement-breakpoint

ALTER TABLE "venue_order"
  ADD COLUMN IF NOT EXISTS "service_customer_id" text REFERENCES "venue_service_customer"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "table_id" text REFERENCES "venue_table"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'guest';
--> statement-breakpoint
ALTER TABLE "venue_order_item"
  ADD COLUMN IF NOT EXISTS "menu_item_id" text REFERENCES "venue_menu_item"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "modifiers" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_order_location_status_created_idx"
  ON "venue_order" ("location_id", "status", "created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_sync_channel" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "room_id" text NOT NULL REFERENCES "chat_room"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'active',
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "venue_sync_channel_location_unique" UNIQUE("location_id"),
  CONSTRAINT "venue_sync_channel_room_unique" UNIQUE("room_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "venue_job_listing" (
  "application_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "description" text NOT NULL,
  "employment_type" text NOT NULL,
  "expires_at" timestamp,
  "id" text PRIMARY KEY NOT NULL,
  "location_id" text NOT NULL REFERENCES "venue_location"("id") ON DELETE CASCADE,
  "pay_text" text,
  "published_at" timestamp,
  "schedule_text" text,
  "status" text NOT NULL DEFAULT 'draft',
  "title" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_job_listing_location_status_idx"
  ON "venue_job_listing" ("location_id", "status", "expires_at");
