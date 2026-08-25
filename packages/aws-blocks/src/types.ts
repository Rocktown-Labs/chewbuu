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
  getPendingReviews: () => Promise<{ reviews: PendingReviewResponse[] }>;
  getNotifications: () => Promise<NotificationsResponse>;
  markNotificationsRead: (notificationIds: string[]) => Promise<{
    unreadCount: number;
  }>;
  subscribeNotifications: () => Promise<NotificationChannelClient>;
  saveProfile: (input: unknown) => Promise<{
    profile: DatingProfileResponse;
    readiness: DatingReadiness;
  }>;
  saveProfileDraft: (input: unknown) => Promise<{
    profile: DatingProfileResponse;
    readiness: DatingReadiness;
  }>;
  createDateRequest: (input: DateRequestInput) => Promise<{
    matches: DatingMatchResponse[];
    request: DatingRequestResponse;
  }>;
  getDateMeeting: (requestId: string) => Promise<ChimeMeetingResponse>;
  suggestPlaces: (input: PlaceSuggestionInput) => Promise<{
    places: PlaceSuggestion[];
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
  updatePricingPlans: (input: {
    plans: MembershipPlan[];
  }) => Promise<{ plans: MembershipPlan[] }>;
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
  createCircle: (name: string) => Promise<{ circle: CircleResponse }>;
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

export interface PlaceSuggestionInput {
  area: string;
  filters: string[];
  latitude?: string;
  longitude?: string;
  searchKind?: "place" | "signal";
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
  id: string;
  members: { id: string; role: string; status: string; userId: string }[];
  name: string;
  ownerUserId: string;
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
  reviewId?: string;
  storyHours?: number;
  thumbnailUrl?: string;
  videoUrl: string;
}

export interface RecapResponse extends PublishRecapInput {
  authorUserId: string;
  createdAt: string;
  id: string;
  publishedAt: string | null;
  storyExpiresAt: string | null;
}

export interface DatingReadiness {
  canDate: boolean;
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
