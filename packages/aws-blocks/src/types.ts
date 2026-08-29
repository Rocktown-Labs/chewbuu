import type { RealtimeChannelClient } from "@aws-blocks/bb-realtime/mock-middleware";

export type ChatMessageKind = "photo" | "system" | "text" | "video" | "voice";

export interface ApiChatMessage {
  createdAt: string;
  durationSec?: number;
  id: string;
  kind: ChatMessageKind;
  mediaThumbUrl?: string;
  mediaUrl?: string;
  roomId: string;
  senderId: string;
  systemIcon?: "user" | "check" | "calendar" | "branch" | "heart" | "block";
  text?: string;
}

export interface ApiChatParticipant {
  avatarUrl?: string;
  displayName: string;
  id: string;
  userId?: string;
}

export interface ApiChatRoom {
  activeDateId?: string;
  id: string;
  kind: string;
  matchId?: string;
  messages: ApiChatMessage[];
  participants: ApiChatParticipant[];
  phase: string;
  realtimeChannel: RealtimeChannelClient<ApiChatMessage>;
  typingChannel: RealtimeChannelClient<{
    isTyping: boolean;
    roomId: string;
    userId: string;
  }>;
  title: string;
  unreadCount: number;
  updatedAt: string;
}

export interface ChatRoomsResponse {
  currentUserId: string;
  rooms: ApiChatRoom[];
}

export interface SendChatMessageInput {
  durationSec?: number;
  kind?: Exclude<ChatMessageKind, "system">;
  mediaThumbUrl?: string;
  mediaUrl?: string;
  text?: string;
}

export interface SendChatMessageResponse {
  message: ApiChatMessage;
  published: boolean;
}

export interface DateRequestPlaceInput {
  address?: string;
  name: string;
  placeId: string;
  rating?: string;
  types: string[];
}

export interface DateRequestInput {
  filters: string[];
  friendUserId?: string;
  partyMembers: {
    displayName?: string;
    email?: string;
    name?: string;
    phone?: string;
  }[];
  paymentMode: "dutch" | "requester_covers";
  places: DateRequestPlaceInput[];
  scheduledAt: string;
  searchArea: string;
  what: string[];
}

export type VenueLocationStatus =
  | "claim_requested"
  | "claimed"
  | "discovered"
  | "live"
  | "unclaimed"
  | "verified";
export type VenueMenuStatus = "draft" | "published" | "unverified";

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

export type CommunityKind = "circle" | "crew";

