import { db } from "@chewbuu/db";
import { and, eq, ilike, inArray, or, sql } from "@chewbuu/db/orm";
import { user } from "@chewbuu/db/schema/auth";
import {
  circle,
  circleMember,
  dateMatch,
  dateRequest,
  dateRequestPartyMember,
  dateRequestPlace,
  dateReview,
  friendInvite,
  profile,
  profileMedia,
  referral,
  trustedContact,
} from "@chewbuu/db/schema/dating";
import { env } from "@chewbuu/env/server";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { getSessionUser } from "../lib/auth-session";
import type { SessionUser } from "../lib/auth-session";
import { createRouter } from "../lib/create-app";
import { sendInviteNotifications } from "../lib/notifications";

const requiredString = z.string().trim().min(1);
const stringArray = z.array(z.string().trim().min(1)).default([]);
const minimumProfileAge = 18;
const under21MatchMaxAge = 22;
const maximumMatchAge = 99;

const getAge = (birthdayString: string) => {
  const birthday = new Date(birthdayString);
  if (Number.isNaN(birthday.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthOffset = today.getMonth() - birthday.getMonth();
  if (
    monthOffset < 0 ||
    (monthOffset === 0 && today.getDate() < birthday.getDate())
  ) {
    age -= 1;
  }

  return age;
};

const trustedContactSchema = z.object({
  email: z.email().optional().or(z.literal("")),
  name: requiredString,
  phone: z.string().optional(),
});

const trustedContactDraftSchema = z.object({
  email: z.email().optional().or(z.literal("")),
  name: z.string().optional(),
  phone: z.string().optional(),
});

const friendInviteSchema = z.object({
  email: z.email().optional().or(z.literal("")),
  invitePurpose: z
    .enum(["friend_referral", "circle_invite", "spouse_invite"])
    .optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  relationship: z.enum(["friend", "spouse"]).default("friend"),
});

const mediaSchema = z.object({
  isPrimary: z.boolean().default(false),
  kind: z.enum(["profile_photo", "photo", "intro_video"]),
  sortOrder: z.number().int().min(0).default(0),
  url: z.url(),
});

const profilePayloadSchema = z
  .object({
    ageRangeMax: z
      .number()
      .int()
      .min(minimumProfileAge)
      .max(maximumMatchAge)
      .optional(),
    ageRangeMin: z
      .number()
      .int()
      .min(minimumProfileAge)
      .max(maximumMatchAge)
      .optional(),
    area: requiredString,
    bio: z.string().optional(),
    birthday: requiredString,
    datingModes: stringArray,
    distanceMiles: z.number().int().min(1).max(250).default(25),
    favoriteThings: stringArray,
    friendInvites: z.array(friendInviteSchema).max(12).default([]),
    height: z.string().optional(),
    interestDetails: z.record(z.string(), z.array(z.string())).default({}),
    interestedIn: stringArray,
    interests: stringArray,
    kids: z.string().optional(),
    latitude: z.string().optional(),
    lookingFor: stringArray,
    longitude: z.string().optional(),
    maritalStatus: z.string().optional(),
    media: z.array(mediaSchema).max(7).default([]),
    politics: z.string().optional(),
    religion: z.string().optional(),
    safetyOptIn: z.boolean().default(false),
    sex: requiredString,
    sexuality: requiredString,
    trustedContacts: z.array(trustedContactSchema).max(2).default([]),
    weight: z.string().optional(),
    wantsKids: z.string().optional(),
    phone: z.string().optional(),
    occupation: z.string().optional(),
    race: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const age = getAge(value.birthday);
    if (age === null) {
      ctx.addIssue({
        code: "custom",
        message: "Birthday must be a valid date.",
        path: ["birthday"],
      });
      return;
    }

    if (age < minimumProfileAge) {
      ctx.addIssue({
        code: "custom",
        message: "Chewbuu is for users 18 and older.",
        path: ["birthday"],
      });
    }

    if (
      value.ageRangeMin &&
      value.ageRangeMax &&
      value.ageRangeMin > value.ageRangeMax
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Age range minimum cannot be greater than maximum.",
        path: ["ageRangeMin"],
      });
    }

    if (
      age < 21 &&
      value.ageRangeMax &&
      value.ageRangeMax > under21MatchMaxAge
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Users under 21 can only match with ages 18 to 22.",
        path: ["ageRangeMax"],
      });
    }
  });

const profileDraftPayloadSchema = z.object({
  ageRangeMax: z
    .number()
    .int()
    .min(minimumProfileAge)
    .max(maximumMatchAge)
    .optional(),
  ageRangeMin: z
    .number()
    .int()
    .min(minimumProfileAge)
    .max(maximumMatchAge)
    .optional(),
  area: z.string().optional(),
  bio: z.string().optional(),
  birthday: z.string().optional(),
  datingModes: stringArray,
  distanceMiles: z.number().int().min(1).max(250).default(25),
  favoriteThings: stringArray,
  friendInvites: z.array(friendInviteSchema).max(12).default([]),
  height: z.string().optional(),
  interestDetails: z.record(z.string(), z.array(z.string())).default({}),
  interestedIn: stringArray,
  interests: stringArray,
  kids: z.string().optional(),
  latitude: z.string().optional(),
  lookingFor: stringArray,
  longitude: z.string().optional(),
  maritalStatus: z.string().optional(),
  media: z.array(mediaSchema).max(7).default([]),
  politics: z.string().optional(),
  religion: z.string().optional(),
  safetyOptIn: z.boolean().default(false),
  sex: z.string().optional(),
  sexuality: z.string().optional(),
  trustedContacts: z.array(trustedContactDraftSchema).max(2).default([]),
  weight: z.string().optional(),
  wantsKids: z.string().optional(),
  phone: z.string().optional(),
  occupation: z.string().optional(),
  race: z.string().optional(),
});

const placeSchema = z.object({
  address: z.string().optional(),
  attributions: z.array(z.string()).optional(),
  googleMapsUri: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  name: requiredString,
  openNow: z.boolean().optional(),
  photoUrl: z.string().optional(),
  placeId: requiredString,
  priceLevel: z.string().optional(),
  rating: z.string().optional(),
  userRatingCount: z.number().optional(),
  websiteUri: z.string().optional(),
  types: stringArray,
});

