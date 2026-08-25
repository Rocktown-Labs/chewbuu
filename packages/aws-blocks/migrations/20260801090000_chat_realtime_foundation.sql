CREATE TABLE IF NOT EXISTS "chat_room" (
  "active_date_id" text REFERENCES "date_request"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "match_id" text REFERENCES "date_match"("id") ON DELETE set null,
  "phase" text DEFAULT 'continued' NOT NULL,
  "title" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "chat_room_activeDateId_idx"
  ON "chat_room" ("active_date_id");
CREATE INDEX IF NOT EXISTS "chat_room_kind_idx"
  ON "chat_room" ("kind");
CREATE INDEX IF NOT EXISTS "chat_room_matchId_idx"
  ON "chat_room" ("match_id");

CREATE TABLE IF NOT EXISTS "chat_participant" (
  "avatar_url" text,
  "display_name" text NOT NULL,
  "id" text PRIMARY KEY NOT NULL,
  "room_id" text NOT NULL REFERENCES "chat_room"("id") ON DELETE cascade,
  "user_id" text REFERENCES "user"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "chat_participant_roomId_idx"
  ON "chat_participant" ("room_id");
CREATE INDEX IF NOT EXISTS "chat_participant_userId_idx"
  ON "chat_participant" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "chat_participant_roomId_userId_idx"
  ON "chat_participant" ("room_id", "user_id");

CREATE TABLE IF NOT EXISTS "chat_message" (
  "created_at" timestamp DEFAULT now() NOT NULL,
  "duration_sec" integer,
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "media_thumb_url" text,
  "media_url" text,
  "room_id" text NOT NULL REFERENCES "chat_room"("id") ON DELETE cascade,
  "sender_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "system_icon" text,
  "text" text
);

CREATE INDEX IF NOT EXISTS "chat_message_roomId_createdAt_idx"
  ON "chat_message" ("room_id", "created_at");
CREATE INDEX IF NOT EXISTS "chat_message_senderId_idx"
  ON "chat_message" ("sender_id");

CREATE TABLE IF NOT EXISTS "chat_read_state" (
  "last_read_at" timestamp DEFAULT now() NOT NULL,
  "room_id" text NOT NULL REFERENCES "chat_room"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_read_state_roomId_userId_idx"
  ON "chat_read_state" ("room_id", "user_id");
