-- The legacy Drizzle table had a unique index but no primary key, which kept
-- bb-data pull from generating a complete table definition for it.
ALTER TABLE "chat_read_state"
ADD CONSTRAINT "chat_read_state_pk" PRIMARY KEY ("room_id", "user_id");