const placeSuggestSchema = z.object({
  area: requiredString,
  filters: stringArray,
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  what: z
    .array(z.enum(["eat", "drink", "play", "move", "watch", "talk"]))
    .min(1),
});

const partyMemberSchema = z
  .object({
    displayName: z.string().optional(),
    email: z.email().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine(
    (value) => value.displayName || value.name || value.email || value.phone,
    {
      message: "Add a name, email, or phone for each party member.",
    }
  );

const dateRequestPayloadSchema = z.object({
  filters: stringArray,
  partyMembers: z.array(partyMemberSchema).max(3).default([]),
  paymentMode: z.enum(["dutch", "requester_covers"]),
  places: z.array(placeSchema).min(1).max(3),
  scheduledAt: z.iso.datetime(),
  searchArea: requiredString,
  what: z.array(z.enum(["eat", "drink", "play"])).min(1),
});

type MediaInput = z.infer<typeof mediaSchema>;
type ProfileDraftInput = z.infer<typeof profileDraftPayloadSchema>;
type ProfileInput = z.infer<typeof profilePayloadSchema>;
type RequestInput = z.infer<typeof dateRequestPayloadSchema>;
type PlaceSuggestionInput = z.infer<typeof placeSuggestSchema>;
type PlaceSuggestion = z.infer<typeof placeSchema>;
type GooglePlace = {
  currentOpeningHours?: {
    openNow?: boolean;
  };
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  googleMapsUri?: string;
  id?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  name?: string;
  photos?: {
    authorAttributions?: {
      displayName?: string;
      uri?: string;
    }[];
    name?: string;
  }[];
  priceLevel?: string;
  primaryType?: string;
  rating?: number;
  types?: string[];
  userRatingCount?: number;
  websiteUri?: string;
};
type GooglePlacesTextSearchResponse = {
  places?: GooglePlace[];
};

const nowId = () => crypto.randomUUID();

const inviteKey = (invite: {
  email?: null | string;
  phone?: null | string;
  relationship?: string;
}) =>
  [
    invite.relationship ?? "friend",
    invite.email?.trim().toLowerCase() ?? "",
    invite.phone?.replaceAll(/\D/g, "") ?? "",
  ].join(":");

const JOINABLE_INVITE_STATUSES = new Set(["pending", "sent"]);

export const isJoinableInvite = (
  invite: { email?: null | string; phone?: null | string; status: string },
  joiner: { email?: null | string; phone?: null | string }
) => {
  if (!JOINABLE_INVITE_STATUSES.has(invite.status)) {
    return false;
  }

  const inviteEmail = invite.email?.trim().toLowerCase();
  const joinerEmail = joiner.email?.trim().toLowerCase();
  if (inviteEmail && joinerEmail && inviteEmail === joinerEmail) {
    return true;
  }

  const invitePhone = invite.phone?.replaceAll(/\D/g, "");
  const joinerPhone = joiner.phone?.replaceAll(/\D/g, "");
  return Boolean(invitePhone && joinerPhone && invitePhone === joinerPhone);
};

const assertCanDate = async (sessionUser: SessionUser, input: RequestInput) => {
  const readiness = await getReadiness(sessionUser);

  if (!readiness.canDate) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message:
        "Complete onboarding, profile photo, and intro video before dating.",
    });
  }

  if (readiness.pendingReviews > 0) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Complete pending reviews before booking another date.",
    });
  }

  const partySize = input.partyMembers.length + 1;
  if (sessionUser.membershipTier === "social" && partySize > 1) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Social members can only create solo dates.",
    });
  }

  if (
    input.paymentMode === "requester_covers" &&
    sessionUser.membershipTier !== "sugar"
  ) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Upgrade to Sugar to cover the date.",
    });
  }

  const bookedToday = await countBookedToday(sessionUser.id);
  if (bookedToday >= sessionUser.dailyDateLimit) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Daily date booking limit reached.",
    });
  }

  const targetTime = new Date(input.scheduledAt).getTime();
  const twoHours = 2 * 60 * 60 * 1000;

  const existingRequests: { scheduledAt: Date | string; status: string }[] =
    isTestRuntime()
      ? (memory.requests.get(sessionUser.id) ?? [])
      : await db
          .select({
            scheduledAt: dateRequest.scheduledAt,
            status: dateRequest.status,
          })
          .from(dateRequest)
          .where(eq(dateRequest.userId, sessionUser.id));

  for (const req of existingRequests) {
    if (req.status === "declined" || req.status === "cancelled") {
      continue;
    }
    const reqTime = new Date(req.scheduledAt).getTime();
    if (Math.abs(reqTime - targetTime) < twoHours) {
      throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
        message: "You already have a date booked within 2 hours of this time.",
      });
    }
  }
};

type StoredProfile = ProfileInput & {
  canDate: boolean;
  onboarded: boolean;
  userId: string;
};

type StoredRequest = RequestInput & {
  id: string;
  partySize: number;
  status: string;
  userId: string;
};

type StoredInvite = {
  circleId: null | string;
  email: string | null;
  id: string;
  inviteToken: string;
  invitePurpose: "circle_invite" | "friend_referral" | "spouse_invite";
  name: string | null;
  phone: string | null;
  relationship: "friend" | "spouse";
  status: string;
  userId: string;
};

export const mergeInviteRowsForSave = (
  existingInvites: StoredInvite[],
  inputInvites: (ProfileInput["friendInvites"][number] & {
    circleId?: null | string;
    invitePurpose?: StoredInvite["invitePurpose"];
  })[],
  userId: string
): StoredInvite[] => {
  const existingInviteByKey = new Map(
    existingInvites.map((invite) => [inviteKey(invite), invite])
  );

  return inputInvites.map((item) => {
    const existingInvite = existingInviteByKey.get(inviteKey(item));

    return {
      circleId: item.circleId ?? existingInvite?.circleId ?? null,
      email: item.email || null,
      id: existingInvite?.id ?? nowId(),
      inviteToken: existingInvite?.inviteToken ?? nowId(),
      invitePurpose:
        item.invitePurpose ??
        existingInvite?.invitePurpose ??
        (item.relationship === "spouse" ? "spouse_invite" : "friend_referral"),
      name: item.name ?? null,
      phone: item.phone ?? null,
      relationship: item.relationship,
      status: existingInvite?.status ?? "pending",
      userId,
    };
  });
};

