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

export interface FavoritePlace {
  address?: string;
  category: PlaceSuggestWhat;
  googleMapsUri?: string;
  latitude?: number;
  longitude?: number;
  name: string;
  placeId: string;
  types: string[];
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
  favoritePlaces?: Record<string, FavoritePlace[]>;
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

export interface VenueMenuPreviewItem {
  description?: string;
  name: string;
  price?: string;
  section?: string;
}

export interface VenueMenuPreview {
  fetchedAt: string;
  items: VenueMenuPreviewItem[];
  sourceUrl: string;
  status: "unverified";
  title?: string;
}

export interface VenueLocation {
  address?: string;
  id: string;
  menuUrl?: string;
  name: string;
  organizationId: string;
  status: string;
  websiteUrl?: string;
}

export interface VenueReferral {
  id: string;
  locationId: string;
  rewardAmountCents: number;
  status: string;
}

export interface VenueEvent {
  detail: string;
  id: string;
  kind: "order_created" | "reservation_requested";
  locationId: string;
  occurredAt: string;
  status: string;
  title: string;
}

export interface VenueReservation {
  assignedStaffUserId?: string;
  id: string;
  locationId: string;
  notes?: string;
  partySize: number;
  requestedAt: string;
  status: string;
  tableLabel?: string;
}

export interface VenueOrder {
  assignedStaffUserId?: string;
  currency: string;
  id: string;
  locationId: string;
  paymentStatus: string;
  status: string;
  subtotalCents: number;
  tipCents: number;
  totalCents: number;
}

export interface VenueWorkspace {
  location: VenueLocation;
  orders: VenueOrder[];
  reservations: VenueReservation[];
}

export type VenueMediaKind = "food_photo" | "menu_photo" | "venue_photo";

export interface DateRequestPayload {
  filters: string[];
  friendUserId?: string;
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
  people: { id: string; name: string; photoUrl: string | null }[];
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

export const venueApi = {
  approveClaim: (locationId: string) => blocksApi.approveVenueClaim(locationId),
  captureMenu: (locationId: string, url: string) =>
    blocksApi.captureVenueMenu({ locationId, url }) as Promise<{
      preview: VenueMenuPreview | null;
      reason?: "firecrawl_not_configured" | "invalid_menu" | "unavailable";
    }>,
  createLocation: (input: {
    address?: string;
    discoveryPlaceId?: string;
    menuUrl?: string;
    name: string;
    organizationName?: string;
    phone?: string;
    referralCode?: string;
    venueRole?: "owner" | "referrer";
    websiteUrl?: string;
  }) =>
    blocksApi.createVenueLocation(input) as unknown as Promise<{
      location: VenueLocation;
      referral?: VenueReferral;
    }>,
  follow: (locationId: string) => blocksApi.followVenue(locationId),
  getWorkspace: (locationId: string) =>
    blocksApi.getVenueWorkspace(locationId) as Promise<VenueWorkspace>,
  previewMenu: (url: string) =>
    blocksApi.previewVenueMenu({ url }) as Promise<{
      preview: VenueMenuPreview | null;
      reason?: "firecrawl_not_configured" | "invalid_menu" | "unavailable";
    }>,
  refer: (locationId: string) => blocksApi.createVenueReferral(locationId),
  subscribeEvents: (locationId: string) =>
    blocksApi.subscribeVenueEvents(locationId),
  saveMedia: (input: {
    kind: VenueMediaKind;
    locationId: string;
    url: string;
  }) => blocksApi.saveVenueMedia(input),
  uploadMedia: (input: {
    contentType: string;
    fileName: string;
    kind: VenueMediaKind;
    locationId: string;
  }) => blocksApi.createVenueMediaUpload(input),
  requestClaim: (locationId: string, claimNote?: string) =>
    blocksApi.requestVenueClaim(locationId, { claimNote }),
  requestReservation: (input: {
    locationId: string;
    notes?: string;
    partySize: number;
    requestedAt: string;
  }) => blocksApi.requestVenueReservation(input),
  requestShiftSwap: (input: { replacementUserId?: string; shiftId: string }) =>
    blocksApi.requestVenueShiftSwap(input),
  startDiningSession: (input: {
    locationId: string;
    reservationId?: string;
    tableLabel?: string;
  }) => blocksApi.startVenueDiningSession(input),
  updateOrder: (input: {
    assignedStaffUserId?: string;
    orderId: string;
    status: string;
  }) => blocksApi.updateVenueOrder(input),
  updateReservation: (input: {
    assignedStaffUserId?: string;
    reservationId: string;
    status: string;
    tableLabel?: string;
  }) => blocksApi.updateVenueReservation(input),
  createOrder: (input: {
    diningSessionId?: string;
    items: {
      name: string;
      notes?: string;
      quantity: number;
      unitPriceCents: number;
    }[];
    locationId: string;
    reservationId?: string;
    tipCents?: number;
  }) => blocksApi.createVenueOrder(input),
};

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
  startDate: (dateRequestId: string) => blocksApi.startDate(dateRequestId),
};

export const chimeApi = {
  getMeeting: (requestId: string) => blocksApi.getDateMeeting(requestId),
};

export const pricingApi = {
  getPlans: () =>
    blocksApi.getPricingPlans() as Promise<{ plans: MembershipPlan[] }>,
  seedPlans: () =>
    blocksApi.seedPricingPlans() as Promise<{ plans: MembershipPlan[] }>,
  syncPlans: () =>
    blocksApi.syncPricingPlans() as Promise<{
      message: string;
      plans: MembershipPlan[];
      stripeConfigured: boolean;
    }>,
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
