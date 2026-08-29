import { api as blocksApi } from "@chewbuu/aws-blocks";
import type {
  ApiChatMessage,
  ApiChatRoom,
  CheckInInput,
  DatingProfileResponse,
  DatingSummaryResponse,
  DateMediaResponse,
  DateRequestInput,
  IdentityVerificationSession,
  PlaceSuggestion,
  PlaceSuggestionInput,
  PublishRecapInput,
  RecapResponse,
  ReviewInput,
} from "@chewbuu/aws-blocks";

export type NativeDateRequest = DatingSummaryResponse["requests"][number];
export type NativeProfile = DatingProfileResponse;
export type NativeSpot = PlaceSuggestion;
export type NativeRecap = RecapResponse;
export type NativeMedia = DateMediaResponse;
export type NativeRoom = ApiChatRoom;
export type NativeMessage = ApiChatMessage;

export const datingApi = {
  checkIn: (input: CheckInInput) => blocksApi.checkIn(input),
  completeDate: (dateRequestId: string) =>
    blocksApi.completeDate(dateRequestId),
  createDateRequest: (input: DateRequestInput) =>
    blocksApi.createDateRequest(input),
  createIdentityVerificationSession: () =>
    blocksApi.createIdentityVerificationSession(),
  createMediaUpload: (input: {
    contentType: string;
    fileName: string;
    slot: "intro_video" | "photo" | "profile_photo";
  }) => blocksApi.createMediaUpload(input),
  getDateMedia: (dateRequestId: string) =>
    blocksApi.getDateMedia(dateRequestId),
  getIdentityVerificationStatus: () =>
    blocksApi.getIdentityVerificationStatus(),
  getMessages: (roomId: string) => blocksApi.getMessages(roomId),
  getProfile: () => blocksApi.getProfile(),
  getRecaps: () => blocksApi.getRecaps(),
  getReviewPrompt: (dateRequestId: string) =>
    blocksApi.getReviewPrompt(dateRequestId),
  getRooms: () => blocksApi.getRooms(),
  getSummary: () => blocksApi.getDatingSummary(),
  setDatingAvailability: (enabled: boolean) =>
    blocksApi.setDatingAvailability({ enabled }),
  markChatRead: (roomId: string) => blocksApi.markChatRead(roomId),
  markNotificationsRead: (notificationIds: string[]) =>
    blocksApi.markNotificationsRead(notificationIds),
  publishRecap: (input: PublishRecapInput) => blocksApi.publishRecap(input),
  saveProfile: (input: unknown) => blocksApi.saveProfile(input),
  saveProfileDraft: (input: unknown) => blocksApi.saveProfileDraft(input),
  submitSpotContribution: (input: {
    dateMediaId: string;
    dateRequestId: string;
    googlePlaceId: string;
    kind: "menu_photo" | "spot_photo";
  }) => blocksApi.submitSpotContribution(input),
  searchPlaces: (input: PlaceSuggestionInput) => blocksApi.suggestPlaces(input),
  sendMessage: (
    roomId: string,
    input: {
      durationSec?: number;
      kind?: "photo" | "text" | "video" | "voice";
      mediaThumbUrl?: string;
      mediaUrl?: string;
      text?: string;
    }
  ) => blocksApi.sendMessage(roomId, input),
  startDate: (dateRequestId: string) => blocksApi.startDate(dateRequestId),
  submitReview: (dateRequestId: string, input: ReviewInput) =>
    blocksApi.submitReview(dateRequestId, input),
  uploadDateMedia: (input: {
    dateRequestId: string;
    kind: string;
    thumbnailUrl?: string;
    url: string;
  }) => blocksApi.uploadDateMedia(input),
};

export type IdentityStatus = IdentityVerificationSession["status"];