export const invitePurposeForMembership = (
  invite: ProfileInput["friendInvites"][number],
  membershipTier: string
): StoredInvite["invitePurpose"] => {
  if (invite.relationship === "spouse") {
    return "spouse_invite";
  }

  return membershipTier === "mingle" || membershipTier === "sugar"
    ? "circle_invite"
    : "friend_referral";
};

const memory = {
  matches: new Map<string, ReturnType<typeof buildMatches>>(),
  profiles: new Map<string, StoredProfile>(),
  requests: new Map<string, StoredRequest[]>(),
};

const isTestRuntime = () => process.env.NODE_ENV === "test";

const hasRequiredMedia = (media: MediaInput[]) => {
  const hasProfilePhoto = media.some((item) => item.kind === "profile_photo");
  const hasIntroVideo = media.some((item) => item.kind === "intro_video");
  const photoCount = media.filter((item) => item.kind === "photo").length;

  return {
    canDate: hasProfilePhoto && hasIntroVideo,
    hasIntroVideo,
    hasProfilePhoto,
    photoCount,
  };
};

const buildMatches = (requestId: string) => [
  {
    compatibility: 94,
    displayName: "Maya",
    id: `${requestId}-match-1`,
    introVideoUrl: "https://example.com/maya-intro.mp4",
    profilePhotoUrl: "https://example.com/maya.jpg",
    profileSummary:
      "Likes whiskey lounges, live music, and low-pressure first dates.",
    status: "suggested",
    userId: "match-maya",
    videoRepliesRequired: 3,
  },
  {
    compatibility: 88,
    displayName: "Jordan",
    id: `${requestId}-match-2`,
    introVideoUrl: "https://example.com/jordan-intro.mp4",
    profilePhotoUrl: "https://example.com/jordan.jpg",
    profileSummary:
      "Usually says yes to pool, tacos, and sports watch parties.",
    status: "suggested",
    userId: "match-jordan",
    videoRepliesRequired: 3,
  },
  {
    compatibility: 83,
    displayName: "Riley",
    id: `${requestId}-match-3`,
    introVideoUrl: "https://example.com/riley-intro.mp4",
    profilePhotoUrl: "https://example.com/riley.jpg",
    profileSummary: "Into playful group hangs, great food, and dessert after.",
    status: "suggested",
    userId: "match-riley",
    videoRepliesRequired: 3,
  },
];

const draftProfileDefaults = {
  area: "",
  birthday: "",
  datingModes: [],
  distanceMiles: 25,
  favoriteThings: [],
  friendInvites: [],
  interestDetails: {},
  interestedIn: [],
  interests: [],
  lookingFor: [],
  media: [],
  safetyOptIn: false,
  sex: "",
  sexuality: "",
  trustedContacts: [],
} satisfies ProfileInput;

const getReadiness = async (sessionUser: SessionUser) => {
  const hasUsername = !!(sessionUser.username || sessionUser.displayUsername);

  if (isTestRuntime()) {
    const storedProfile = memory.profiles.get(sessionUser.id);
    const pendingReviews = 0;
    const hasSafetyContact = !!(
      storedProfile?.safetyOptIn || storedProfile?.trustedContacts?.length
    );
    const baseOnboarded =
      storedProfile?.onboarded ?? sessionUser.hasCompletedOnboarding;
    const isFullyOnboarded = hasUsername && hasSafetyContact && baseOnboarded;

    return {
      canDate:
        (storedProfile?.canDate ??
          (sessionUser.hasCompletedOnboarding &&
            sessionUser.hasIntroVideo &&
            sessionUser.hasProfilePhoto)) &&
        isFullyOnboarded,
      onboarded: isFullyOnboarded,
      pendingReviews,
    };
  }

  const [storedProfile] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, sessionUser.id))
    .limit(1);
  const pendingReviews = await db
    .select()
    .from(dateReview)
    .where(
      and(eq(dateReview.userId, sessionUser.id), eq(dateReview.required, true))
    );
  const safetyContacts = await db
    .select({ id: trustedContact.id })
    .from(trustedContact)
    .where(eq(trustedContact.userId, sessionUser.id))
    .limit(1);

  const hasSafetyContact = !!(
    storedProfile?.safetyOptIn || safetyContacts.length > 0
  );
  const baseOnboarded =
    storedProfile?.onboarded ?? sessionUser.hasCompletedOnboarding;
  const isFullyOnboarded = hasUsername && hasSafetyContact && baseOnboarded;

  return {
    canDate:
      (storedProfile?.canDate ??
        (sessionUser.hasCompletedOnboarding &&
          sessionUser.hasIntroVideo &&
          sessionUser.hasProfilePhoto)) &&
      isFullyOnboarded,
    onboarded: isFullyOnboarded,
    pendingReviews: pendingReviews.filter((review) => !review.completedAt)
      .length,
  };
};

const countBookedToday = async (userId: string) => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  if (isTestRuntime()) {
    return (memory.requests.get(userId) ?? []).filter(
      (request) => new Date(request.scheduledAt) >= start
    ).length;
  }

  const requests = await db
    .select()
    .from(dateRequest)
    .where(eq(dateRequest.userId, userId));
  return requests.filter((request) => request.scheduledAt >= start).length;
};

const canOwnCircles = (membershipTier: string) =>
  membershipTier === "mingle" || membershipTier === "sugar";

const getOrCreateOnboardingCircleId = async (sessionUser: SessionUser) => {
  const [existingCircle] = await db
    .select()
    .from(circle)
    .where(eq(circle.ownerUserId, sessionUser.id))
    .limit(1);

  if (existingCircle) {
    return existingCircle.id;
  }

  const circleId = nowId();
  await db.insert(circle).values({
    id: circleId,
    name: `${sessionUser.name || "My"} Chewbuu Circle`,
    ownerUserId: sessionUser.id,
  });
  await db.insert(circleMember).values({
    circleId,
    id: nowId(),
    role: "owner",
    userId: sessionUser.id,
  });

  return circleId;
};

const buildReferralRows = (inviteRows: StoredInvite[]) =>
  inviteRows.map((invite) => ({
    friendInviteId: invite.id,
    id: nowId(),
    referredEmail: invite.email,
    referredPhone: invite.phone,
    referralType: invite.relationship === "spouse" ? "spouse" : "friend",
    referrerUserId: invite.userId,
    rewardStatus: "unqualified",
    source: "onboarding",
    status: invite.status === "joined" ? "accepted" : "invited",
  }));

