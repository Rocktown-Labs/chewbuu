ALTER TABLE "friend_invite"
  ADD COLUMN IF NOT EXISTS "circle_id" text,
  ADD COLUMN IF NOT EXISTS "invite_purpose" text NOT NULL DEFAULT 'friend_referral';

CREATE TABLE IF NOT EXISTS "circle" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_user_id" text NOT NULL,
  "name" text NOT NULL,
  "logo_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "circle_member" (
  "id" text PRIMARY KEY NOT NULL,
  "circle_id" text NOT NULL,
  "user_id" text NOT NULL,
  "invite_id" text,
  "role" text DEFAULT 'member' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "referral" (
  "id" text PRIMARY KEY NOT NULL,
  "referrer_user_id" text NOT NULL,
  "referred_user_id" text,
  "friend_invite_id" text,
  "referral_type" text DEFAULT 'friend' NOT NULL,
  "source" text DEFAULT 'onboarding' NOT NULL,
  "status" text DEFAULT 'invited' NOT NULL,
  "reward_status" text DEFAULT 'unqualified' NOT NULL,
  "reward_amount_cents" integer DEFAULT 0 NOT NULL,
  "referred_email" text,
  "referred_phone" text,
  "external_target_name" text,
  "accepted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "friend_invite" DROP CONSTRAINT IF EXISTS "friend_invite_circle_id_circle_id_fk";
ALTER TABLE "friend_invite"
  ADD CONSTRAINT "friend_invite_circle_id_circle_id_fk"
  FOREIGN KEY ("circle_id") REFERENCES "public"."circle"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "circle" DROP CONSTRAINT IF EXISTS "circle_owner_user_id_user_id_fk";
ALTER TABLE "circle"
  ADD CONSTRAINT "circle_owner_user_id_user_id_fk"
  FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "circle_member" DROP CONSTRAINT IF EXISTS "circle_member_circle_id_circle_id_fk";
ALTER TABLE "circle_member"
  ADD CONSTRAINT "circle_member_circle_id_circle_id_fk"
  FOREIGN KEY ("circle_id") REFERENCES "public"."circle"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "circle_member" DROP CONSTRAINT IF EXISTS "circle_member_user_id_user_id_fk";
ALTER TABLE "circle_member"
  ADD CONSTRAINT "circle_member_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "circle_member" DROP CONSTRAINT IF EXISTS "circle_member_invite_id_friend_invite_id_fk";
ALTER TABLE "circle_member"
  ADD CONSTRAINT "circle_member_invite_id_friend_invite_id_fk"
  FOREIGN KEY ("invite_id") REFERENCES "public"."friend_invite"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "referral" DROP CONSTRAINT IF EXISTS "referral_referrer_user_id_user_id_fk";
ALTER TABLE "referral"
  ADD CONSTRAINT "referral_referrer_user_id_user_id_fk"
  FOREIGN KEY ("referrer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "referral" DROP CONSTRAINT IF EXISTS "referral_referred_user_id_user_id_fk";
ALTER TABLE "referral"
  ADD CONSTRAINT "referral_referred_user_id_user_id_fk"
  FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "referral" DROP CONSTRAINT IF EXISTS "referral_friend_invite_id_friend_invite_id_fk";
ALTER TABLE "referral"
  ADD CONSTRAINT "referral_friend_invite_id_friend_invite_id_fk"
  FOREIGN KEY ("friend_invite_id") REFERENCES "public"."friend_invite"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "friend_invite_circleId_idx" ON "friend_invite" ("circle_id");
CREATE INDEX IF NOT EXISTS "circle_ownerUserId_idx" ON "circle" ("owner_user_id");
CREATE INDEX IF NOT EXISTS "circle_member_circleId_idx" ON "circle_member" ("circle_id");
CREATE UNIQUE INDEX IF NOT EXISTS "circle_member_circleId_userId_idx" ON "circle_member" ("circle_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_friendInviteId_idx" ON "referral" ("friend_invite_id");
CREATE INDEX IF NOT EXISTS "referral_referrerUserId_idx" ON "referral" ("referrer_user_id");
CREATE INDEX IF NOT EXISTS "referral_type_status_idx" ON "referral" ("referral_type", "status");
