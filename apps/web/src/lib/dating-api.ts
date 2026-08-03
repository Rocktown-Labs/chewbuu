import { api as blocksApi } from "@chewbuu/aws-blocks";
import { env } from "@chewbuu/env/web";

interface ApiOptions {
  body?: unknown;
  method?: "GET" | "POST" | "PUT";
}

export type MembershipTier = "social" | "mingle" | "sugar";
export type DateWhat = "eat" | "drink" | "play";
export type PlaceSuggestWhat = DateWhat | "move" | "watch" | "talk";
export type PaymentMode = "dutch" | "requester_covers";

export interface DatingMedia {
  isPrimary?: boolean;
  kind: "profile_photo" | "photo" | "intro_video";
  sortOrder?: number;
  url: string;
}

export interface DatingProfilePayload {
  ageRangeMax?: number;
  ageRangeMin?: number;
  distanceMiles?: number;
  area: string;
  birthday: string;
  bio?: string;
  username?: string;
  datingModes: string[];
  latitude?: string;
  longitude?: string;
  favoriteThings: string[];
  friendInvites: {
    circleId?: string;
    email?: string;
    inviteToken?: string;
    invitePurpose?: "circle_invite" | "friend_referral" | "spouse_invite";
    name?: string;
    phone?: string;
    relationship?: "friend" | "spouse";
    status?: string;
  }[];
  height?: string;
  interestDetails: Record<string, string[]>;
  interestedIn: string[];
  interests: string[];
  kids?: string;
  lookingFor: string[];
  maritalStatus?: string;
  media: DatingMedia[];
  name?: string;
  politics?: string;
  religion?: string;
  safetyOptIn: boolean;
  sex: string;
  sexuality: string;
  trustedContacts: { email?: string; name: string; phone?: string }[];
  weight?: string;
  wantsKids?: string;
  phone?: string;
  occupation?: string;
  race?: string;
}

export type DatingProfileDraftPayload = Partial<
  Omit<DatingProfilePayload, "media" | "trustedContacts">
> & {
  media?: DatingMedia[];
  trustedContacts?: { email?: string; name?: string; phone?: string }[];
};

export interface DatePlace {
  address?: string;
  attributions?: string[];
  googleMapsUri?: string;
  latitude?: number;
  longitude?: number;
  name: string;
  openNow?: boolean;
  photoUrl?: string;
  placeId: string;
  priceLevel?: string;
  rating?: string;
  userRatingCount?: number;
  websiteUri?: string;
  types: string[];
}

export interface DateRequestPayload {
  filters: string[];
  partyMembers: {
    displayName?: string;
    email?: string;
    name?: string;
    phone?: string;
  }[];
  paymentMode: PaymentMode;
  places: DatePlace[];
  scheduledAt: string;
  searchArea: string;
  what: DateWhat[];
}

export interface DateMatch {
  compatibility: number;
  displayName: string;
  id: string;
  introVideoUrl: string;
  profilePhotoUrl?: string;
  profileSummary: string;
  status: string;
  userId: string;
  videoRepliesRequired: number;
}

export interface DatingSummary {
  membershipTier: MembershipTier;
  readiness: {
    canDate: boolean;
    onboarded: boolean;
    pendingReviews: number;
  };
  requests: (DateRequestPayload & {
    id: string;
    partySize: number;
    status: string;
    matches?: DateMatch[];
  })[];
}

export interface ReviewCriterion {
  key: string;
  label: string;
}

export interface DateReviewPayload {
  personComment?: string;
  personCriteria: Record<string, number>;
  personRating: number;
  placeComment?: string;
  placeCriteria: Record<string, number>;
  placeRating: number;
}

export interface DateReview extends DateReviewPayload {
  completedAt?: string;
  dateRequestId: string;
  id: string;
  required: boolean;
  userId: string;
}

export interface ReviewPrompt {
  criteria: {
    person: ReviewCriterion[];
    place: ReviewCriterion[];
  };
  existingReview: DateReview | null;
  places: DatePlace[];
  request: {
    id: string;
    searchArea: string;
    status: string;
  };
}

export interface PendingReview {
  completedAt: string | null;
  dateRequestId: string;
  id: string;
  required: boolean;
  searchArea: string;
  scheduledAt: string;
}

export interface Friendship {
  acceptedAt: string | null;
  createdAt: string;
  friendUserId: string;
  id: string;
  status: string;
  userId: string;
}

export interface Circle {
  id: string;
  members: { id: string; role: string; status: string; userId: string }[];
  name: string;
  ownerUserId: string;
}

export interface DateMedia {
  createdAt: string;
  dateRequestId: string;
  id: string;
  kind: string;
  thumbnailUrl: string | null;
  uploadedByUserId: string;
  url: string;
}

export interface DateRecap {
  authorUserId: string;
  caption?: string;
  createdAt: string;
  dateRequestId: string;
  id: string;
  publishedAt: string | null;
  reviewId?: string;
  storyExpiresAt: string | null;
  storyHours?: number;
  thumbnailUrl?: string;
  videoUrl: string;
}

