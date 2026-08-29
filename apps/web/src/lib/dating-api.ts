import { api as blocksApi } from "@chewbuu/aws-blocks";
import type {
  VenueJobListing as BlocksVenueJobListing,
  VenueServiceBoard as BlocksVenueServiceBoard,
  VenueServiceConfig as BlocksVenueServiceConfig,
  VenueServiceCustomer as BlocksVenueServiceCustomer,
  VenueServiceMode as BlocksVenueServiceMode,
  VenueServiceOrder as BlocksVenueServiceOrder,
  StripeCheckoutSessionResponse,
  StripeConnectedAccountResponse,
  StripeIntegrationHealth,
  StripePaymentResponse,
  StripeRefundResponse,
  StripeTipAllocationInput,
  StripeVenueConnectStatus,
  StripeWebhookSyncResponse,
  SpotCaptureOffer,
  SpotCaptureRewardConfig,
  SpotContributionKind,
  SpotContributionModerationItem,
  VenueShiftAttendance as BlocksVenueShiftAttendance,
  VenueStaffRole as BlocksVenueStaffRole,
  VenueStaffStatus as BlocksVenueStaffStatus,
  VenueSyncChannel as BlocksVenueSyncChannel,
} from "@chewbuu/aws-blocks";
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

export interface IdentityVerificationSession {
  id: string;
  status:
    | "not_started"
    | "requires_input"
    | "processing"
    | "verified"
    | "failed";
  url: string;
  verifiedName?: string;
}

export interface UsernameChangeRequest {
  createdAt: string;
  id: string;
  requestedUsername: string;
  status: "approved" | "pending_approval" | "pending_verification" | "rejected";
}

export interface DatingProfilePayload {
  ageRangeMax?: number;
  identityStatus?: IdentityVerificationSession["status"];
  identityVerifiedName?: string;
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
  phone?: string;
  communityPhotoUrl?: string;
  menuPhotoUrl?: string;
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
  description?: string;
  handle?: string;
  id: string;
  menuUrl?: string;
  name: string;
  organizationId: string;
  publicAnalyticsEnabled?: boolean;
  publicAnalyticsMinSamples?: number;
  status: string;
  stripeIdentityStatus?: string;
  stripeIdentityVerifiedName?: string;
  style?: BrandStyle;
  websiteUrl?: string;
}

export interface VenueMenuModifierOption {
  available: boolean;
  id: string;
  name: string;
  priceDeltaCents: number;
  sortOrder: number;
}

export interface VenueMenuModifierGroup {
  id: string;
  maxSelections: number;
  menuItemId: string;
  minSelections: number;
  name: string;
  options: VenueMenuModifierOption[];
  selectionType: "single" | "multiple";
  sortOrder: number;
}

export interface VenueMenuItem {
  available: boolean;
  description?: string;
  id: string;
  locationId: string;
  modifierGroups: VenueMenuModifierGroup[];
  name: string;
  photoUrl?: string;
  priceCents: number;
  section?: string;
  sortOrder: number;
  status: string;
}

export interface VenueIdentityVerificationSession {
  id: string;
  status: string;
  url: string;
  verifiedName?: string;
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
  kind: "order_created" | "reservation_requested" | "venue_created";
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
  diningSessionId?: string;
  id: string;
  locationId: string;
  paymentStatus: string;
  status: string;
  subtotalCents: number;
  tipCents: number;
  totalCents: number;
}

export type VenueOperationalEventType =
  | "arrived"
  | "cooking_started"
  | "date_ended"
  | "food_served"
  | "left"
  | "order_completed"
  | "order_submitted"
  | "reservation_confirmed"
  | "reservation_requested"
  | "reservation_seated";

export interface VenueOperationalEvent {
  actorUserId?: string;
  diningSessionId?: string;
  eventType: VenueOperationalEventType;
  id: string;
  locationId: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  orderId?: string;
  reservationId?: string;
  source: string;
}

export interface VenueTable {
  capacity: number;
  id: string;
  label: string;
  locationId: string;
  section?: string;
  status: string;
}

