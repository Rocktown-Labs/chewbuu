CREATE TABLE "passkey" (
	"backed_up" boolean DEFAULT false NOT NULL,
	"counter" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"credential_id" text NOT NULL,
	"device_type" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"transports" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"logo_url" text,
	"name" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_member" (
	"circle_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"invite_id" text,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral" (
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"external_target_name" text,
	"friend_invite_id" text,
	"id" text PRIMARY KEY NOT NULL,
	"referred_email" text,
	"referred_phone" text,
	"referred_user_id" text,
	"referral_type" text DEFAULT 'friend' NOT NULL,
	"referrer_user_id" text NOT NULL,
	"reward_amount_cents" integer DEFAULT 0 NOT NULL,
	"reward_status" text DEFAULT 'unqualified' NOT NULL,
	"source" text DEFAULT 'onboarding' NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "date_review" ADD COLUMN "person_comment" text;--> statement-breakpoint
ALTER TABLE "date_review" ADD COLUMN "person_criteria" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "date_review" ADD COLUMN "place_comment" text;--> statement-breakpoint
ALTER TABLE "date_review" ADD COLUMN "place_criteria" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "friend_invite" ADD COLUMN "circle_id" text;--> statement-breakpoint
ALTER TABLE "friend_invite" ADD COLUMN "invite_purpose" text DEFAULT 'friend_referral' NOT NULL;--> statement-breakpoint
ALTER TABLE "friend_invite" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "friend_invite" ADD COLUMN "relationship" text DEFAULT 'friend' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "canceled_date_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "flake_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "kids" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "looking_for" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "marital_status" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "politics" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "reliability_score" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "religion" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "rescheduled_date_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "wants_kids" text;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle" ADD CONSTRAINT "circle_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_member" ADD CONSTRAINT "circle_member_circle_id_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_member" ADD CONSTRAINT "circle_member_invite_id_friend_invite_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."friend_invite"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_member" ADD CONSTRAINT "circle_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_friend_invite_id_friend_invite_id_fk" FOREIGN KEY ("friend_invite_id") REFERENCES "public"."friend_invite"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referred_user_id_user_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referrer_user_id_user_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "circle_ownerUserId_idx" ON "circle" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "circle_member_circleId_idx" ON "circle_member" USING btree ("circle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "circle_member_circleId_userId_idx" ON "circle_member" USING btree ("circle_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_friendInviteId_idx" ON "referral" USING btree ("friend_invite_id");--> statement-breakpoint
CREATE INDEX "referral_referrerUserId_idx" ON "referral" USING btree ("referrer_user_id");--> statement-breakpoint
CREATE INDEX "referral_type_status_idx" ON "referral" USING btree ("referral_type","status");--> statement-breakpoint
CREATE INDEX "friend_invite_circleId_idx" ON "friend_invite" USING btree ("circle_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");