const saveProfile = async (sessionUser: SessionUser, input: ProfileInput) => {
  const mediaState = hasRequiredMedia(input.media);
  const { canDate } = mediaState;
  const hasUsername = !!(sessionUser.username || sessionUser.displayUsername);
  const hasSafetyContact = !!(
    input.safetyOptIn || input.trustedContacts.length > 0
  );
  const onboarded =
    hasUsername &&
    hasSafetyContact &&
    (sessionUser.hasCompletedOnboarding ||
      !!(input.birthday && input.sex && input.sexuality && input.area));
  const inputWithInvitePurposes = {
    ...input,
    friendInvites: input.friendInvites.map((invite) => ({
      ...invite,
      invitePurpose: invitePurposeForMembership(
        invite,
        sessionUser.membershipTier
      ),
    })),
  };

  if (isTestRuntime()) {
    const storedProfile = {
      ...inputWithInvitePurposes,
      canDate,
      onboarded,
      userId: sessionUser.id,
    };
    memory.profiles.set(sessionUser.id, storedProfile);
    return storedProfile;
  }

  const profileId = nowId();

  await db
    .insert(profile)
    .values({
      ageRangeMax: input.ageRangeMax,
      ageRangeMin: input.ageRangeMin,
      area: input.area,
      bio: input.bio,
      birthday: input.birthday,
      canDate,
      datingModes: input.datingModes,
      distanceMiles: input.distanceMiles,
      favoriteThings: input.favoriteThings,
      height: input.height,
      id: profileId,
      interestDetails: input.interestDetails,
      interestedIn: input.interestedIn,
      interests: input.interests,
      introVideoUrl: input.media.find((item) => item.kind === "intro_video")
        ?.url,
      kids: input.kids,
      latitude: input.latitude,
      lookingFor: input.lookingFor,
      longitude: input.longitude,
      maritalStatus: input.maritalStatus,
      onboarded,
      onboardingCompletedAt: onboarded ? new Date() : null,
      politics: input.politics,
      profilePhotoUrl: input.media.find((item) => item.kind === "profile_photo")
        ?.url,
      religion: input.religion,
      safetyOptIn: input.safetyOptIn,
      sex: input.sex,
      sexuality: input.sexuality,
      userId: sessionUser.id,
      weight: input.weight,
      wantsKids: input.wantsKids,
      phone: input.phone,
      occupation: input.occupation,
      race: input.race,
    })
    .onConflictDoUpdate({
      set: {
        ageRangeMax: input.ageRangeMax,
        ageRangeMin: input.ageRangeMin,
        area: input.area,
        bio: input.bio,
        birthday: input.birthday,
        canDate,
        datingModes: input.datingModes,
        distanceMiles: input.distanceMiles,
        favoriteThings: input.favoriteThings,
        height: input.height,
        interestDetails: input.interestDetails,
        interestedIn: input.interestedIn,
        interests: input.interests,
        introVideoUrl: input.media.find((item) => item.kind === "intro_video")
          ?.url,
        kids: input.kids,
        latitude: input.latitude,
        lookingFor: input.lookingFor,
        longitude: input.longitude,
        maritalStatus: input.maritalStatus,
        onboarded,
        onboardingCompletedAt: onboarded ? new Date() : null,
        politics: input.politics,
        profilePhotoUrl: input.media.find(
          (item) => item.kind === "profile_photo"
        )?.url,
        religion: input.religion,
        safetyOptIn: input.safetyOptIn,
        sex: input.sex,
        sexuality: input.sexuality,
        updatedAt: new Date(),
        weight: input.weight,
        wantsKids: input.wantsKids,
        phone: input.phone,
        occupation: input.occupation,
        race: input.race,
      },
      target: profile.userId,
    });

  const existingInvites = await db
    .select()
    .from(friendInvite)
    .where(eq(friendInvite.userId, sessionUser.id));
  const existingInviteRows = existingInvites.flatMap((invite) => {
    const { relationship } = invite;

    if (relationship !== "friend" && relationship !== "spouse") {
      return [];
    }

    const storedRelationship: StoredInvite["relationship"] =
      relationship === "spouse" ? "spouse" : "friend";
    const storedInvitePurpose: StoredInvite["invitePurpose"] =
      invite.invitePurpose === "circle_invite" ||
      invite.invitePurpose === "spouse_invite"
        ? invite.invitePurpose
        : "friend_referral";

    return [
      {
        circleId: invite.circleId,
        email: invite.email,
        id: invite.id,
        inviteToken: invite.inviteToken,
        invitePurpose: storedInvitePurpose,
        name: invite.name,
        phone: invite.phone,
        relationship: storedRelationship,
        status: invite.status,
        userId: invite.userId,
      },
    ];
  });
  const shouldCreateCircle = inputWithInvitePurposes.friendInvites.some(
    (invite) => invite.relationship !== "spouse"
  );
  const onboardingCircleId =
    shouldCreateCircle && canOwnCircles(sessionUser.membershipTier)
      ? await getOrCreateOnboardingCircleId(sessionUser)
      : null;
  const normalizedInvites = inputWithInvitePurposes.friendInvites.map(
    (invite) => {
      return {
        ...invite,
        circleId:
          invite.invitePurpose === "circle_invite" ? onboardingCircleId : null,
      };
    }
  );
  const inviteRows = mergeInviteRowsForSave(
    existingInviteRows,
    normalizedInvites,
    sessionUser.id
  );

  await db.delete(profileMedia).where(eq(profileMedia.userId, sessionUser.id));
  await db
    .delete(trustedContact)
    .where(eq(trustedContact.userId, sessionUser.id));
  await db
    .delete(referral)
    .where(
      and(
        eq(referral.referrerUserId, sessionUser.id),
        eq(referral.source, "onboarding")
      )
    );
  await db.delete(friendInvite).where(eq(friendInvite.userId, sessionUser.id));

  if (input.media.length > 0) {
    await db.insert(profileMedia).values(
      input.media.map((item) => ({
        id: nowId(),
        isPrimary: item.isPrimary,
        kind: item.kind,
        sortOrder: item.sortOrder,
        url: item.url,
        userId: sessionUser.id,
      }))
    );
  }

  if (input.trustedContacts.length > 0) {
    await db.insert(trustedContact).values(
      input.trustedContacts.map((item) => ({
        email: item.email || null,
        id: nowId(),
        name: item.name,
        phone: item.phone,
        userId: sessionUser.id,
      }))
    );
  }

  if (inviteRows.length > 0) {
    await db.insert(friendInvite).values(inviteRows);
    await db.insert(referral).values(buildReferralRows(inviteRows));
  }

  const notificationRecipients = inviteRows
    .filter((item) => item.status !== "sent" && (item.email || item.phone))
    .map((item) => ({
      email: item.email ?? undefined,
      id: item.id,
      name: item.name ?? undefined,
      phone: item.phone ?? undefined,
      relationship: item.relationship,
    }));

  if (notificationRecipients.length > 0) {
    const outcomes = await sendInviteNotifications(
      notificationRecipients,
      sessionUser
    );
    const deliveredInviteIds = outcomes
      .filter((outcome) => outcome.results.some((result) => result.sent))
      .map((outcome) => outcome.recipient.id)
      .filter((id): id is string => !!id);

    if (deliveredInviteIds.length > 0) {
      for (const inviteId of deliveredInviteIds) {
        await db
          .update(friendInvite)
          .set({ status: "sent" })
          .where(eq(friendInvite.id, inviteId));
      }
    }
  }

  await db
    .update(user)
    .set({
      hasCompletedOnboarding: onboarded,
      hasIntroVideo: mediaState.hasIntroVideo,
      hasProfilePhoto: mediaState.hasProfilePhoto,
    })
    .where(eq(user.id, sessionUser.id));

  if (onboarded) {
    await syncCircleJoins(sessionUser, input.phone);
  }

  return {
    ...inputWithInvitePurposes,
    canDate,
    onboarded,
    userId: sessionUser.id,
  };
};

