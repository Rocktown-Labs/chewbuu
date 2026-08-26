import { ApiNamespaceClient } from "@aws-blocks/blocks/client";
import "@aws-blocks/bb-realtime/mock-middleware";

import type { AwsBlocksApi } from "./types";

export type {
  ApiChatMessage,
  ApiChatParticipant,
  ApiChatRoom,
  ApiNotification,
  AiMessage,
  AwsBlocksApi,
  CheckInInput,
  CheckInResponse,
  CircleResponse,
  ChatMessageKind,
  ChatRoomsResponse,
  DateMediaResponse,
  FriendshipResponse,
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
  SyncPricingPlansResponse,
  UploadDateMediaInput,
  VenueMediaKind,
  VenueMediaUploadInput,
  VenueLocation,
  VenueLocationStatus,
  VenueMenuPreview,
  VenueMenuPreviewItem,
  VenueMenuStatus,
  VenueReferral,
  VenueReservation,
  VenueDiningSession,
  VenueEvent,
  VenueOrder,
} from "./types";

export type { RealtimeChannelClient } from "@aws-blocks/bb-realtime/mock-middleware";
export type {
  DateLifecycleSchedulerBoundary,
  DateLifecycleStatus,
} from "./date-lifecycle";

const apiUrl = (
  import.meta as ImportMeta & {
    env?: { VITE_BLOCKS_API_URL?: string };
  }
).env?.VITE_BLOCKS_API_URL;

export const api = ApiNamespaceClient<AwsBlocksApi>("api", {
  url: apiUrl,
});
