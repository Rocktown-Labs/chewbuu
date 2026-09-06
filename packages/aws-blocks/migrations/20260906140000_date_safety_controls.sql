ALTER TABLE "date_request_place"
  ADD COLUMN IF NOT EXISTS "latitude" double precision,
  ADD COLUMN IF NOT EXISTS "longitude" double precision;

CREATE TABLE IF NOT EXISTS "date_safety_event" (
  "id" text PRIMARY KEY NOT NULL,
  "date_request_id" text NOT NULL REFERENCES "date_request"("id") ON DELETE CASCADE,
  "initiated_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "confirmed" boolean NOT NULL DEFAULT false,
  "status" text NOT NULL DEFAULT 'requested',
  "venue_place_id" text NOT NULL,
  "venue_name" text NOT NULL,
  "distance_miles" numeric,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "date_safety_event"
  ADD COLUMN IF NOT EXISTS "confirmed" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "date_safety_event_request_idx"
  ON "date_safety_event" ("date_request_id", "created_at");
CREATE INDEX IF NOT EXISTS "date_safety_event_user_idx"
  ON "date_safety_event" ("initiated_by_user_id", "created_at");

CREATE TABLE IF NOT EXISTS "date_safety_recording" (
  "id" text PRIMARY KEY NOT NULL,
  "safety_event_id" text NOT NULL REFERENCES "date_safety_event"("id") ON DELETE CASCADE,
  "date_request_id" text NOT NULL REFERENCES "date_request"("id") ON DELETE CASCADE,
  "recorded_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "content_type" text NOT NULL,
  "started_at" timestamp NOT NULL,
  "ended_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "date_safety_recording_event_idx"
  ON "date_safety_recording" ("safety_event_id", "created_at");
