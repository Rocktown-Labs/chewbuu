import { ApiNamespaceClient } from "@aws-blocks/blocks/client";
import "@aws-blocks/bb-realtime/mock-middleware";

import type { AwsBlocksApi } from "./types";

export type {
  ApiChatMessage,
  ApiChatParticipant,
  ApiChatRoom,
  AccountEntitlementsResponse,
  ApiNotification,
  AiMessage,
  AwsBlocksApi,
  CheckInInput,
  CheckInResponse,
  CircleResponse,
  ChatMessageKind,
  BrandStyle,
  ChatRoomsResponse,
  CommunityInviteResponse,
  CommunityKind,
  CreateCommunityInput,
  DateMediaResponse,
  DateRequestInput,
  DatingProfileResponse,
  DatingSummaryResponse,
  FriendshipResponse,
  InviteCommunityMembersInput,
  IdentityVerificationSession,
  InviteVenueMembersInput,
  MembershipPlan,
  MediaUploadInput,
  NotificationChannelClient,
  NotificationsResponse,
  MediaUploadResponse,
  PlacePhotoResponse,
  PlaceSuggestion,
  PlaceSuggestionInput,
  PublicVenueLocation,
  PublishRecapInput,
  RecapResponse,
  ReviewInput,
  ReviewPromptResponse,
  ReviewResponse,
  SendChatMessageInput,
  SendChatMessageResponse,
  SpotContributionInput,
  SpotContributionKind,
  SpotContributionResponse,
  SpotContributionStatus,
  StripeCheckoutSessionResponse,
  StripeConnectedAccountResponse,
  StripeConnectStatus,
  StripeIntegrationHealth,
  StripePaymentResponse,
  StripeRefundResponse,
  StripeTipAllocationInput,
  StripeVenueConnectStatus,
  StripeWebhookSyncResponse,
  SyncPricingPlansResponse,
  UploadDateMediaInput,
  UsernameChangeRequest,
  UsernameChangeRequestStatus,
  VenueAnalytics,
  VenueMediaKind,
  VenueMediaUploadInput,
  VenueIdentityVerificationSession,
  VenueLocation,
  VenueLocationStatus,
  VenueMenuItem,
  VenueMenuModifierGroup,
  VenueMenuModifierOption,
  VenueMenuPreview,
  VenueMenuPreviewItem,
  UpdateCommunityInput,
  UpdateVenueBrandInput,
  VenueMenuStatus,
  VenueJobListing,
  VenueReferral,
  VenueReservation,
  VenueDiningSession,
  VenueEvent,
  VenueOrder,
  VenueOperationalEvent,
  VenueOperationalEventType,
  VenuePublicMenuItem,
  VenuePublicSummary,
  VenueShift,
  VenueAttendanceSegment,
  VenueAttendanceStatus,
  VenueServiceBoard,
  VenueServiceConfig,
  VenueServiceCustomer,
  VenueServiceOrder,
  VenueServiceOrderItem,
  VenueServiceTable,
  VenueServiceMode,
  VenueShiftAttendance,
  VenueStaffRole,
  VenueStaffStatus,
  VenueSyncChannel,
  VenueSpecial,
  VenueTable,
  VenueWorkspace,
} from "./types";

export type { RealtimeChannelClient } from "@aws-blocks/bb-realtime/mock-middleware";
export type {
  DateLifecycleSchedulerBoundary,
  DateLifecycleStatus,
} from "./date-lifecycle";

const nativeApiUrl =
  typeof process !== "undefined"
    ? process.env?.EXPO_PUBLIC_BLOCKS_API_URL
    : undefined;
const apiUrl =
  nativeApiUrl ??
  (
    import.meta as ImportMeta & {
      env?: {
        EXPO_PUBLIC_BLOCKS_API_URL?: string;
        VITE_BLOCKS_API_URL?: string;
      };
    }
  ).env?.VITE_BLOCKS_API_URL ??
  (
    import.meta as ImportMeta & {
      env?: { EXPO_PUBLIC_BLOCKS_API_URL?: string };
    }
  ).env?.EXPO_PUBLIC_BLOCKS_API_URL;

export const api = ApiNamespaceClient<AwsBlocksApi>("api", {
  url: apiUrl,
});
