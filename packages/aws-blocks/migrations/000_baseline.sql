CREATE TABLE "account" (
	"access_token" text,
	"access_token_expires_at" timestamp,
	"account_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"impersonated_by" text,
	"ip_address" text,
	"token" text NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"billing_interval" text,
	"cancel_at" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"id" text PRIMARY KEY NOT NULL,
	"period_end" timestamp,
	"period_start" timestamp,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"seats" integer,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"stripe_customer_id" text,
	"stripe_schedule_id" text,
	"stripe_subscription_id" text,
	"trial_end" timestamp,
	"trial_start" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"ban_expires" timestamp,
	"ban_reason" text,
	"banned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"daily_date_limit" integer DEFAULT 2 NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"has_completed_onboarding" boolean DEFAULT false NOT NULL,
	"has_intro_video" boolean DEFAULT false NOT NULL,
	"has_profile_photo" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"image" text,
	"membership_tier" text DEFAULT 'social' NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"stripe_customer_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"date_request_id" text,
	"id" text PRIMARY KEY NOT NULL,
	"intro_exchanged" boolean DEFAULT false NOT NULL,
	"text_unlocked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_match" (
	"compatibility" integer DEFAULT 80 NOT NULL,
	"display_name" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"intro_video_url" text NOT NULL,
	"profile_photo_url" text,
	"profile_summary" text NOT NULL,
	"request_id" text NOT NULL,
	"status" text DEFAULT 'suggested' NOT NULL,
	"user_id" text NOT NULL,
	"video_replies_required" integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_request" (
	"actual_end_at" timestamp,
	"actual_start_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"party_size" integer DEFAULT 1 NOT NULL,
	"payment_mode" text DEFAULT 'dutch' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"search_area" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"what" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_request_party_member" (
	"display_name" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"invited_user_id" text,
	"request_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_request_place" (
	"address" text,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"place_id" text NOT NULL,
	"rating" text,
	"request_id" text NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"types" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_review" (
	"completed_at" timestamp,
	"date_request_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"person_rating" integer,
	"place_rating" integer,
	"required" boolean DEFAULT true NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friend_invite" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text,
	"id" text PRIMARY KEY NOT NULL,
	"invite_token" text NOT NULL,
	"phone" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "friend_invite_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "membership_plan" (
	"active" boolean DEFAULT true NOT NULL,
	"annual_price_cents" integer DEFAULT 0 NOT NULL,
	"annual_stripe_price_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"cta" text NOT NULL,
	"description" text NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"monthly_price_cents" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"stats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stripe_price_id" text,
	"tier" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "membership_plan_tier_unique" UNIQUE("tier")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"age_range_max" integer,
	"age_range_min" integer,
	"area" text,
	"bio" text,
	"birthday" text,
	"can_date" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"dating_modes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"distance_miles" integer DEFAULT 25 NOT NULL,
	"favorite_things" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"height" text,
	"id" text PRIMARY KEY NOT NULL,
	"interest_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"interested_in" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"intro_video_url" text,
	"latitude" text,
	"longitude" text,
	"onboarded" boolean DEFAULT false NOT NULL,
	"onboarding_completed_at" timestamp,
	"profile_photo_url" text,
	"safety_opt_in" boolean DEFAULT false NOT NULL,
	"sex" text,
	"sexuality" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"weight" text,
	"phone" text,
	"occupation" text,
	"race" text,
	CONSTRAINT "profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "profile_media" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"kind" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"url" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trusted_contact" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_message" (
	"conversation_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_intro" boolean DEFAULT false NOT NULL,
	"sender_id" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_date_request_id_date_request_id_fk" FOREIGN KEY ("date_request_id") REFERENCES "public"."date_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_match" ADD CONSTRAINT "date_match_request_id_date_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."date_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_request" ADD CONSTRAINT "date_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_request_party_member" ADD CONSTRAINT "date_request_party_member_request_id_date_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."date_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_request_place" ADD CONSTRAINT "date_request_place_request_id_date_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."date_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_review" ADD CONSTRAINT "date_review_date_request_id_date_request_id_fk" FOREIGN KEY ("date_request_id") REFERENCES "public"."date_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_review" ADD CONSTRAINT "date_review_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_invite" ADD CONSTRAINT "friend_invite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_media" ADD CONSTRAINT "profile_media_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_contact" ADD CONSTRAINT "trusted_contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_message" ADD CONSTRAINT "video_message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_message" ADD CONSTRAINT "video_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_referenceId_idx" ON "subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "conversation_dateRequestId_idx" ON "conversation" USING btree ("date_request_id");--> statement-breakpoint
CREATE INDEX "date_match_requestId_idx" ON "date_match" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "date_request_userId_idx" ON "date_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "date_request_status_idx" ON "date_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "date_request_party_member_requestId_idx" ON "date_request_party_member" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "date_request_place_requestId_idx" ON "date_request_place" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "date_review_userId_idx" ON "date_review" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "friend_invite_userId_idx" ON "friend_invite" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "membership_plan_tier_idx" ON "membership_plan" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "membership_plan_active_idx" ON "membership_plan" USING btree ("active");--> statement-breakpoint
CREATE INDEX "profile_userId_idx" ON "profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profile_canDate_idx" ON "profile" USING btree ("can_date");--> statement-breakpoint
CREATE INDEX "profile_media_userId_idx" ON "profile_media" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trusted_contact_userId_idx" ON "trusted_contact" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_message_conversationId_idx" ON "video_message" USING btree ("conversation_id");