export const getServerUrl = (url: string) => {
  const normalized = url.endsWith("/") ? url.slice(0, -1) : url;

  if (!normalized.startsWith("/")) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }

  return `http://localhost:3000${normalized}`;
};

export const getApiUrl = (path: string, baseUrl = env.VITE_SERVER_URL) => {
  const cleanBase = getServerUrl(baseUrl).replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
};

export const apiFetch = async <T>(path: string, options: ApiOptions = {}) => {
  const response = await fetch(getApiUrl(path), {
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    method: options.method ?? "GET",
  });

  const data = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? data.message
        : undefined;
    throw new Error(message || "Request failed.");
  }

  return data as T;
};

export interface MembershipPlan {
  active: boolean;
  annualPriceCents: number;
  annualStripePriceId?: string;
  cta: string;
  description: string;
  features: string[];
  id?: string;
  monthlyPriceCents: number;
  name: string;
  sortOrder: number;
  stats: string[];
  stripePriceId?: string;
  tier: MembershipTier;
}

export const datingApi = {
  createRequest: (body: DateRequestPayload) =>
    blocksApi.createDateRequest(body) as unknown as Promise<{
      matches: DateMatch[];
      request: DatingSummary["requests"][number];
    }>,
  getPendingReviews: () =>
    blocksApi.getPendingReviews() as Promise<{ reviews: PendingReview[] }>,
  getProfile: async () =>
    (await blocksApi.getProfile()) as {
      profile: DatingProfilePayload | null;
    },
  getSummary: async () => (await blocksApi.getDatingSummary()) as DatingSummary,
  saveProfile: (body: DatingProfilePayload) =>
    blocksApi.saveProfile(body) as unknown as Promise<{
      profile: DatingProfilePayload;
      readiness: DatingSummary["readiness"];
    }>,
  saveProfileDraft: (body: DatingProfileDraftPayload) =>
    blocksApi.saveProfileDraft(body) as unknown as Promise<{
      profile: DatingProfilePayload;
      readiness: DatingSummary["readiness"];
    }>,
  suggestPlaces: (body: {
    area: string;
    filters: string[];
    latitude?: string;
    longitude?: string;
    searchKind?: "place" | "signal";
    what: PlaceSuggestWhat[];
  }) =>
    blocksApi.suggestPlaces(body) as unknown as Promise<{
      places: DatePlace[];
    }>,
  checkIn: (body: {
    code?: string;
    dateRequestId?: string;
    partnerId?: string;
  }) => blocksApi.checkIn(body as Parameters<typeof blocksApi.checkIn>[0]),
};

export const chimeApi = {
  getMeeting: (requestId: string) => blocksApi.getDateMeeting(requestId),
};

export const pricingApi = {
  getPlans: () =>
    blocksApi.getPricingPlans() as Promise<{ plans: MembershipPlan[] }>,
  seedPlans: () =>
    blocksApi.seedPricingPlans() as Promise<{ plans: MembershipPlan[] }>,
  syncPlans: async () => {
    const result = await blocksApi.getPricingPlans();
    return {
      ...result,
      message: "Pricing plans loaded. Stripe sync is not available in Blocks.",
      stripeConfigured: false,
    };
  },
  updatePlans: (plans: MembershipPlan[]) =>
    blocksApi.updatePricingPlans({ plans } as Parameters<
      typeof blocksApi.updatePricingPlans
    >[0]) as unknown as Promise<{
      plans: MembershipPlan[];
    }>,
};

export const reviewsApi = {
  getPrompt: (requestId: string) =>
    blocksApi.getReviewPrompt(requestId) as unknown as Promise<ReviewPrompt>,
  submit: (requestId: string, body: DateReviewPayload) =>
    blocksApi.submitReview(requestId, body) as unknown as Promise<{
      review: DateReview;
    }>,
};

export const friendshipsApi = {
  get: () =>
    blocksApi.getFriendships() as Promise<{ friendships: Friendship[] }>,
  request: (friendUserId: string) => blocksApi.requestFriendship(friendUserId),
  respond: (friendshipId: string, status: "accepted" | "declined") =>
    blocksApi.respondFriendship(friendshipId, status),
};

export const circlesApi = {
  get: () => blocksApi.getCircles() as Promise<{ circles: Circle[] }>,
  create: (name: string) => blocksApi.createCircle(name),
};

export const notificationsApi = {
  get: () => blocksApi.getNotifications(),
  markRead: (notificationIds: string[]) =>
    blocksApi.markNotificationsRead(notificationIds),
  subscribe: () => blocksApi.subscribeNotifications(),
};

export const dateMediaApi = {
  get: (requestId: string) =>
    blocksApi.getDateMedia(requestId) as Promise<{
      media: DateMedia[];
    }>,
  upload: (input: {
    dateRequestId: string;
    kind: string;
    thumbnailUrl?: string;
    url: string;
  }) => blocksApi.uploadDateMedia(input),
};

export const recapsApi = {
  get: () => blocksApi.getRecaps() as Promise<{ recaps: DateRecap[] }>,
  publish: (input: {
    caption?: string;
    dateRequestId: string;
    reviewId?: string;
    storyHours?: number;
    thumbnailUrl?: string;
    videoUrl: string;
  }) => blocksApi.publishRecap(input),
};