export interface BrandStyle {
  accentColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  tagline?: string;
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
  stripeIdentityStatus?:
    | "not_started"
    | "requires_input"
    | "processing"
    | "verified"
    | "failed";
  stripeIdentityVerifiedName?: string;
  style?: BrandStyle;
  status: VenueLocationStatus;
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
  name: string;
  photoUrl?: string;
  priceCents: number;
  section?: string;
  sortOrder: number;
  status: "draft" | "published" | "archived";
  modifierGroups: VenueMenuModifierGroup[];
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

export interface VenueIdentityVerificationSession {
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

export type UsernameChangeRequestStatus =
  | "approved"
  | "pending_approval"
  | "pending_verification"
  | "rejected";

export interface UsernameChangeRequest {
  createdAt: string;
  id: string;
  requestedUsername: string;
  status: UsernameChangeRequestStatus;
}

export interface VenueReferral {
  id: string;
  locationId: string;
  rewardAmountCents: number;
  status: "paid" | "payable" | "referred" | "venue_paid";
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

export interface VenueDiningSession {
  endedAt?: string;
  id: string;
  locationId: string;
  reservationId?: string;
  startedAt: string;
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
  | "break_ended"
  | "break_started"
  | "clocked_in"
  | "clocked_out"
  | "cooking_started"
  | "date_ended"
  | "food_served"
  | "left"
  | "lunch_ended"
  | "lunch_started"
  | "order_submitted"
  | "reservation_confirmed"
  | "reservation_requested"
  | "reservation_seated"
  | "order_completed"
  | "staff_late";

export interface VenueOperationalEvent {
  actorUserId?: string;
  dateRequestId?: string;
  diningSessionId?: string;
  entityId?: string;
  entityType?: string;
  eventType: VenueOperationalEventType;
  id: string;
  locationId: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  orderId?: string;
  reservationId?: string;
  source: string;
  tableId?: string;
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
  section?: string;
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
  jobs: VenueJobListing[];
  locationId: string;
  menuItems: VenuePublicMenuItem[];
  name: string;
  sampleSize: number;
  specials: VenueSpecial[];
  websiteUrl?: string;
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

export type VenueStaffRole =
  | "admin"
  | "host"
  | "kitchen"
  | "lead"
  | "manager"
  | "owner"
  | "server"
  | "staff";
export type VenueAttendanceStatus =
  | "break"
  | "rest_break"
  | "clocked_in"
  | "clocked_out"
  | "lunch"
  | "scheduled";
export type VenueServiceMode = "closed" | "closing" | "open" | "pre_open";

export interface VenueAttendanceSegment {
  endedAt?: string;
  id: string;
  kind: "break" | "rest_break" | "lunch";
  startedAt: string;
}

export interface VenueShiftAttendance {
  clockInAt?: string;
  clockOutAt?: string;
  currentSegmentKind?: "break" | "rest_break" | "lunch";
  currentSegmentStartedAt?: string;
  etaAt?: string;
  id: string;
  lateMinutes: number;
  locationId: string;
  segments: VenueAttendanceSegment[];
  shiftId: string;
  status: VenueAttendanceStatus;
  userId: string;
}

export interface VenueStaffStatus {
  attendance?: VenueShiftAttendance;
  displayName: string;
  email?: string;
  phone?: string;
  role: VenueStaffRole;
  status: "active" | "invited" | "removed" | "suspended";
  userId?: string;
}

export interface VenueServiceCustomer {
  displayName: string;
  id: string;
  locationId: string;
  notes?: string;
  userId?: string;
}

export interface VenueServiceOrderItem {
  id: string;
  menuItemId?: string;
  modifiers: unknown[];
  name: string;
  notes?: string;
  quantity: number;
  unitPriceCents: number;
}

export interface VenueServiceOrder extends VenueOrder {
  customer?: VenueServiceCustomer;
  items: VenueServiceOrderItem[];
  source: "guest" | "preorder" | "staff";
  tableId?: string;
}

export interface VenueServiceTable extends VenueTable {
  customerNames: string[];
  currentOrderIds: string[];
  occupiedSeats: number;
}

export interface VenueSyncChannel {
  id: string;
  locationId: string;
  roomId: string;
  title: string;
}

export interface VenueJobListing {
  applicationUrl?: string;
  description: string;
  employmentType: string;
  expiresAt?: string;
  id: string;
  locationId: string;
  payText?: string;
  publishedAt?: string;
  scheduleText?: string;
  status: "archived" | "draft" | "published";
  title: string;
}

export interface VenueServiceConfig {
  closeMinute: number;
  geofenceRadiusMeters: number;
  latitude?: number;
  locationId: string;
  longitude?: number;
  openMinute: number;
  override?: VenueServiceMode;
}

export interface VenueServiceBoard {
  assignedSection?: string;
  attendance?: VenueShiftAttendance;
  dailyCode?: string;
  locationId: string;
  mode: VenueServiceMode;
  orders: VenueServiceOrder[];
  preOrders: VenueServiceOrder[];
  shifts: VenueShift[];
  staff: VenueStaffStatus[];
  tables: VenueServiceTable[];
  viewerRole: VenueStaffRole;
}

export interface AwsBlocksApi {
  [method: string]: (...args: any[]) => Promise<unknown>;
  getRooms: () => Promise<ChatRoomsResponse>;
  getMessages: (roomId: string) => Promise<{ messages: ApiChatMessage[] }>;
  sendMessage: (
    roomId: string,
    input: SendChatMessageInput
  ) => Promise<SendChatMessageResponse>;
  markChatRead: (roomId: string) => Promise<{ ok: true }>;
  publishTyping: (roomId: string, isTyping: boolean) => Promise<{ ok: true }>;
  getDatingSummary: () => Promise<DatingSummaryResponse>;
  getProfile: () => Promise<{ profile: DatingProfileResponse | null }>;
  createIdentityVerificationSession: () => Promise<IdentityVerificationSession>;
  getIdentityVerificationStatus: () => Promise<IdentityVerificationSession>;
  requestUsernameChange: (input: { username: string }) => Promise<{
    request: UsernameChangeRequest;
  }>;
  getUsernameChangeStatus: () => Promise<{
    request: UsernameChangeRequest | null;
  }>;
  verifyUsernameChange: (token: string) => Promise<{
    request: UsernameChangeRequest;
  }>;
  listUsernameChangeRequests: () => Promise<{
    requests: (UsernameChangeRequest & {
      email: string;
      name: string;
    })[];
  }>;
  approveUsernameChange: (input: { requestId: string }) => Promise<{
    request: UsernameChangeRequest;
  }>;
  getPendingReviews: () => Promise<{ reviews: PendingReviewResponse[] }>;
  getNotifications: () => Promise<NotificationsResponse>;
  markNotificationsRead: (notificationIds: string[]) => Promise<{
    unreadCount: number;
  }>;
  subscribeNotifications: () => Promise<NotificationChannelClient>;
  subscribeVenueEvents: (
    locationId: string
  ) => Promise<RealtimeChannelClient<VenueEvent>>;
  saveProfile: (input: unknown) => Promise<{
    profile: DatingProfileResponse;
    readiness: DatingReadiness;
  }>;
  saveProfileDraft: (input: unknown) => Promise<{
    profile: DatingProfileResponse;
    readiness: DatingReadiness;
  }>;
  submitSpotContribution: (input: SpotContributionInput) => Promise<{
    contribution: SpotContributionResponse;
  }>;
  createDateRequest: (input: DateRequestInput) => Promise<{
    matches: DatingMatchResponse[];
    request: DatingRequestResponse;
  }>;
  getDateMeeting: (requestId: string) => Promise<ChimeMeetingResponse>;
  suggestPlaces: (input: PlaceSuggestionInput) => Promise<{
    places: PlaceSuggestion[];
    reason?: "google_not_configured" | "unavailable";
  }>;
  getPlacePhoto: (photoName: string) => Promise<PlacePhotoResponse>;
  checkIn: (input: CheckInInput) => Promise<CheckInResponse>;
  startDate: (dateRequestId: string) => Promise<{
    actualStartAt: string;
    dateRequestId: string;
    status: "active";
  }>;
  getReviewPrompt: (requestId: string) => Promise<ReviewPromptResponse>;
  submitReview: (
    requestId: string,
    input: ReviewInput
  ) => Promise<{ review: ReviewResponse }>;
  completeDate: (dateRequestId: string) => Promise<{ status: string }>;
  runDateLifecycle: (input?: { at?: string }) => Promise<{
    processed: number;
    scheduler: "external-trigger-required";
  }>;
  getPricingPlans: () => Promise<{ plans: MembershipPlan[] }>;
  seedPricingPlans: () => Promise<{ plans: MembershipPlan[] }>;
  syncPricingPlans: () => Promise<SyncPricingPlansResponse>;
  getStripeIntegrationHealth: () => Promise<StripeIntegrationHealth>;
  syncStripeWebhookEndpoints: () => Promise<StripeWebhookSyncResponse>;
  createVenueCheckoutSession: (input: {
    cancelUrl: string;
    experienceKind?: "date" | "dine_in" | "pickup";
    orderId: string;
    successUrl: string;
    tipAllocations?: StripeTipAllocationInput[];
  }) => Promise<StripeCheckoutSessionResponse>;
  createReferrerConnectOnboarding: (input: {
    locationId: string;
  }) => Promise<StripeConnectedAccountResponse>;
  createVenueConnectOnboarding: (input: {
    locationId: string;
  }) => Promise<StripeConnectedAccountResponse>;
  createWorkerConnectOnboarding: (input: {
    locationId: string;
    userId: string;
  }) => Promise<StripeConnectedAccountResponse>;
  getVenueConnectStatus: (
    locationId: string
  ) => Promise<StripeVenueConnectStatus>;
  getStripePayment: (orderId: string) => Promise<StripePaymentResponse | null>;
  createVenueRefund: (input: {
    amountCents?: number;
    orderId: string;
    reason?: string;
  }) => Promise<StripeRefundResponse>;
  updatePricingPlans: (input: {
    plans: MembershipPlan[];
  }) => Promise<{ plans: MembershipPlan[] }>;
  getStripeConnectStatus: () => Promise<StripeConnectStatus>;
  getFriendships: () => Promise<{ friendships: FriendshipResponse[] }>;
  requestFriendship: (friendUserId: string) => Promise<{
    friendship: FriendshipResponse;
  }>;
  createFriendInvite: (input: {
    email?: string;
    name?: string;
    phone?: string;
  }) => Promise<{
    invite: {
      email: string | null;
      id: string;
      name: string | null;
      phone: string | null;
      status: string;
    };
  }>;
  respondFriendship: (
    friendshipId: string,
    status: "accepted" | "declined"
  ) => Promise<{ friendship: FriendshipResponse }>;
  getCircles: () => Promise<{ circles: CircleResponse[] }>;
  createCircle: (
    input: CreateCommunityInput | string
  ) => Promise<{ circle: CircleResponse }>;
  updateCircle: (input: UpdateCommunityInput) => Promise<{
    circle: CircleResponse;
  }>;
  inviteCircleMembers: (input: InviteCommunityMembersInput) => Promise<{
    invites: CommunityInviteResponse[];
  }>;
  acceptCircleInvite: (inviteToken: string) => Promise<{ status: string }>;
  getAccountEntitlements: () => Promise<AccountEntitlementsResponse>;
  getDateMedia: (requestId: string) => Promise<{ media: DateMediaResponse[] }>;
  uploadDateMedia: (
    input: UploadDateMediaInput
  ) => Promise<{ media: DateMediaResponse }>;
  createMediaUpload: (input: MediaUploadInput) => Promise<MediaUploadResponse>;
  getMediaUrl: (path: string) => Promise<{ url: string }>;
  generateAiResponse: (messages: AiMessage[]) => Promise<{ text: string }>;
  publishRecap: (input: PublishRecapInput) => Promise<{
    recap: RecapResponse;
  }>;
  getRecaps: () => Promise<{ recaps: RecapResponse[] }>;
  savePushSubscription: (input: {
    auth: string;
    endpoint: string;
    p256dh: string;
  }) => Promise<{ ok: true }>;
  getVapidPublicKey: () => Promise<{ vapidPublicKey: string | null }>;
  previewVenueMenu: (input: { url: string }) => Promise<{
    preview: VenueMenuPreview | null;
    reason?: "firecrawl_not_configured" | "invalid_menu" | "unavailable";
  }>;
  createVenueLocation: (input: {
    address: string;
    discoveryPlaceId?: string;
    description?: string;
    handle?: string;
    menuUrl?: string;
    name: string;
    organizationName?: string;
    phone: string;
    referralCode?: string;
    venueRole?: "owner" | "referrer";
    style?: BrandStyle;
    websiteUrl: string;
  }) => Promise<{ location: VenueLocation; referral?: VenueReferral }>;
  updateVenueBrand: (input: UpdateVenueBrandInput) => Promise<{
    location: VenueLocation;
  }>;
  inviteVenueMembers: (input: InviteVenueMembersInput) => Promise<{
    invites: CommunityInviteResponse[];
  }>;
  acceptVenueInvite: (inviteToken: string) => Promise<{ status: string }>;
  followVenue: (locationId: string) => Promise<{ following: boolean }>;
  captureVenueMenu: (input: { locationId: string; url: string }) => Promise<{
    preview: VenueMenuPreview | null;
    reason?: "firecrawl_not_configured" | "invalid_menu" | "unavailable";
  }>;
  createVenueIdentityVerificationSession: (input: {
    locationId: string;
  }) => Promise<VenueIdentityVerificationSession>;
  getVenueIdentityVerificationStatus: (
    locationId: string
  ) => Promise<VenueIdentityVerificationSession>;
  listVenueMenuItems: (locationId: string) => Promise<{
    items: VenueMenuItem[];
  }>;
  upsertVenueMenuItem: (input: {
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
  }) => Promise<{ item: VenueMenuItem }>;
  upsertVenueMenuModifierGroup: (input: {
    id?: string;
    locationId: string;
    maxSelections?: number;
    menuItemId: string;
    minSelections?: number;
    name: string;
    selectionType?: "single" | "multiple";
    sortOrder?: number;
  }) => Promise<{ group: VenueMenuModifierGroup }>;
  upsertVenueMenuModifierOption: (input: {
    available?: boolean;
    groupId: string;
    id?: string;
    locationId: string;
    name: string;
    priceDeltaCents?: number;
    sortOrder?: number;
  }) => Promise<{ option: VenueMenuModifierOption }>;
  createVenueReferral: (locationId: string) => Promise<{
    referral: VenueReferral;
  }>;
  createVenueMediaUpload: (
    input: VenueMediaUploadInput
  ) => Promise<MediaUploadResponse>;
  saveVenueMedia: (input: {
    kind: VenueMediaKind;
    locationId: string;
    url: string;
  }) => Promise<{ mediaId: string }>;
  requestVenueClaim: (
    locationId: string,
    input?: { claimNote?: string }
  ) => Promise<{ status: "requested" | "already_requested" }>;
  approveVenueClaim: (locationId: string) => Promise<{
    ownerUserId: string;
    status: "claimed";
  }>;
  getVenueLocations: () => Promise<{ locations: VenueLocation[] }>;
  getVenueWorkspace: (locationId: string) => Promise<VenueWorkspace>;
  getVenueServiceBoard: (input: {
    at?: string;
    locationId: string;
  }) => Promise<VenueServiceBoard>;
  getVenueServiceConfig: (locationId: string) => Promise<{
    config: VenueServiceConfig;
  }>;
  getVenueStaffStatus: (locationId: string) => Promise<{
    staff: VenueStaffStatus[];
  }>;
  updateVenueStaff: (input: {
    locationId: string;
    role?: VenueStaffRole;
    status?: "active" | "removed" | "suspended";
    userId: string;
  }) => Promise<{ staff: VenueStaffStatus[] }>;
  updateVenueServiceConfig: (input: {
    closeMinute?: number;
    geofenceRadiusMeters?: number;
    latitude?: number | null;
    locationId: string;
    longitude?: number | null;
    openMinute?: number;
    override?: VenueServiceMode | null;
  }) => Promise<{ config: VenueServiceConfig }>;
  clockInVenueShift: (input: {
    code: string;
    latitude?: number;
    locationId: string;
    longitude?: number;
    shiftId: string;
    targetUserId?: string;
  }) => Promise<{ attendance: VenueShiftAttendance }>;
  updateVenueAttendance: (input: {
    action: "break_in" | "break_out" | "clock_out" | "lunch_in" | "lunch_out";
    attendanceId: string;
  }) => Promise<{ attendance: VenueShiftAttendance }>;
  reportVenueStaffLate: (input: {
    attendanceId: string;
    etaAt?: string;
    lateMinutes: number;
  }) => Promise<{ attendance: VenueShiftAttendance }>;
  createVenueServiceCustomer: (input: {
    displayName: string;
    email?: string;
    locationId: string;
    notes?: string;
    phone?: string;
    userId?: string;
  }) => Promise<{ customer: VenueServiceCustomer }>;
  listVenueServiceCustomers: (input: {
    locationId: string;
    search?: string;
  }) => Promise<{ customers: VenueServiceCustomer[] }>;
  upsertVenueShift: (input: {
    endAt: string;
    id?: string;
    locationId: string;
    role: VenueStaffRole;
    section?: string;
    startAt: string;
    status?: string;
    userId: string;
  }) => Promise<{ shift: VenueShift }>;
  createVenueServiceOrder: (input: {
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
  }) => Promise<{ order: VenueServiceOrder }>;
  updateVenueServiceOrder: (input: {
    assignedStaffUserId?: string;
    orderId: string;
    paymentStatus?: "paid" | "unpaid";
    status?: string;
    tipCents?: number;
  }) => Promise<{ order: VenueServiceOrder }>;
  listVenueSyncChannels: (locationId: string) => Promise<{
    channels: VenueSyncChannel[];
  }>;
  listVenueJobListings: (locationId: string) => Promise<{
    listings: VenueJobListing[];
  }>;
  listPublicVenueJobListings: (locationId: string) => Promise<{
    listings: VenueJobListing[];
  }>;
  upsertVenueJobListing: (input: {
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
  }) => Promise<{ listing: VenueJobListing }>;
  getVenueAnalytics: (
    locationId: string,
    input?: { endAt?: string; startAt?: string }
  ) => Promise<VenueAnalytics>;
  getVenueTimeline: (locationId: string) => Promise<{
    events: VenueOperationalEvent[];
  }>;
  getVenuePublicSummary: (locationId: string) => Promise<VenuePublicSummary>;
  listPublicVenueLocations: () => Promise<{
    locations: PublicVenueLocation[];
  }>;
  listPublicVenueSpecials: (input?: {
    category?: string;
    locationId?: string;
  }) => Promise<{ specials: VenueSpecial[] }>;
  listVenueSpecials: (locationId: string) => Promise<{
    specials: VenueSpecial[];
  }>;
  createVenueSpecial: (input: unknown) => Promise<{
    special: VenueSpecial;
  }>;
  updateVenueSpecial: (input: unknown) => Promise<{
    special: VenueSpecial;
  }>;
  setVenuePublicAnalytics: (input: {
    enabled: boolean;
    locationId: string;
    minSamples?: number;
  }) => Promise<{ enabled: boolean; locationId: string; minSamples: number }>;
  recordVenueOperationalEvent: (input: unknown) => Promise<{
    event: VenueOperationalEvent;
  }>;
  endVenueDiningSession: (sessionId: string) => Promise<{
    endedAt: string;
    sessionId: string;
  }>;
  listVenueTables: (locationId: string) => Promise<{ tables: VenueTable[] }>;
  upsertVenueTable: (input: unknown) => Promise<{ table: VenueTable }>;
  updateVenueOrder: (input: {
    assignedStaffUserId?: string;
    orderId: string;
    status: string;
  }) => Promise<{ order: VenueOrder }>;
  updateVenueReservation: (input: {
    assignedStaffUserId?: string;
    reservationId: string;
    status: string;
    tableLabel?: string;
  }) => Promise<{ guestUserId: string; reservation: VenueReservation }>;
  requestVenueReservation: (input: {
    locationId: string;
    notes?: string;
    partySize: number;
    requestedAt: string;
  }) => Promise<{ reservation: VenueReservation }>;
  startVenueDiningSession: (input: {
    locationId: string;
    reservationId?: string;
    tableLabel?: string;
  }) => Promise<{ session: VenueDiningSession }>;
  createVenueOrder: (input: {
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
  }) => Promise<{ order: VenueOrder }>;
  requestVenueShiftSwap: (input: {
    replacementUserId?: string;
    shiftId: string;
  }) => Promise<{ swapId: string; status: "requested" }>;
  sendPushNotification: (input: {
    badge?: string;
    body: string;
    data?: Record<string, unknown>;
    icon?: string;
    tag?: string;
    title: string;
    url?: string;
    userId?: string;
  }) => Promise<{
    deliveredCount: number;
    failedCount: number;
    skipped?: boolean;
  }>;
}

export type NotificationChannelClient = RealtimeChannelClient<ApiNotification>;

export interface ApiNotification {
  body: string;
  createdAt: string;
  entityId?: string;
  entityType?: string;
  id: string;
  kind: string;
  readAt: string | null;
  title: string;
}

export interface NotificationsResponse {
  notifications: ApiNotification[];
  unreadCount: number;
}

export interface AiMessage {
  id: string;
  parts: { text: string; type: "text" }[];
  role: "assistant" | "user";
}

export interface MediaUploadInput {
  contentType: string;
  fileName: string;
  slot: "intro_video" | "photo" | "profile_photo";
}

export interface MediaUploadResponse {
  mediaUrl: string;
  pathname: string;
  uploadUrl: string;
}

export type VenueMediaKind =
  | "food_photo"
  | "menu_photo"
  | "venue_intro_video"
  | "venue_photo"
  | "venue_profile_photo";

export interface VenueMediaUploadInput {
  contentType: string;
  fileName: string;
  kind: VenueMediaKind;
  locationId: string;
}

export interface PlaceSuggestionInput {
  area: string;
  filters: string[];
  latitude?: string;
  longitude?: string;
  query?: string;
  searchKind?: "place" | "signal" | "venue";
  what: string[];
}

export interface PlaceSuggestion {
  address?: string;
  attributions?: string[];
  googleMapsUri?: string;
  latitude?: number;
  longitude?: number;
  name: string;
  openNow?: boolean;
  photoUrl?: string;
  phone?: string;
  placeId: string;
  priceLevel?: string;
  rating?: string;
  types: string[];
  userRatingCount?: number;
  websiteUri?: string;
}

export interface PlacePhotoResponse {
  contentType: string;
  data: string;
}

export interface CheckInInput {
  code?: string;
  dateRequestId: string;
  partnerId?: string;
}

export interface CheckInResponse {
  dateRequestId: string;
  message: string;
  success: boolean;
}

export interface ReviewInput {
  personComment?: string;
  personCriteria: Record<string, number>;
  personRating: number;
  placeComment?: string;
  placeCriteria: Record<string, number>;
  placeRating: number;
  mediaIds?: string[];
}

export interface ReviewResponse extends ReviewInput {
  completedAt: string | null;
  dateRequestId: string;
  id: string;
  required: boolean;
  userId: string;
}

export interface ReviewPromptResponse {
  existingReview: ReviewResponse | null;
  people: { id: string; name: string; photoUrl: string | null }[];
  places: DatingRequestResponse["places"];
  request: { id: string; searchArea: string; status: string };
}

export interface MembershipPlan {
  active: boolean;
  annualPriceCents: number;
  annualStripePriceId: string;
  cta: string;
  description: string;
  features: string[];
  id: string;
  monthlyPriceCents: number;
  name: string;
  sortOrder: number;
  stats: string[];
  stripePriceId: string;
  tier: "social" | "mingle" | "sugar";
}

export interface FriendshipResponse {
  acceptedAt: string | null;
  createdAt: string;
  friendUserId: string;
  id: string;
  status: string;
  userId: string;
}

export interface CircleResponse {
  description?: string;
  handle?: string;
  id: string;
  kind: CommunityKind;
  members: { id: string; role: string; status: string; userId: string }[];
  name: string;
  ownerUserId: string;
  style?: BrandStyle;
}

export interface CreateCommunityInput {
  description?: string;
  handle?: string;
  kind?: CommunityKind;
  name: string;
  style?: BrandStyle;
}

export interface UpdateCommunityInput {
  description?: string;
  handle?: string;
  id: string;
  name?: string;
  style?: BrandStyle;
}

export interface InviteCommunityMembersInput {
  circleId: string;
  members: { email: string; name?: string }[];
}

export interface CommunityInviteResponse {
  email: string;
  id: string;
  inviteToken?: string;
  name: string | null;
  phone?: string;
  status: string;
}

export interface UpdateVenueBrandInput {
  description?: string;
  handle?: string;
  locationId: string;
  name?: string;
  style?: BrandStyle;
}

export interface InviteVenueMembersInput {
  locationId: string;
  members: {
    email?: string;
    name?: string;
    phone?: string;
    role?: string;
  }[];
}

export interface AccountEntitlementsResponse {
  isAdmin: boolean;
  membership: { plan: string; status: string };
  sync: { plan: string; status: string };
}

export type SpotContributionKind = "menu_photo" | "spot_photo";
export type SpotContributionStatus = "approved" | "pending" | "rejected";

export interface SpotContributionInput {
  dateMediaId: string;
  dateRequestId: string;
  googlePlaceId: string;
  kind: SpotContributionKind;
}

export interface SpotContributionResponse extends SpotContributionInput {
  createdAt: string;
  id: string;
  rewardPoints: number;
  rewardStatus: "pending" | "paid";
  status: SpotContributionStatus;
}

export interface DateMediaResponse {
  createdAt: string;
  dateRequestId: string;
  id: string;
  kind: string;
  thumbnailUrl: string | null;
  uploadedByUserId: string;
  url: string;
}

export interface UploadDateMediaInput {
  dateRequestId: string;
  kind: string;
  thumbnailUrl?: string;
  url: string;
}

export interface PublishRecapInput {
  caption?: string;
  dateRequestId: string;
  mediaIds?: string[];
  reviewId?: string;
  storyHours?: number;
  thumbnailUrl?: string;
  videoUrl?: string;
}

export interface RecapResponse extends PublishRecapInput {
  authorUserId: string;
  createdAt: string;
  id: string;
  media?: DateMediaResponse[];
  publishedAt: string | null;
  storyExpiresAt: string | null;
}

export interface DatingReadiness {
  canDate: boolean;
  identityVerified: boolean;
  onboarded: boolean;
  pendingReviews: number;
}

export interface DatingProfileResponse {
  [key: string]: unknown;
  media: {
    id: string;
    isPrimary: boolean;
    kind: string;
    sortOrder: number;
    url: string;
  }[];
  userId: string;
}

export interface PendingReviewResponse {
  completedAt: string | null;
  dateRequestId: string;
  id: string;
  required: boolean;
  searchArea: string;
  scheduledAt: string;
}

export interface DatingSummaryResponse {
  membershipTier: string;
  pendingReviews: number;
  readiness: {
    canDate: boolean;
    identityVerified: boolean;
    onboarded: boolean;
    pendingReviews: number;
  };
  requests: {
    filters: string[];
    id: string;
    matches: {
      compatibility: number;
      distanceMiles?: number;
      displayName: string;
      id: string;
      introVideoUrl: string;
      profilePhotoUrl: string | null;
      profileSummary: string;
      status: string;
      userId: string;
      videoRepliesRequired: number;
    }[];
    partyMembers: {
      displayName: string;
      email?: string;
      name?: string;
      phone?: string;
    }[];
    partySize: number;
    paymentMode: string;
    places: {
      address?: string;
      name: string;
      placeId: string;
      rating?: string;
      types: string[];
    }[];
    scheduledAt: string;
    searchArea: string;
    status: string;
    what: string[];
  }[];
}

export interface DatingMatchResponse {
  compatibility: number;
  distanceMiles?: number;
  displayName: string;
  id: string;
  introVideoUrl: string;
  profilePhotoUrl: string | null;
  profileSummary: string;
  status: string;
  userId: string;
  videoRepliesRequired: number;
}

export interface DatingRequestResponse {
  filters: string[];
  id: string;
  partyMembers: { displayName: string }[];
  partySize: number;
  paymentMode: string;
  places: {
    address?: string;
    name: string;
    placeId: string;
    rating?: string;
    types: string[];
  }[];
  scheduledAt: string;
  searchArea: string;
  status: string;
  what: string[];
}

export interface ChimeMeetingResponse {
  attendee: {
    attendeeId: string;
    externalUserId: string;
    joinToken: string;
  };
  meeting: {
    externalMeetingId: string;
    mediaPlacement: Record<string, string>;
    meetingId: string;
  };
}

export interface SyncPricingPlansResponse {
  message: string;
  plans: MembershipPlan[];
  stripeConfigured: boolean;
}

export interface StripeConnectStatus {
  accountId: string | null;
  configured: boolean;
  keyLast4: string | null;
  mode: "live" | "test" | null;
  webhookConfigured: boolean;
}

export interface StripeTipAllocationInput {
  amountCents: number;
  beneficiaryKind: "cook" | "house" | "server";
  beneficiaryUserId?: string;
}

export interface StripeCheckoutSessionResponse {
  checkoutSessionId: string;
  checkoutUrl: string;
  orderId: string;
  paymentId: string;
  recipientCount: number;
  transferGroup: string;
}

export interface StripeConnectedAccountResponse {
  accountId: string;
  dashboard: string | null;
  expiresAt?: string;
  livemode: boolean;
  requirements: Record<string, unknown>;
  transferCapabilityStatus: string;
  url?: string;
}

export interface StripeVenueConnectStatus {
  accountId: string | null;
  onboardingStatus: string;
  requirements: Record<string, unknown>;
  transferCapabilityStatus: string;
}

export interface StripePaymentResponse {
  payment: {
    amount_cents: number;
    charge_id: string | null;
    checkout_session_id: string | null;
    currency: string;
    id: string;
    payment_intent_id: string | null;
    platform_fee_cents: number;
    status: string;
    transfer_group: string;
  };
  transfers: {
    amount_cents: number;
    kind: string;
    status: string;
    stripe_transfer_id: string | null;
  }[];
}

export interface StripeRefundResponse {
  amountCents: number;
  refundId: string;
  status: string | null;
}

export interface StripeIntegrationHealth {
  catalog: { failed: number; pending: number; synced: number };
  connectedAccounts: { total: number; transferReady: number };
  configured: boolean;
  failedWebhookEvents: number;
  mode: "live" | "test" | null;
  webhooks: {
    purpose: string;
    secretConfigured: boolean;
    status: string;
    url: string;
  }[];
}

export interface StripeWebhookSyncResponse {
  endpoints: {
    connect: boolean;
    purpose: string;
    status: string;
    url: string;
  }[];
  mode: "live" | "test";
}
