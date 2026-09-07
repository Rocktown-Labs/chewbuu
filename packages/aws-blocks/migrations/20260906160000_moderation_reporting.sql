CREATE TABLE IF NOT EXISTS "moderation_report" (
  "id" text PRIMARY KEY NOT NULL,
  "reporter_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "subject_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "target_type" text NOT NULL,
  "target_id" text NOT NULL,
  "room_id" text,
  "category" text NOT NULL,
  "details" text,
  "reported_text" text,
  "reported_kind" text,
  "status" text NOT NULL DEFAULT 'new',
  "priority" text NOT NULL DEFAULT 'standard',
  "assigned_to_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "resolution" text,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "ai_status" text NOT NULL DEFAULT 'pending',
  "ai_summary" text,
  "ai_labels" jsonb,
  "ai_severity" text,
  "ai_confidence" numeric,
  "ai_model" text,
  "ai_completed_at" timestamp,
  "slack_status" text NOT NULL DEFAULT 'pending',
  "slack_notified_at" timestamp
);

CREATE INDEX IF NOT EXISTS "moderation_report_status_idx"
  ON "moderation_report" ("status", "priority", "created_at");
CREATE INDEX IF NOT EXISTS "moderation_report_subject_idx"
  ON "moderation_report" ("subject_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "moderation_report_reporter_idx"
  ON "moderation_report" ("reporter_user_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "moderation_report_duplicate_idx"
  ON "moderation_report" ("reporter_user_id", "target_type", "target_id", "category");

CREATE TABLE IF NOT EXISTS "moderation_appeal" (
  "id" text PRIMARY KEY NOT NULL,
  "report_id" text REFERENCES "moderation_report"("id") ON DELETE SET NULL,
  "appellant_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "account_email" text,
  "account_name" text,
  "details" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "assigned_to_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "decision" text,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "moderation_appeal_status_idx"
  ON "moderation_appeal" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "moderation_appeal_appellant_idx"
  ON "moderation_appeal" ("appellant_user_id", "created_at");

CREATE TABLE IF NOT EXISTS "moderation_action" (
  "id" text PRIMARY KEY NOT NULL,
  "report_id" text REFERENCES "moderation_report"("id") ON DELETE SET NULL,
  "appeal_id" text REFERENCES "moderation_appeal"("id") ON DELETE SET NULL,
  "actor_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "target_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "target_type" text,
  "target_id" text,
  "reason" text,
  "evidence_snapshot" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "moderation_action_report_idx"
  ON "moderation_action" ("report_id", "created_at");
CREATE INDEX IF NOT EXISTS "moderation_action_appeal_idx"
  ON "moderation_action" ("appeal_id", "created_at");

CREATE TABLE IF NOT EXISTS "moderation_rate_limit" (
  "id" text PRIMARY KEY NOT NULL,
  "reporter_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "window_started_at" timestamp NOT NULL,
  "report_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "moderation_rate_limit_reporter_idx"
  ON "moderation_rate_limit" ("reporter_user_id");
