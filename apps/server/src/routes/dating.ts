import { db } from "@chewbuu/db";
import { and, eq } from "@chewbuu/db/orm";
import { user } from "@chewbuu/db/schema/auth";
import {
  dateMatch,
  dateRequest,
  dateRequestPartyMember,
  dateRequestPlace,
  dateReview,
  friendInvite,
  profile,
  profileMedia,
  trustedContact,
} from "@chewbuu/db/schema/dating";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { getSessionUser } from "../lib/auth-session";
import type { SessionUser } from "../lib/auth-session";
import { createRouter } from "../lib/create-app";

const requiredString = z.string().trim().min(1);
const stringArray = z.array(z.string().trim().min(1)).default([]);

const trustedContactSchema = z.object({
  email: z.email().optional().or(z.literal("")),
  name: requiredString,
  phone: z.string().optional(),
});

const friendInviteSchema = z.object({
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

const mediaSchema = z.object({
  isPrimary: z.boolean().default(false),
  kind: z.enum(["profile_photo", "photo", "intro_video"]),
  sortOrder: z.number().int().min(0).default(0),
  url: z.url(),
});

const profilePayloadSchema = z.object({
  ageRangeMax: z.number().int().min(18).max(99).optional(),
  ageRangeMin: z.number().int().min(18).max(99).optional(),
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
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  media: z.array(mediaSchema).max(7).default([]),
  safetyOptIn: z.boolean().default(false),
  sex: requiredString,
  sexuality: requiredString,
  trustedContacts: z.array(trustedContactSchema).max(2).default([]),
  weight: z.string().optional(),
});

const placeSchema = z.object({
  address: z.string().optional(),
  name: requiredString,
  placeId: requiredString,
  rating: z.string().optional(),
  types: stringArray,
});

const placeSuggestSchema = z.object({
  area: requiredString,
  filters: stringArray,
  what: z.array(z.enum(["eat", "drink", "play"])).min(1),
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
  places: z.array(placeSchema).length(3),
  scheduledAt: z.iso.datetime(),
  searchArea: requiredString,
  what: z.array(z.enum(["eat", "drink", "play"])).min(1),
});

type MediaInput = z.infer<typeof mediaSchema>;
type ProfileInput = z.infer<typeof profilePayloadSchema>;
type RequestInput = z.infer<typeof dateRequestPayloadSchema>;

const nowId = () => crypto.randomUUID();

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

const getReadiness = async (sessionUser: SessionUser) => {
  if (isTestRuntime()) {
    const storedProfile = memory.profiles.get(sessionUser.id);
    const pendingReviews = 0;

    return {
      canDate:
        storedProfile?.canDate ??
        (sessionUser.hasCompletedOnboarding &&
          sessionUser.hasIntroVideo &&
          sessionUser.hasProfilePhoto),
      onboarded: storedProfile?.onboarded ?? sessionUser.hasCompletedOnboarding,
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

  return {
    canDate:
      storedProfile?.canDate ??
      (sessionUser.hasCompletedOnboarding &&
        sessionUser.hasIntroVideo &&
        sessionUser.hasProfilePhoto),
    onboarded: storedProfile?.onboarded ?? sessionUser.hasCompletedOnboarding,
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

const saveProfile = async (sessionUser: SessionUser, input: ProfileInput) => {
  const mediaState = hasRequiredMedia(input.media);
  const { canDate } = mediaState;
  const onboarded = canDate;

  if (isTestRuntime()) {
    const storedProfile = {
      ...input,
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
      latitude: input.latitude,
      longitude: input.longitude,
      onboarded,
      onboardingCompletedAt: onboarded ? new Date() : null,
      profilePhotoUrl: input.media.find((item) => item.kind === "profile_photo")
        ?.url,
      safetyOptIn: input.safetyOptIn,
      sex: input.sex,
      sexuality: input.sexuality,
      userId: sessionUser.id,
      weight: input.weight,
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
        latitude: input.latitude,
        longitude: input.longitude,
        onboarded,
        onboardingCompletedAt: onboarded ? new Date() : null,
        profilePhotoUrl: input.media.find(
          (item) => item.kind === "profile_photo"
        )?.url,
        safetyOptIn: input.safetyOptIn,
        sex: input.sex,
        sexuality: input.sexuality,
        updatedAt: new Date(),
        weight: input.weight,
      },
      target: profile.userId,
    });

  await db.delete(profileMedia).where(eq(profileMedia.userId, sessionUser.id));
  await db
    .delete(trustedContact)
    .where(eq(trustedContact.userId, sessionUser.id));
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

  if (input.friendInvites.length > 0) {
    await db.insert(friendInvite).values(
      input.friendInvites.map((item) => ({
        email: item.email || null,
        id: nowId(),
        inviteToken: nowId(),
        phone: item.phone,
        userId: sessionUser.id,
      }))
    );
  }

  await db
    .update(user)
    .set({
      hasCompletedOnboarding: onboarded,
      hasIntroVideo: mediaState.hasIntroVideo,
      hasProfilePhoto: mediaState.hasProfilePhoto,
    })
    .where(eq(user.id, sessionUser.id));

  return {
    ...input,
    canDate,
    onboarded,
    userId: sessionUser.id,
  };
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

const suggestPlaces = (input: z.infer<typeof placeSuggestSchema>) => {
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
      placeId: `mock-${baseTypes.join("-")}-1`,
      rating: "4.7",
      types: [...baseTypes, joined || "date spot"],
    },
    {
      address: `${input.area} main street`,
      name: "Good Company Social",
      placeId: `mock-${baseTypes.join("-")}-2`,
      rating: "4.5",
      types: [...baseTypes, "good for groups"],
    },
    {
      address: `${input.area} near you`,
      name: "The Third Place",
      placeId: `mock-${baseTypes.join("-")}-3`,
      rating: "4.6",
      types: [...baseTypes, "easy first date"],
    },
  ];
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
    return memory.requests.get(sessionUser.id) ?? [];
  }

  return db
    .select()
    .from(dateRequest)
    .where(eq(dateRequest.userId, sessionUser.id));
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
    const body = profilePayloadSchema.parse(await c.req.json());
    const savedProfile = await saveProfile(sessionUser, body);
    const readiness = await getReadiness(sessionUser);

    return c.json({ profile: savedProfile, readiness });
  })
  .post("/dating/places/suggest", async (c) => {
    await getSessionUser(c.req.raw.headers);
    const body = placeSuggestSchema.parse(await c.req.json());

    return c.json({ places: suggestPlaces(body) });
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
