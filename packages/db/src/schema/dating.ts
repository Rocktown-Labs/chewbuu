import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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
    canceledDateCount: integer("canceled_date_count").default(0).notNull(),
    contributionScore: integer("contribution_score").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    datingModes: jsonb("dating_modes").$type<string[]>().default([]).notNull(),
    distanceMiles: integer("distance_miles").default(25).notNull(),
    favoriteThings: jsonb("favorite_things")
      .$type<string[]>()
      .default([])
      .notNull(),
    flakeCount: integer("flake_count").default(0).notNull(),
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
    reliabilityScore: integer("reliability_score").default(100).notNull(),
    religion: text("religion"),
    rescheduledDateCount: integer("rescheduled_date_count")
      .default(0)
      .notNull(),
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
    index("profile_matching_location_idx").on(
      table.canDate,
      table.onboarded,
      table.latitude,
      table.longitude
    ),
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
    circleId: text("circle_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    email: text("email"),
    id: text("id").primaryKey(),
    inviteToken: text("invite_token").notNull().unique(),
    invitePurpose: text("invite_purpose").default("friend_referral").notNull(),
    name: text("name"),
    phone: text("phone"),
    relationship: text("relationship").default("friend").notNull(),
    status: text("status").default("pending").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("friend_invite_circleId_idx").on(table.circleId),
    index("friend_invite_userId_idx").on(table.userId),
  ]
);

export const circle = pgTable(
  "circle",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    logoUrl: text("logo_url"),
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("circle_ownerUserId_idx").on(table.ownerUserId)]
);

