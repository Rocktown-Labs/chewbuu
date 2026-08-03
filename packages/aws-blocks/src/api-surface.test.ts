import { describe, expect, it } from "vitest";

import type { AwsBlocksApi, DateRequestInput } from "./types";

describe("AWS Blocks API surface", () => {
  it("keeps the expanded API methods typed", () => {
    const methodNames: (keyof AwsBlocksApi)[] = [
      "checkIn",
      "completeDate",
      "createCircle",
      "createMediaUpload",
      "generateAiResponse",
      "getCircles",
      "getFriendships",
      "getMediaUrl",
      "getNotifications",
      "getPlacePhoto",
      "getPricingPlans",
      "getRecaps",
      "getReviewPrompt",
      "publishRecap",
      "requestFriendship",
      "respondFriendship",
      "submitReview",
      "runDateLifecycle",
      "startDate",
      "subscribeNotifications",
      "suggestPlaces",
      "uploadDateMedia",
    ];

    expect(methodNames).toHaveLength(22);
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
