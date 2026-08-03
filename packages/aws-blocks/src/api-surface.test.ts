import { describe, expect, it } from "vitest";

import type { AwsBlocksApi } from "./types";

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
      "subscribeNotifications",
      "suggestPlaces",
      "uploadDateMedia",
    ];

    expect(methodNames).toHaveLength(21);
  });
});
