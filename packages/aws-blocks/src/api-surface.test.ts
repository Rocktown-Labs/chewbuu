import { describe, expect, it } from "vitest";

import type { AwsBlocksApi, DateRequestInput } from "./types";

describe("AWS Blocks API surface", () => {
  it("keeps the expanded API methods typed", () => {
    const methodNames: (keyof AwsBlocksApi)[] = [
      "approveVenueClaim",
      "captureVenueMenu",
      "checkIn",
      "completeDate",
      "createCircle",
      "createFriendInvite",
      "createMediaUpload",
      "generateAiResponse",
      "getCircles",
      "getDateMedia",
      "getDateMeeting",
      "getDatingSummary",
      "getFriendships",
      "getMediaUrl",
      "getMessages",
      "getNotifications",
      "getPendingReviews",
      "getPlacePhoto",
      "getPricingPlans",
      "getProfile",
      "getRecaps",
      "getReviewPrompt",
      "getRooms",
      "getVapidPublicKey",
      "getVenueWorkspace",
      "createVenueLocation",
      "createVenueMediaUpload",
      "createVenueReferral",
      "followVenue",
      "previewVenueMenu",
      "requestVenueClaim",
      "requestVenueReservation",
      "requestVenueShiftSwap",
      "saveVenueMedia",
      "markChatRead",
      "markNotificationsRead",
      "publishRecap",
      "publishTyping",
      "requestFriendship",
      "respondFriendship",
      "runDateLifecycle",
      "saveProfile",
      "saveProfileDraft",
      "savePushSubscription",
      "seedPricingPlans",
      "sendMessage",
      "sendPushNotification",
      "startDate",
      "startVenueDiningSession",
      "createVenueOrder",
      "submitReview",
      "subscribeNotifications",
      "subscribeVenueEvents",
      "suggestPlaces",
      "syncPricingPlans",
      "updatePricingPlans",
      "updateVenueOrder",
      "updateVenueReservation",
      "uploadDateMedia",
    ];

    expect(methodNames).toHaveLength(59);
  });

  it("allows an optional direct friend target without changing normal requests", () => {
    const normalRequest: DateRequestInput = {
      filters: [],
      partyMembers: [],
      paymentMode: "dutch",
      places: [
        { name: "Good Company", placeId: "place-1", types: ["restaurant"] },
      ],
      scheduledAt: "2026-08-03T18:00:00.000Z",
      searchArea: "Little Rock",
      what: ["eat"],
    };
    const directRequest: DateRequestInput = {
      ...normalRequest,
      friendUserId: "friend-user-id",
    };

    expect(normalRequest.friendUserId).toBeUndefined();
    expect(directRequest.friendUserId).toBe("friend-user-id");
  });
});
