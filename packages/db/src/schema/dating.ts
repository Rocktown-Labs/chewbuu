import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const profile = pgTable(
  "profile",
  {
    ageRangeMax: integer("age_range_max"),
    ageRangeMin: integer("age_range_min"),
    area: text("area"),
    bio: text("bio"),
    birthday: text("birthday"),
    canDate: boolean("can_date").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    datingModes: jsonb("dating_modes").$type<string[]>().default([]).notNull(),
    distanceMiles: integer("distance_miles").default(25).notNull(),
    favoriteThings: jsonb("favorite_things")
      .$type<string[]>()
      .default([])
      .notNull(),
    height: text("height"),
    id: text("id").primaryKey(),
    interestDetails: jsonb("interest_details")
      .$type<Record<string, string[]>>()
      .default({})
      .notNull(),
    interestedIn: jsonb("interested_in")
      .$type<string[]>()
      .default([])
      .notNull(),
    interests: jsonb("interests").$type<string[]>().default([]).notNull(),
    introVideoUrl: text("intro_video_url"),
    kids: text("kids"),
    latitude: text("latitude"),
    lookingFor: jsonb("looking_for").$type<string[]>().default([]).notNull(),
    longitude: text("longitude"),
    maritalStatus: text("marital_status"),
    onboarded: boolean("onboarded").default(false).notNull(),
    onboardingCompletedAt: timestamp("onboarding_completed_at"),
    politics: text("politics"),
    profilePhotoUrl: text("profile_photo_url"),
    religion: text("religion"),
    safetyOptIn: boolean("safety_opt_in").default(false).notNull(),
    sex: text("sex"),
    sexuality: text("sexuality"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(),
    weight: text("weight"),
    wantsKids: text("wants_kids"),
    phone: text("phone"),
    occupation: text("occupation"),
    race: text("race"),
  },
  (table) => [
    index("profile_userId_idx").on(table.userId),
    index("profile_canDate_idx").on(table.canDate),
  ]
);

export const profileMedia = pgTable(
  "profile_media",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    kind: text("kind").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    url: text("url").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("profile_media_userId_idx").on(table.userId)]
);

export const trustedContact = pgTable(
  "trusted_contact",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    email: text("email"),
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("trusted_contact_userId_idx").on(table.userId)]
);

export const friendInvite = pgTable(
  "friend_invite",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    email: text("email"),
    id: text("id").primaryKey(),
    inviteToken: text("invite_token").notNull().unique(),
    name: text("name"),
    phone: text("phone"),
    relationship: text("relationship").default("friend").notNull(),
    status: text("status").default("pending").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("friend_invite_userId_idx").on(table.userId)]
);

export const membershipPlan = pgTable(
  "membership_plan",
  {
    active: boolean("active").default(true).notNull(),
    annualPriceCents: integer("annual_price_cents").default(0).notNull(),
    annualStripePriceId: text("annual_stripe_price_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cta: text("cta").notNull(),
    description: text("description").notNull(),
    features: jsonb("features").$type<string[]>().default([]).notNull(),
    id: text("id").primaryKey(),
    monthlyPriceCents: integer("monthly_price_cents").default(0).notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    stats: jsonb("stats").$type<string[]>().default([]).notNull(),
    stripePriceId: text("stripe_price_id"),
    tier: text("tier").notNull().unique(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("membership_plan_tier_idx").on(table.tier),
    index("membership_plan_active_idx").on(table.active),
  ]
);

export const dateRequest = pgTable(
  "date_request",
  {
    actualEndAt: timestamp("actual_end_at"),
    actualStartAt: timestamp("actual_start_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    filters: jsonb("filters").$type<string[]>().default([]).notNull(),
    id: text("id").primaryKey(),
    partySize: integer("party_size").default(1).notNull(),
    paymentMode: text("payment_mode").default("dutch").notNull(),
    scheduledAt: timestamp("scheduled_at").notNull(),
    searchArea: text("search_area").notNull(),
    status: text("status").default("draft").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    what: jsonb("what").$type<string[]>().default([]).notNull(),
  },
  (table) => [
    index("date_request_userId_idx").on(table.userId),
    index("date_request_status_idx").on(table.status),
  ]
);

export const dateRequestPartyMember = pgTable(
  "date_request_party_member",
  {
    displayName: text("display_name").notNull(),
    id: text("id").primaryKey(),
    invitedUserId: text("invited_user_id"),
    requestId: text("request_id")
      .notNull()
      .references(() => dateRequest.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("date_request_party_member_requestId_idx").on(table.requestId),
  ]
);

export const dateRequestPlace = pgTable(
  "date_request_place",
  {
    address: text("address"),
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    placeId: text("place_id").notNull(),
    rating: text("rating"),
    requestId: text("request_id")
      .notNull()
      .references(() => dateRequest.id, { onDelete: "cascade" }),
    selected: boolean("selected").default(false).notNull(),
    types: jsonb("types").$type<string[]>().default([]).notNull(),
  },
  (table) => [index("date_request_place_requestId_idx").on(table.requestId)]
);

export const dateMatch = pgTable(
  "date_match",
  {
    compatibility: integer("compatibility").default(80).notNull(),
    displayName: text("display_name").notNull(),
    id: text("id").primaryKey(),
    introVideoUrl: text("intro_video_url").notNull(),
    profilePhotoUrl: text("profile_photo_url"),
    profileSummary: text("profile_summary").notNull(),
    requestId: text("request_id")
      .notNull()
      .references(() => dateRequest.id, { onDelete: "cascade" }),
    status: text("status").default("suggested").notNull(),
    userId: text("user_id").notNull(),
    videoRepliesRequired: integer("video_replies_required")
      .default(3)
      .notNull(),
  },
  (table) => [index("date_match_requestId_idx").on(table.requestId)]
);

export const dateReview = pgTable(
  "date_review",
  {
    completedAt: timestamp("completed_at"),
    dateRequestId: text("date_request_id")
      .notNull()
      .references(() => dateRequest.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    personRating: integer("person_rating"),
    placeRating: integer("place_rating"),
    required: boolean("required").default(true).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("date_review_userId_idx").on(table.userId)]
);

export const conversation = pgTable(
  "conversation",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    dateRequestId: text("date_request_id").references(() => dateRequest.id, {
      onDelete: "cascade",
    }),
    id: text("id").primaryKey(),
    introExchanged: boolean("intro_exchanged").default(false).notNull(),
    textUnlocked: boolean("text_unlocked").default(false).notNull(),
  },
  (table) => [index("conversation_dateRequestId_idx").on(table.dateRequestId)]
);

export const videoMessage = pgTable(
  "video_message",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    isIntro: boolean("is_intro").default(false).notNull(),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
  },
  (table) => [
    index("video_message_conversationId_idx").on(table.conversationId),
  ]
);

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, {
    fields: [profile.userId],
    references: [user.id],
  }),
}));

export const dateRequestRelations = relations(dateRequest, ({ many, one }) => ({
  matches: many(dateMatch),
  partyMembers: many(dateRequestPartyMember),
  places: many(dateRequestPlace),
  reviews: many(dateReview),
  user: one(user, {
    fields: [dateRequest.userId],
    references: [user.id],
  }),
}));