export const circleMember = pgTable(
  "circle_member",
  {
    circleId: text("circle_id")
      .notNull()
      .references(() => circle.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    inviteId: text("invite_id").references(() => friendInvite.id, {
      onDelete: "set null",
    }),
    role: text("role").default("member").notNull(),
    status: text("status").default("active").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("circle_member_circleId_idx").on(table.circleId),
    uniqueIndex("circle_member_circleId_userId_idx").on(
      table.circleId,
      table.userId
    ),
  ]
);

export const referral = pgTable(
  "referral",
  {
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    externalTargetName: text("external_target_name"),
    friendInviteId: text("friend_invite_id").references(() => friendInvite.id, {
      onDelete: "set null",
    }),
    id: text("id").primaryKey(),
    referredEmail: text("referred_email"),
    referredPhone: text("referred_phone"),
    referredUserId: text("referred_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    referralType: text("referral_type").default("friend").notNull(),
    referrerUserId: text("referrer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rewardAmountCents: integer("reward_amount_cents").default(0).notNull(),
    rewardStatus: text("reward_status").default("unqualified").notNull(),
    source: text("source").default("onboarding").notNull(),
    status: text("status").default("invited").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("referral_friendInviteId_idx").on(table.friendInviteId),
    index("referral_referrerUserId_idx").on(table.referrerUserId),
    index("referral_type_status_idx").on(table.referralType, table.status),
  ]
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
    chimeMeetingId: text("chime_meeting_id"),
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
    source: text("source").default("friend").notNull(),
    requestId: text("request_id")
      .notNull()
      .references(() => dateRequest.id, { onDelete: "cascade" }),
    status: text("status").default("invited").notNull(),
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
    groupId: text("group_id"),
    id: text("id").primaryKey(),
    introVideoUrl: text("intro_video_url").notNull(),
    profilePhotoUrl: text("profile_photo_url"),
    profileSummary: text("profile_summary").notNull(),
    requestId: text("request_id")
      .notNull()
      .references(() => dateRequest.id, { onDelete: "cascade" }),
    matchKind: text("match_kind").default("individual").notNull(),
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
    personComment: text("person_comment"),
    personCriteria: jsonb("person_criteria")
      .$type<Record<string, number>>()
      .default({})
      .notNull(),
    personRating: integer("person_rating"),
    placeComment: text("place_comment"),
    placeCriteria: jsonb("place_criteria")
      .$type<Record<string, number>>()
      .default({})
      .notNull(),
    placeRating: integer("place_rating"),
    required: boolean("required").default(true).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("date_review_userId_idx").on(table.userId),
    uniqueIndex("date_review_dateRequestId_userId_idx").on(
      table.dateRequestId,
      table.userId
    ),
  ]
);

export const dateMedia = pgTable(
  "date_media",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    dateRequestId: text("date_request_id")
      .notNull()
      .references(() => dateRequest.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
  },
  (table) => [
    index("date_media_dateRequestId_idx").on(table.dateRequestId),
    index("date_media_uploadedByUserId_idx").on(table.uploadedByUserId),
  ]
);

export const dateReviewMedia = pgTable(
  "date_review_media",
  {
    dateMediaId: text("date_media_id")
      .notNull()
      .references(() => dateMedia.id, { onDelete: "cascade" }),
    reviewId: text("review_id")
      .notNull()
      .references(() => dateReview.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("date_review_media_reviewId_dateMediaId_idx").on(
      table.reviewId,
      table.dateMediaId
    ),
    index("date_review_media_dateMediaId_idx").on(table.dateMediaId),
  ]
);

export const friendship = pgTable(
  "friendship",
  {
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    friendUserId: text("friend_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    status: text("status").default("pending").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("friendship_userId_friendUserId_idx").on(
      table.userId,
      table.friendUserId
    ),
    index("friendship_friendUserId_idx").on(table.friendUserId),
  ]
);

export const recap = pgTable(
  "recap",
  {
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    caption: text("caption"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    dateRequestId: text("date_request_id")
      .notNull()
      .references(() => dateRequest.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    publishedAt: timestamp("published_at"),
    reviewId: text("review_id").references(() => dateReview.id, {
      onDelete: "set null",
    }),
    storyExpiresAt: timestamp("story_expires_at"),
    thumbnailUrl: text("thumbnail_url"),
    videoUrl: text("video_url").notNull(),
  },
  (table) => [
    index("recap_authorUserId_publishedAt_idx").on(
      table.authorUserId,
      table.publishedAt
    ),
    index("recap_storyExpiresAt_idx").on(table.storyExpiresAt),
    uniqueIndex("recap_authorUserId_dateRequestId_idx").on(
      table.authorUserId,
      table.dateRequestId
    ),
  ]
);

export const notification = pgTable(
  "notification",
  {
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    entityId: text("entity_id"),
    entityType: text("entity_type"),
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    readAt: timestamp("read_at"),
    title: text("title").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("notification_userId_dedupeKey_idx").on(
      table.userId,
      table.dedupeKey
    ),
    index("notification_userId_createdAt_idx").on(
      table.userId,
      table.createdAt
    ),
    index("notification_userId_readAt_idx").on(table.userId, table.readAt),
  ]
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

export const chatRoom = pgTable(
  "chat_room",
  {
    activeDateId: text("active_date_id").references(() => dateRequest.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    matchId: text("match_id").references(() => dateMatch.id, {
      onDelete: "set null",
    }),
    phase: text("phase").default("continued").notNull(),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("chat_room_activeDateId_idx").on(table.activeDateId),
    index("chat_room_kind_idx").on(table.kind),
    index("chat_room_matchId_idx").on(table.matchId),
  ]
);

export const chatParticipant = pgTable(
  "chat_participant",
  {
    avatarUrl: text("avatar_url"),
    displayName: text("display_name").notNull(),
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => chatRoom.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    index("chat_participant_roomId_idx").on(table.roomId),
    index("chat_participant_userId_idx").on(table.userId),
    uniqueIndex("chat_participant_roomId_userId_idx").on(
      table.roomId,
      table.userId
    ),
  ]
);

export const chatMessage = pgTable(
  "chat_message",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    durationSec: integer("duration_sec"),
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    mediaThumbUrl: text("media_thumb_url"),
    mediaUrl: text("media_url"),
    roomId: text("room_id")
      .notNull()
      .references(() => chatRoom.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    systemIcon: text("system_icon"),
    text: text("text"),
  },
  (table) => [
    index("chat_message_roomId_createdAt_idx").on(
      table.roomId,
      table.createdAt
    ),
    index("chat_message_senderId_idx").on(table.senderId),
  ]
);

export const chatReadState = pgTable(
  "chat_read_state",
  {
    lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
    roomId: text("room_id")
      .notNull()
      .references(() => chatRoom.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("chat_read_state_roomId_userId_idx").on(
      table.roomId,
      table.userId
    ),
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