const saveProfileDraft = async (
  sessionUser: SessionUser,
  input: ProfileDraftInput
) => {
  const mediaState = hasRequiredMedia(input.media);
  const completedOnboarding = sessionUser.hasCompletedOnboarding;
  const trustedContacts = input.trustedContacts.filter(
    (item): item is { email?: string; name: string; phone?: string } =>
      !!item.name?.trim() && !!(item.email?.trim() || item.phone?.trim())
  );
  const inputWithInvitePurposes = {
    ...input,
    friendInvites: input.friendInvites.map((invite) => ({
      ...invite,
      invitePurpose: invitePurposeForMembership(
        invite,
        sessionUser.membershipTier
      ),
    })),
    trustedContacts,
  };
  const storedDraft: StoredProfile = {
    ...draftProfileDefaults,
    ...inputWithInvitePurposes,
    area: input.area ?? "",
    birthday: input.birthday ?? "",
    canDate: completedOnboarding && mediaState.canDate,
    onboarded: completedOnboarding,
    sex: input.sex ?? "",
    sexuality: input.sexuality ?? "",
    trustedContacts,
    userId: sessionUser.id,
  };

  if (isTestRuntime()) {
    memory.profiles.set(sessionUser.id, storedDraft);
    return storedDraft;
  }

  const profileId = nowId();

  await db
    .insert(profile)
    .values({
      ageRangeMax: input.ageRangeMax,
      ageRangeMin: input.ageRangeMin,
      area: input.area,
      bio: input.bio,
      birthday: input.birthday,
      canDate: storedDraft.canDate,
      datingModes: input.datingModes,
      distanceMiles: input.distanceMiles,
      favoriteThings: input.favoriteThings,
      height: input.height,
      id: profileId,
      interestDetails: input.interestDetails,
      interestedIn: input.interestedIn,
      interests: input.interests,
      introVideoUrl: input.media.find((item) => item.kind === "intro_video")
        ?.url,
      kids: input.kids,
      latitude: input.latitude,
      lookingFor: input.lookingFor,
      longitude: input.longitude,
      maritalStatus: input.maritalStatus,
      onboarded: completedOnboarding,
      onboardingCompletedAt: completedOnboarding ? new Date() : null,
      politics: input.politics,
      profilePhotoUrl: input.media.find((item) => item.kind === "profile_photo")
        ?.url,
      religion: input.religion,
      safetyOptIn: input.safetyOptIn,
      sex: input.sex,
      sexuality: input.sexuality,
      userId: sessionUser.id,
      weight: input.weight,
      wantsKids: input.wantsKids,
      phone: input.phone,
      occupation: input.occupation,
      race: input.race,
    })
    .onConflictDoUpdate({
      set: {
        ageRangeMax: input.ageRangeMax,
        ageRangeMin: input.ageRangeMin,
        area: input.area,
        bio: input.bio,
        birthday: input.birthday,
        canDate: storedDraft.canDate,
        datingModes: input.datingModes,
        distanceMiles: input.distanceMiles,
        favoriteThings: input.favoriteThings,
        height: input.height,
        interestDetails: input.interestDetails,
        interestedIn: input.interestedIn,
        interests: input.interests,
        introVideoUrl: input.media.find((item) => item.kind === "intro_video")
          ?.url,
        kids: input.kids,
        latitude: input.latitude,
        lookingFor: input.lookingFor,
        longitude: input.longitude,
        maritalStatus: input.maritalStatus,
        onboarded: completedOnboarding,
        onboardingCompletedAt: completedOnboarding ? new Date() : null,
        politics: input.politics,
        profilePhotoUrl: input.media.find(
          (item) => item.kind === "profile_photo"
        )?.url,
        religion: input.religion,
        safetyOptIn: input.safetyOptIn,
        sex: input.sex,
        sexuality: input.sexuality,
        updatedAt: new Date(),
        weight: input.weight,
        wantsKids: input.wantsKids,
        phone: input.phone,
        occupation: input.occupation,
        race: input.race,
      },
      target: profile.userId,
    });

  const existingInvites = await db
    .select()
    .from(friendInvite)
    .where(eq(friendInvite.userId, sessionUser.id));
  const existingInviteRows = existingInvites.flatMap((invite) => {
    const { relationship } = invite;

    if (relationship !== "friend" && relationship !== "spouse") {
      return [];
    }

    const storedRelationship: StoredInvite["relationship"] =
      relationship === "spouse" ? "spouse" : "friend";
    const storedInvitePurpose: StoredInvite["invitePurpose"] =
      invite.invitePurpose === "circle_invite" ||
      invite.invitePurpose === "spouse_invite"
        ? invite.invitePurpose
        : "friend_referral";

    return [
      {
        circleId: invite.circleId,
        email: invite.email,
        id: invite.id,
        inviteToken: invite.inviteToken,
        invitePurpose: storedInvitePurpose,
        name: invite.name,
        phone: invite.phone,
        relationship: storedRelationship,
        status: invite.status,
        userId: invite.userId,
      },
    ];
  });
  const inviteRows = mergeInviteRowsForSave(
    existingInviteRows,
    inputWithInvitePurposes.friendInvites,
    sessionUser.id
  );

  await db.delete(profileMedia).where(eq(profileMedia.userId, sessionUser.id));
  await db
    .delete(trustedContact)
    .where(eq(trustedContact.userId, sessionUser.id));
  await db
    .delete(referral)
    .where(
      and(
        eq(referral.referrerUserId, sessionUser.id),
        eq(referral.source, "onboarding")
      )
    );
  await db.delete(friendInvite).where(eq(friendInvite.userId, sessionUser.id));

  if (input.media.length > 0) {
    await db.insert(profileMedia).values(
      input.media.map((item) => ({
        id: nowId(),
        isPrimary: item.isPrimary,
        kind: item.kind,
        sortOrder: item.sortOrder,
        url: item.url,
        userId: sessionUser.id,
      }))
    );
  }

  if (trustedContacts.length > 0) {
    await db.insert(trustedContact).values(
      trustedContacts.map((item) => ({
        email: item.email || null,
        id: nowId(),
        name: item.name,
        phone: item.phone,
        userId: sessionUser.id,
      }))
    );
  }

  if (inviteRows.length > 0) {
    await db.insert(friendInvite).values(inviteRows);
    await db.insert(referral).values(buildReferralRows(inviteRows));
  }

  await db
    .update(user)
    .set({
      hasCompletedOnboarding: completedOnboarding,
      hasIntroVideo: completedOnboarding && mediaState.hasIntroVideo,
      hasProfilePhoto: completedOnboarding && mediaState.hasProfilePhoto,
    })
    .where(eq(user.id, sessionUser.id));

  return storedDraft;
};

