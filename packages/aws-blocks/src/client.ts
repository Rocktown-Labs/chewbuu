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
  FriendshipResponse,
  InviteCommunityMembersInput,
  InviteVenueMembersInput,
  MembershipPlan,
  MediaUploadInput,
  NotificationChannelClient,
  NotificationsResponse,
  MediaUploadResponse,
  PlacePhotoResponse,
  PlaceSuggestion,
  PlaceSuggestionInput,
  PublishRecapInput,
  RecapResponse,
  ReviewInput,
  ReviewPromptResponse,
  ReviewResponse,
  SendChatMessageInput,
  SendChatMessageResponse,
  StripeConnectStatus,
  SyncPricingPlansResponse,
  UploadDateMediaInput,
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
  VenueReferral,
  VenueReservation,
  VenueDiningSession,
  VenueEvent,
  VenueOrder,
  VenueOperationalEvent,
  VenueOperationalEventType,
  VenuePublicSummary,
  VenueShift,
  VenueSpecial,
  VenueTable,
} from "./types";

export type { RealtimeChannelClient } from "@aws-blocks/bb-realtime/mock-middleware";
export type {
  DateLifecycleSchedulerBoundary,
  DateLifecycleStatus,
} from "./date-lifecycle";

const apiUrl =
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