export interface VenueShift {
  endAt: string;
  id: string;
  locationId: string;
  role: string;
  startAt: string;
  status: string;
  userId: string;
}

export interface VenueSpecial {
  category: string;
  description?: string;
  displayOrder: number;
  endsAt?: string;
  featured: boolean;
  id: string;
  locationId: string;
  priceText?: string;
  publishedAt?: string;
  startsAt: string;
  status: "archived" | "draft" | "published";
  title: string;
}

export interface VenueAnalytics {
  averageCostCents: number | null;
  averageDateMinutes: number | null;
  averageFoodWaitMinutes: number | null;
  averageKitchenMinutes: number | null;
  completedOrders: number;
  eventCount: number;
  orderCount: number;
  reservationCount: number;
  sampleSizes: {
    cost: number;
    dateDuration: number;
    foodWait: number;
    kitchen: number;
  };
  tipCents: number;
  totalCovers: number;
}

export interface VenuePublicMenuItem {
  description?: string;
  id: string;
  name: string;
  priceCents: number;
  section?: string;
}

export interface PublicVenueLocation {
  address?: string;
  handle: string;
  id: string;
  name: string;
}

export interface VenuePublicSummary {
  address?: string;
  averageCostCents: number | null;
  averageFoodWaitMinutes: number | null;
  handle: string;
  locationId: string;
  menuItems: VenuePublicMenuItem[];
  name: string;
  sampleSize: number;
  specials: VenueSpecial[];
  websiteUrl?: string;
}

export interface VenueDiningSession {
  endedAt?: string;
  id: string;
  locationId: string;
  reservationId?: string;
  startedAt: string;
  tableLabel?: string;
}

export interface VenueWorkspace {
  analytics: VenueAnalytics;
  events: VenueOperationalEvent[];
  location: VenueLocation;
  orders: VenueOrder[];
  reservations: VenueReservation[];
  sessions: VenueDiningSession[];
  shifts: VenueShift[];
  specials: VenueSpecial[];
  tables: VenueTable[];
}

export type VenueMediaKind =
  | "food_photo"
  | "menu_photo"
  | "venue_intro_video"
  | "venue_photo"
  | "venue_profile_photo";

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
    datingEnabled: boolean;
    identityVerified: boolean;
    onboarded: boolean;
    pendingReviews: number;
  };
  requests: (DateRequestPayload & {
    createdAt: string;
    id: string;
    isRequester: boolean;
    partySize: number;
    requester: {
      avatar: string | null;
      bio: string;
      name: string;
    };
    status: string;
    matches?: DateMatch[];
  })[];
}

export interface ReviewCriterion {
  key: string;
  label: string;
}

export interface DateReviewPayload {
  mediaIds?: string[];
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

export type CommunityKind = "circle" | "crew";

export interface BrandStyle {
  accentColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  tagline?: string;
}

export interface Circle {
  description?: string;
  handle?: string;
  id: string;
  kind: CommunityKind;
  members: { id: string; role: string; status: string; userId: string }[];
  name: string;
  ownerUserId: string;
  style?: BrandStyle;
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
  videoUrl?: string;
  media?: DateMedia[];
}

export const getServerUrl = (url: string) => {
  const normalized = url.endsWith("/") ? url.slice(0, -1) : url;

  if (!normalized.startsWith("/")) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }

