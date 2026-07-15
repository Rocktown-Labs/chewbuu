ALTER TABLE "profile"
  ADD COLUMN IF NOT EXISTS "marital_status" text;

ALTER TABLE "friend_invite"
  ADD COLUMN IF NOT EXISTS "name" text,
  ADD COLUMN IF NOT EXISTS "relationship" text NOT NULL DEFAULT 'friend';