// Circle activation: an invited friend only becomes a circle member once they
// have an account AND have finished onboarding. Runs on every onboarded
// profile save in both directions.
const syncCircleJoins = async (
  sessionUser: SessionUser,
  joinerPhone?: string
) => {
  const acceptInvite = async (invite: {
    circleId: null | string;
    id: string;
    userId: string;
  }) => {
    await db
      .update(friendInvite)
      .set({ status: "joined" })
      .where(eq(friendInvite.id, invite.id));
    await db
      .update(referral)
      .set({
        acceptedAt: new Date(),
        referredUserId: sessionUser.id,
        rewardStatus: "qualified",
        status: "accepted",
        updatedAt: new Date(),
      })
      .where(eq(referral.friendInviteId, invite.id));

    if (invite.circleId) {
      await db
        .insert(circleMember)
        .values({
          circleId: invite.circleId,
          id: nowId(),
          inviteId: invite.id,
          userId: sessionUser.id,
        })
        .onConflictDoNothing();
    }
  };

  // Joiner side: this user just finished onboarding, so flip any pending
  // invites other users sent to this email/phone.
  const phoneDigits = joinerPhone?.replaceAll(/\D/g, "");
  const joinerConditions = [ilike(friendInvite.email, sessionUser.email)];
  if (phoneDigits) {
    joinerConditions.push(
      sql`regexp_replace(${friendInvite.phone}, '\D', '', 'g') = ${phoneDigits}` as never
    );
  }
  const incomingInvites = await db
    .select()
    .from(friendInvite)
    .where(or(...joinerConditions));
  const joinableIncoming = incomingInvites.filter((invite) =>
    isJoinableInvite(invite, { email: sessionUser.email, phone: joinerPhone })
  );
  for (const invite of joinableIncoming) {
    await acceptInvite(invite);
  }

  // Inviter side: this user's own pending invites may point at people who
  // already finished onboarding.
  const outgoingInvites = await db
    .select()
    .from(friendInvite)
    .where(eq(friendInvite.userId, sessionUser.id));
  for (const invite of outgoingInvites) {
    if (!invite.email || !JOINABLE_INVITE_STATUSES.has(invite.status)) {
      continue;
    }
    const [invitee] = await db
      .select()
      .from(user)
      .where(ilike(user.email, invite.email))
      .limit(1);
    if (invitee?.hasCompletedOnboarding) {
      await db
        .update(friendInvite)
        .set({ status: "joined" })
        .where(eq(friendInvite.id, invite.id));
      await db
        .update(referral)
        .set({
          acceptedAt: new Date(),
          referredUserId: invitee.id,
          rewardStatus: "qualified",
          status: "accepted",
          updatedAt: new Date(),
        })
        .where(eq(referral.friendInviteId, invite.id));
      if (invite.circleId) {
        await db
          .insert(circleMember)
          .values({
            circleId: invite.circleId,
            id: nowId(),
            inviteId: invite.id,
            userId: invitee.id,
          })
          .onConflictDoNothing();
      }
    }
  }
};

const getProfile = async (sessionUser: SessionUser) => {
  if (isTestRuntime()) {
    return memory.profiles.get(sessionUser.id) ?? null;
  }

  const [storedProfile] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, sessionUser.id))
    .limit(1);
  const media = await db
    .select()
    .from(profileMedia)
    .where(eq(profileMedia.userId, sessionUser.id));
  const contacts = await db
    .select()
    .from(trustedContact)
    .where(eq(trustedContact.userId, sessionUser.id));
  const invites = await db
    .select()
    .from(friendInvite)
    .where(eq(friendInvite.userId, sessionUser.id));

  return storedProfile
    ? {
        ...storedProfile,
        friendInvites: invites,
        media,
        trustedContacts: contacts,
      }
    : null;
};