  const processEnv = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  if (processEnv?.PORTLESS_URL) {
    return `${processEnv.PORTLESS_URL}${normalized}`;
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

export interface AccountEntitlements {
  isAdmin: boolean;
  membership: { plan: string; status: string };
  sync: { plan: string; status: string };
}

export interface StripeConnectStatus {
  accountId: string | null;
  configured: boolean;
  keyLast4: string | null;
  mode: "live" | "test" | null;
  webhookConfigured: boolean;
}

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
  acceptInvite: (inviteToken: string) =>
    blocksApi.acceptVenueInvite(inviteToken),
  approveClaim: (locationId: string) => blocksApi.approveVenueClaim(locationId),
  captureMenu: (locationId: string, url: string) =>
    blocksApi.captureVenueMenu({ locationId, url }) as Promise<{
      preview: VenueMenuPreview | null;
      reason?: "firecrawl_not_configured" | "invalid_menu" | "unavailable";
    }>,
  createIdentityVerificationSession: (locationId: string) =>
    blocksApi.createVenueIdentityVerificationSession({
      locationId,
    }) as Promise<VenueIdentityVerificationSession>,
  getIdentityVerificationStatus: (locationId: string) =>
    blocksApi.getVenueIdentityVerificationStatus(
      locationId
    ) as Promise<VenueIdentityVerificationSession>,
  listMenuItems: (locationId: string) =>
    blocksApi.listVenueMenuItems(locationId) as Promise<{
      items: VenueMenuItem[];
    }>,
  upsertMenuItem: (input: {
    available?: boolean;
    description?: string;
    id?: string;
    locationId: string;
    name: string;
    photoUrl?: string;
    priceCents: number;
    section?: string;
    sortOrder?: number;
    status?: "draft" | "published" | "archived";
  }) =>
    blocksApi.upsertVenueMenuItem(input) as Promise<{
      item: VenueMenuItem;
    }>,
  upsertModifierGroup: (input: {
    id?: string;
    locationId: string;
    maxSelections?: number;
    menuItemId: string;
    minSelections?: number;
    name: string;
    selectionType?: "single" | "multiple";
    sortOrder?: number;
  }) =>
    blocksApi.upsertVenueMenuModifierGroup(input) as Promise<{
      group: VenueMenuModifierGroup;
    }>,
  upsertModifierOption: (input: {
    available?: boolean;
    groupId: string;
    id?: string;
    locationId: string;
    name: string;
    priceDeltaCents?: number;
    sortOrder?: number;
  }) =>
    blocksApi.upsertVenueMenuModifierOption(input) as Promise<{
      option: VenueMenuModifierOption;
    }>,
  createLocation: (input: {
    address: string;
    description?: string;
    discoveryPlaceId?: string;
    handle?: string;
    menuUrl?: string;
    name: string;
    organizationName?: string;
    phone: string;
    referralCode?: string;
    style?: BrandStyle;
    venueRole?: "owner" | "referrer";
    websiteUrl: string;
  }) =>
    blocksApi.createVenueLocation(input) as unknown as Promise<{
      location: VenueLocation;
      referral?: VenueReferral;
    }>,
  searchVenues: (query: string) =>
    blocksApi.suggestPlaces({
      area: query,
      filters: [],
      query,
      searchKind: "venue",
      what: ["eat"],
    }) as unknown as Promise<{
      places: DatePlace[];
      reason?: "google_not_configured" | "unavailable";
    }>,
  follow: (locationId: string) => blocksApi.followVenue(locationId),
  getLocations: () =>
    blocksApi.getVenueLocations() as Promise<{ locations: VenueLocation[] }>,
  updateBrand: (input: {
    description?: string;
    handle?: string;
    locationId: string;
    name?: string;
    style?: BrandStyle;
  }) => blocksApi.updateVenueBrand(input),
  inviteMembers: (input: {
    locationId: string;
    members: { email: string; name?: string; role?: string }[];
  }) => blocksApi.inviteVenueMembers(input),
  getWorkspace: (locationId: string) =>
    blocksApi.getVenueWorkspace(locationId) as Promise<VenueWorkspace>,
  getServiceBoard: (input: { at?: string; locationId: string }) =>
    blocksApi.getVenueServiceBoard(input) as Promise<BlocksVenueServiceBoard>,
  getServiceConfig: (locationId: string) =>
    blocksApi.getVenueServiceConfig(locationId) as Promise<{
      config: BlocksVenueServiceConfig;
    }>,
  getStaffStatus: (locationId: string) =>
    blocksApi.getVenueStaffStatus(locationId) as Promise<{
      staff: BlocksVenueStaffStatus[];
    }>,
  updateStaff: (input: {
    locationId: string;
    role?: BlocksVenueStaffRole;
    status?: "active" | "removed" | "suspended";
    userId: string;
  }) =>
    blocksApi.updateVenueStaff(input) as Promise<{
      staff: BlocksVenueStaffStatus[];
    }>,
  updateServiceConfig: (input: {
    closeMinute?: number;
    geofenceRadiusMeters?: number;
    latitude?: number | null;
    locationId: string;
    longitude?: number | null;
    openMinute?: number;
    override?: BlocksVenueServiceMode | null;
  }) =>
    blocksApi.updateVenueServiceConfig(input) as Promise<{
      config: BlocksVenueServiceConfig;
    }>,
  clockIn: (input: {
    code: string;
    latitude?: number;
    locationId: string;
    longitude?: number;
    shiftId: string;
  }) =>
    blocksApi.clockInVenueShift(input) as Promise<{
      attendance: BlocksVenueShiftAttendance;
    }>,
  updateAttendance: (input: {
    action: "break_in" | "break_out" | "clock_out" | "lunch_in" | "lunch_out";
    attendanceId: string;
  }) =>
    blocksApi.updateVenueAttendance(input) as Promise<{
      attendance: BlocksVenueShiftAttendance;
    }>,
  reportLate: (input: {
    attendanceId: string;
    etaAt?: string;
    lateMinutes: number;
  }) =>
    blocksApi.reportVenueStaffLate(input) as Promise<{
      attendance: BlocksVenueShiftAttendance;
    }>,
  listServiceCustomers: (input: { locationId: string; search?: string }) =>
    blocksApi.listVenueServiceCustomers(input) as Promise<{
      customers: BlocksVenueServiceCustomer[];
    }>,
  upsertShift: (input: {
    endAt: string;
    id?: string;
    locationId: string;
    role: BlocksVenueStaffRole;
    section?: string;
    startAt: string;
    status?: string;
    userId: string;
  }) =>
    blocksApi.upsertVenueShift(input) as Promise<{
      shift: VenueShift;
    }>,
  createServiceCustomer: (input: {
    displayName: string;
    email?: string;
    locationId: string;
    notes?: string;
    phone?: string;
    userId?: string;
  }) =>
    blocksApi.createVenueServiceCustomer(input) as Promise<{
      customer: BlocksVenueServiceCustomer;
    }>,
  createServiceOrder: (input: {
    customerId?: string;
    customerName?: string;
    diningSessionId?: string;
    items: {
      menuItemId?: string;
      modifiers?: unknown[];
      name: string;
      notes?: string;
      quantity: number;
      unitPriceCents: number;
    }[];
    locationId: string;
    source?: "preorder" | "staff";
    tableId?: string;
    tipAllocations?: StripeTipAllocationInput[];
    tipCents?: number;
  }) =>
    blocksApi.createVenueServiceOrder(input) as Promise<{
      order: BlocksVenueServiceOrder;
    }>,
  updateServiceOrder: (input: {
    assignedStaffUserId?: string;
    orderId: string;
    paymentStatus?: "paid" | "unpaid";
    status?: string;
    tipCents?: number;
  }) =>
    blocksApi.updateVenueServiceOrder(input) as Promise<{
      order: BlocksVenueServiceOrder;
    }>,
  listSyncChannels: (locationId: string) =>
    blocksApi.listVenueSyncChannels(locationId) as Promise<{
      channels: BlocksVenueSyncChannel[];
    }>,
  listJobListings: (locationId: string) =>
    blocksApi.listVenueJobListings(locationId) as Promise<{
      listings: BlocksVenueJobListing[];
    }>,
  upsertJobListing: (input: {
    applicationUrl?: string;
    description: string;
    employmentType: string;
    expiresAt?: string;
    id?: string;
    locationId: string;
    payText?: string;
    scheduleText?: string;
    status?: "archived" | "draft" | "published";
    title: string;
  }) =>
    blocksApi.upsertVenueJobListing(input) as Promise<{
      listing: BlocksVenueJobListing;
    }>,
  getAnalytics: (
    locationId: string,
    input?: { endAt?: string; startAt?: string }
  ) =>
    blocksApi.getVenueAnalytics(locationId, input) as Promise<VenueAnalytics>,
  getTimeline: (locationId: string) =>
    blocksApi.getVenueTimeline(locationId) as Promise<{
      events: VenueOperationalEvent[];
    }>,
  getPublicSummary: (locationId: string) =>
    blocksApi.getVenuePublicSummary(locationId) as Promise<VenuePublicSummary>,
  listPublicLocations: () =>
    blocksApi.listPublicVenueLocations() as Promise<{
      locations: PublicVenueLocation[];
    }>,
  getPublicSpecials: (input?: { category?: string; locationId?: string }) =>
    blocksApi.listPublicVenueSpecials(input) as Promise<{
      specials: VenueSpecial[];
    }>,
  getSpecials: (locationId: string) =>
    blocksApi.listVenueSpecials(locationId) as Promise<{
      specials: VenueSpecial[];
    }>,
  createSpecial: (input: unknown) =>
    blocksApi.createVenueSpecial(input) as Promise<{ special: VenueSpecial }>,
  updateSpecial: (input: unknown) =>
    blocksApi.updateVenueSpecial(input) as Promise<{ special: VenueSpecial }>,
  setPublicAnalytics: (input: {
    enabled: boolean;
    locationId: string;
    minSamples?: number;
  }) => blocksApi.setVenuePublicAnalytics(input),
  recordEvent: (input: unknown) => blocksApi.recordVenueOperationalEvent(input),
  endDiningSession: (sessionId: string) =>
    blocksApi.endVenueDiningSession(sessionId),
  listTables: (locationId: string) =>
    blocksApi.listVenueTables(locationId) as Promise<{ tables: VenueTable[] }>,
  upsertTable: (input: unknown) =>
    blocksApi.upsertVenueTable(input) as Promise<{ table: VenueTable }>,
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
      menuItemId?: string;
      name: string;
      notes?: string;
      quantity: number;
      unitPriceCents: number;
    }[];
    locationId: string;
    reservationId?: string;
    tipAllocations?: StripeTipAllocationInput[];
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
  createIdentityVerificationSession: () =>
    blocksApi.createIdentityVerificationSession() as Promise<IdentityVerificationSession>,
  getIdentityVerificationStatus: () =>
    blocksApi.getIdentityVerificationStatus() as Promise<IdentityVerificationSession>,
  requestUsernameChange: (input: { username: string }) =>
    blocksApi.requestUsernameChange(input) as Promise<{
      request: UsernameChangeRequest;
    }>,
  getUsernameChangeStatus: () =>
    blocksApi.getUsernameChangeStatus() as Promise<{
      request: UsernameChangeRequest | null;
    }>,
  verifyUsernameChange: (token: string) =>
    blocksApi.verifyUsernameChange(token) as Promise<{
      request: UsernameChangeRequest;
    }>,
  getSummary: async () => (await blocksApi.getDatingSummary()) as DatingSummary,
  setDatingAvailability: (enabled: boolean) =>
    blocksApi.setDatingAvailability({ enabled }) as Promise<{
      readiness: DatingSummary["readiness"];
    }>,
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
    query?: string;
    searchKind?: "place" | "signal" | "venue";
    what: PlaceSuggestWhat[];
  }) =>
    blocksApi.suggestPlaces(body) as unknown as Promise<{
      places: DatePlace[];
      reason?: "google_not_configured" | "unavailable";
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

export const usernameApi = {
  listRequests: () =>
    blocksApi.listUsernameChangeRequests() as Promise<{
      requests: (UsernameChangeRequest & {
        email: string;
        name: string;
      })[];
    }>,
  approveRequest: (requestId: string) =>
    blocksApi.approveUsernameChange({ requestId }) as Promise<{
      request: UsernameChangeRequest;
    }>,
  verify: (token: string) =>
    blocksApi.verifyUsernameChange(token) as Promise<{
      request: UsernameChangeRequest;
    }>,
};

export const connectApi = {
  getStatus: () => blocksApi.getStripeConnectStatus(),
  getVenueStatus: (locationId: string) =>
    blocksApi.getVenueConnectStatus(
      locationId
    ) as Promise<StripeVenueConnectStatus>,
  startReferrerOnboarding: (locationId: string) =>
    blocksApi.createReferrerConnectOnboarding({
      locationId,
    }) as Promise<StripeConnectedAccountResponse>,
  startVenueOnboarding: (locationId: string) =>
    blocksApi.createVenueConnectOnboarding({
      locationId,
    }) as Promise<StripeConnectedAccountResponse>,
  startWorkerOnboarding: (locationId: string, userId: string) =>
    blocksApi.createWorkerConnectOnboarding({
      locationId,
      userId,
    }) as Promise<StripeConnectedAccountResponse>,
};

export const paymentsApi = {
  checkout: (input: {
    cancelUrl: string;
    experienceKind?: "date" | "dine_in" | "pickup";
    orderId: string;
    successUrl: string;
    tipAllocations?: StripeTipAllocationInput[];
  }) =>
    blocksApi.createVenueCheckoutSession(
      input
    ) as Promise<StripeCheckoutSessionResponse>,
  get: (orderId: string) =>
    blocksApi.getStripePayment(
      orderId
    ) as Promise<StripePaymentResponse | null>,
  refund: (input: { amountCents?: number; orderId: string; reason?: string }) =>
    blocksApi.createVenueRefund(input) as Promise<StripeRefundResponse>,
};

export const stripeAdminApi = {
  getHealth: () =>
    blocksApi.getStripeIntegrationHealth() as Promise<StripeIntegrationHealth>,
  syncWebhooks: () =>
    blocksApi.syncStripeWebhookEndpoints() as Promise<StripeWebhookSyncResponse>,
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
  acceptInvite: (inviteToken: string) =>
    blocksApi.acceptCircleInvite(inviteToken),
  create: (
    input:
      | {
          description?: string;
          handle?: string;
          kind?: CommunityKind;
          name: string;
          style?: BrandStyle;
        }
      | string
  ) => blocksApi.createCircle(input),
  get: () => blocksApi.getCircles() as Promise<{ circles: Circle[] }>,
  inviteMembers: (input: {
    circleId: string;
    members: { email: string; name?: string }[];
  }) => blocksApi.inviteCircleMembers(input),
  update: (input: {
    description?: string;
    handle?: string;
    id: string;
    name?: string;
    style?: BrandStyle;
  }) => blocksApi.updateCircle(input),
};

export const entitlementsApi = {
  get: () => blocksApi.getAccountEntitlements() as Promise<AccountEntitlements>,
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

export const spotCaptureApi = {
  getOffer: (input: { dateRequestId: string; googlePlaceId: string }) =>
    blocksApi.getSpotCaptureOffer(input) as Promise<{
      offer: SpotCaptureOffer;
    }>,
  submit: (input: {
    dateMediaId: string;
    dateRequestId: string;
    googlePlaceId: string;
    kind: SpotContributionKind;
  }) => blocksApi.submitSpotContribution(input),
};

export const spotCaptureAdminApi = {
  getConfig: () =>
    blocksApi.getSpotCaptureRewardConfig() as Promise<SpotCaptureRewardConfig>,
  listPending: () =>
    blocksApi.listSpotContributions() as Promise<{
      contributions: SpotContributionModerationItem[];
    }>,
  review: (input: {
    contributionId: string;
    status: "approved" | "rejected";
  }) => blocksApi.reviewSpotContribution(input),
  updateConfig: (rewardCents: number) =>
    blocksApi.updateSpotCaptureRewardConfig({
      rewardCents,
    }) as Promise<SpotCaptureRewardConfig>,
};

export const recapsApi = {
  get: () => blocksApi.getRecaps() as Promise<{ recaps: DateRecap[] }>,
  publish: (input: {
    caption?: string;
    dateRequestId: string;
    mediaIds?: string[];
    reviewId?: string;
    storyHours?: number;
    thumbnailUrl?: string;
    videoUrl?: string;
  }) => blocksApi.publishRecap(input),
};