const fallbackPlaceSuggestions = (
  input: PlaceSuggestionInput
): PlaceSuggestion[] => {
  const joined = input.filters.join(", ");
  const baseTypes = input.what;
  const primaryName = baseTypes.includes("drink")
    ? "The Golden Booth"
    : baseTypes.includes("play")
      ? "Cue & Co."
      : "Supper Club";

  return [
    {
      address: `${input.area} dining district`,
      name: primaryName,
      openNow: true,
      placeId: `mock-${baseTypes.join("-")}-1`,
      priceLevel: "PRICE_LEVEL_MODERATE",
      rating: "4.7",
      userRatingCount: 128,
      types: [...baseTypes, joined || "date spot"],
    },
    {
      address: `${input.area} main street`,
      name: "Good Company Social",
      openNow: true,
      placeId: `mock-${baseTypes.join("-")}-2`,
      priceLevel: "PRICE_LEVEL_INEXPENSIVE",
      rating: "4.5",
      userRatingCount: 94,
      types: [...baseTypes, "good for groups"],
    },
    {
      address: `${input.area} near you`,
      name: "The Third Place",
      openNow: false,
      placeId: `mock-${baseTypes.join("-")}-3`,
      priceLevel: "PRICE_LEVEL_MODERATE",
      rating: "4.6",
      userRatingCount: 76,
      types: [...baseTypes, "easy first date"],
    },
  ];
};

const getGooglePlacesApiKey = () => {
  const key = (
    env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY
  )?.trim();
  return key && key !== '""' ? key : undefined;
};

const CATEGORY_KEYWORDS: Record<string, string> = {
  drink: "bar drinks wine beer coffee cocktail",
  eat: "food restaurant",
  move: "fitness gym activity workout",
  play: "fun entertainment things to do",
  talk: "conversation topics",
  watch: "movies shows entertainment",
};

const CATEGORY_INCLUDED_TYPE: Record<string, string | undefined> = {
  drink: "bar",
  eat: "restaurant",
  move: undefined,
  play: undefined,
  talk: undefined,
  watch: undefined,
};

const GOOGLE_PLACES_FIELD_MASK = [
  "places.id",
  "places.name",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.types",
  "places.primaryType",
  "places.location",
  "places.photos",
  "places.currentOpeningHours",
  "places.priceLevel",
  "places.googleMapsUri",
  "places.websiteUri",
].join(",");

const toPlacePhotoProxyUrl = (photoName: string) =>
  `/dating/places/photos?name=${encodeURIComponent(photoName)}`;

export const buildGooglePlacesTextQuery = (input: PlaceSuggestionInput) => {
  const filters = input.filters.join(" ");
  const categoryIntent = input.what
    .map((item) => CATEGORY_KEYWORDS[item] ?? item)
    .join(" ");
  const descriptors = [filters, categoryIntent].filter(Boolean).join(" ");

  return `${descriptors} in ${input.area}`;
};

export const normalizeGooglePlaces = (
  places: GooglePlace[] | undefined,
  googlePlacesApiKey = ""
): PlaceSuggestion[] =>
  (places ?? []).flatMap((place) => {
    const placeId = place.id ?? place.name?.replace("places/", "");
    const name = place.displayName?.text;
    const [primaryPhoto] = place.photos ?? [];

    if (!placeId || !name) {
      return [];
    }

    const types = [
      ...(place.types ?? []),
      ...(place.primaryType ? [place.primaryType] : []),
    ];

    return [
      {
        ...(place.formattedAddress ? { address: place.formattedAddress } : {}),
        ...(typeof place.location?.latitude === "number" &&
        typeof place.location?.longitude === "number"
          ? {
              latitude: place.location.latitude,
              longitude: place.location.longitude,
            }
          : {}),
        ...(place.googleMapsUri ? { googleMapsUri: place.googleMapsUri } : {}),
        name,
        ...(typeof place.currentOpeningHours?.openNow === "boolean"
          ? { openNow: place.currentOpeningHours.openNow }
          : {}),
        ...(primaryPhoto?.authorAttributions?.length
          ? {
              attributions: primaryPhoto.authorAttributions.flatMap(
                (attribution) =>
                  attribution.displayName ? [attribution.displayName] : []
              ),
            }
          : {}),
        ...(primaryPhoto?.name && googlePlacesApiKey
          ? { photoUrl: toPlacePhotoProxyUrl(primaryPhoto.name) }
          : {}),
        placeId,
        ...(place.priceLevel ? { priceLevel: place.priceLevel } : {}),
        ...(typeof place.rating === "number"
          ? { rating: place.rating.toFixed(1) }
          : {}),
        ...(typeof place.userRatingCount === "number"
          ? { userRatingCount: place.userRatingCount }
          : {}),
        ...(place.websiteUri ? { websiteUri: place.websiteUri } : {}),
        types: Array.from(new Set(types)).slice(0, 6),
      },
    ];
  });

const googlePlacesSearch = async (
  input: PlaceSuggestionInput
): Promise<PlaceSuggestion[]> => {
  const googlePlacesApiKey = getGooglePlacesApiKey();

  if (!googlePlacesApiKey) {
    return fallbackPlaceSuggestions(input);
  }

  const includedType = input.what
    .map((item) => CATEGORY_INCLUDED_TYPE[item])
    .find(Boolean);
  const lat = input.latitude ? Number(input.latitude) : undefined;
  const lng = input.longitude ? Number(input.longitude) : undefined;
  const hasCoordinates =
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng);

  const body: Record<string, unknown> = {
    pageSize: 12,
    textQuery: buildGooglePlacesTextQuery(input),
  };

  if (includedType) {
    body.includedType = includedType;
  }

  if (hasCoordinates) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 40_000,
      },
    };
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": googlePlacesApiKey,
          "x-goog-fieldmask": GOOGLE_PLACES_FIELD_MASK,
        },
        method: "POST",
      }
    );
    const data = (await response.json()) as GooglePlacesTextSearchResponse & {
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error("Google Places API error:", {
        message: data.error?.message,
        query: buildGooglePlacesTextQuery(input),
        status: response.status,
      });
      return fallbackPlaceSuggestions(input);
    }

    const places = normalizeGooglePlaces(data.places, googlePlacesApiKey);
    return places.length > 0 ? places : fallbackPlaceSuggestions(input);
  } catch (error) {
    console.error("Google Places request failed:", error);
    return fallbackPlaceSuggestions(input);
  }
};

const createDateRequest = async (
  sessionUser: SessionUser,
  input: RequestInput
) => {
  await assertCanDate(sessionUser, input);

  const requestId = nowId();
  const storedRequest = {
    ...input,
    id: requestId,
    partySize: input.partyMembers.length + 1,
    status: "places_selected",
    userId: sessionUser.id,
  };

  if (isTestRuntime()) {
    const requests = memory.requests.get(sessionUser.id) ?? [];
    requests.push(storedRequest);
    memory.requests.set(sessionUser.id, requests);
    memory.matches.set(requestId, buildMatches(requestId));
    return storedRequest;
  }

  await db.insert(dateRequest).values({
    filters: input.filters,
    id: requestId,
    partySize: input.partyMembers.length + 1,
    paymentMode: input.paymentMode,
    scheduledAt: new Date(input.scheduledAt),
    searchArea: input.searchArea,
    status: "places_selected",
    userId: sessionUser.id,
    what: input.what,
  });

  if (input.partyMembers.length > 0) {
    await db.insert(dateRequestPartyMember).values(
      input.partyMembers.map((member) => ({
        displayName:
          member.displayName ??
          member.name ??
          member.email ??
          member.phone ??
          "Guest",
        id: nowId(),
        requestId,
      }))
    );
  }

  await db.insert(dateRequestPlace).values(
    input.places.map((place) => ({
      address: place.address,
      id: nowId(),
      name: place.name,
      placeId: place.placeId,
      rating: place.rating,
      requestId,
      selected: true,
      types: place.types,
    }))
  );

  await db.insert(dateMatch).values(
    buildMatches(requestId).map((match) => ({
      compatibility: match.compatibility,
      displayName: match.displayName,
      id: match.id,
      introVideoUrl: match.introVideoUrl,
      profilePhotoUrl: match.profilePhotoUrl,
      profileSummary: match.profileSummary,
      requestId,
      status: match.status,
      userId: match.userId,
      videoRepliesRequired: match.videoRepliesRequired,
    }))
  );

  return storedRequest;
};

const listRequests = async (sessionUser: SessionUser) => {
  if (isTestRuntime()) {
    const reqs = memory.requests.get(sessionUser.id) ?? [];
    return reqs.map((req) => ({
      ...req,
      matches: memory.matches.get(req.id) ?? buildMatches(req.id),
    }));
  }

  const requests = await db
    .select()
    .from(dateRequest)
    .where(eq(dateRequest.userId, sessionUser.id));

  if (requests.length === 0) {
    return [];
  }

  const places = await db
    .select()
    .from(dateRequestPlace)
    .where(
      inArray(
        dateRequestPlace.requestId,
        requests.map((request) => request.id)
      )
    );

  const matches = await db
    .select()
    .from(dateMatch)
    .where(
      inArray(
        dateMatch.requestId,
        requests.map((request) => request.id)
      )
    );

  return requests.map((request) => ({
    ...request,
    places: places.filter((place) => place.requestId === request.id),
    matches: matches.filter((match) => match.requestId === request.id),
  }));
};

const listMatches = async (requestId: string) => {
  if (isTestRuntime()) {
    return memory.matches.get(requestId) ?? buildMatches(requestId);
  }

  return db.select().from(dateMatch).where(eq(dateMatch.requestId, requestId));
};

const router = createRouter()
  .get("/dating/summary", async (c) => {
    const sessionUser = await getSessionUser(c.req.raw.headers);
    const readiness = await getReadiness(sessionUser);
    const requests = await listRequests(sessionUser);

    return c.json({
      membershipTier: sessionUser.membershipTier,
      readiness,
      requests,
    });
  })
  .get("/dating/profile", async (c) => {
    const sessionUser = await getSessionUser(c.req.raw.headers);
    const storedProfile = await getProfile(sessionUser);

    return c.json({ profile: storedProfile });
  })
  .put("/dating/profile", async (c) => {
    const sessionUser = await getSessionUser(c.req.raw.headers);
    const parsed = profilePayloadSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
        message:
          parsed.error.issues[0]?.message ?? "Profile payload is invalid.",
      });
    }
    const body = parsed.data;
    const savedProfile = await saveProfile(sessionUser, body);
    const readiness = await getReadiness(sessionUser);

    return c.json({ profile: savedProfile, readiness });
  })
  .put("/dating/profile/draft", async (c) => {
    const sessionUser = await getSessionUser(c.req.raw.headers);
    const parsed = profileDraftPayloadSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
        message: parsed.error.issues[0]?.message ?? "Profile draft is invalid.",
      });
    }
    const savedProfile = await saveProfileDraft(sessionUser, parsed.data);
    const readiness = await getReadiness(sessionUser);

    return c.json({ profile: savedProfile, readiness });
  })
  .post("/dating/places/suggest", async (c) => {
    await getSessionUser(c.req.raw.headers);
    const body = placeSuggestSchema.parse(await c.req.json());

    return c.json({ places: await googlePlacesSearch(body) });
  })
  .get("/dating/places/photos", async (c) => {
    await getSessionUser(c.req.raw.headers);
    const googlePlacesApiKey = getGooglePlacesApiKey();
    const photoName = c.req.query("name");

    if (!googlePlacesApiKey || !photoName?.startsWith("places/")) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: "Place photo is unavailable.",
      });
    }

    const photoResponse = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=960`,
      {
        headers: {
          "x-goog-api-key": googlePlacesApiKey,
        },
        redirect: "follow",
      }
    );

    if (!(photoResponse.ok && photoResponse.body)) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: "Place photo is unavailable.",
      });
    }

    const headers = new Headers();
    const contentType = photoResponse.headers.get("content-type");
    const cacheControl = photoResponse.headers.get("cache-control");
    if (contentType) {
      headers.set("content-type", contentType);
    }
    headers.set("cache-control", cacheControl ?? "private, max-age=3600");
    headers.set("x-content-type-options", "nosniff");

    return new Response(photoResponse.body, { headers });
  })
  .get("/dating/requests", async (c) => {
    const sessionUser = await getSessionUser(c.req.raw.headers);
    const requests = await listRequests(sessionUser);

    return c.json({ requests });
  })
  .post("/dating/requests", async (c) => {
    const sessionUser = await getSessionUser(c.req.raw.headers);
    const body = dateRequestPayloadSchema.parse(await c.req.json());
    const request = await createDateRequest(sessionUser, body);
    const matches = await listMatches(request.id);

    return c.json({ matches, request }, HttpStatusCodes.CREATED);
  })
  .get("/dating/requests/:id/matches", async (c) => {
    await getSessionUser(c.req.raw.headers);
    const matches = await listMatches(c.req.param("id"));

    return c.json({ matches });
  });

export default router;
