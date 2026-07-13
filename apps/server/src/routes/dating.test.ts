import { describe, expect, it } from "vitest";

import app from "../app";

const authHeaders = (overrides: Record<string, string> = {}) =>
  new Headers({
    "content-type": "application/json",
    "x-chewbuu-test-intro-video": "true",
    "x-chewbuu-test-onboarded": "true",
    "x-chewbuu-test-profile-photo": "true",
    "x-chewbuu-test-tier": "social",
    "x-chewbuu-test-user-id": crypto.randomUUID(),
    ...overrides,
  });

const profilePayload = {
  area: "Nashville, TN",
  birthday: "1993-04-14",
  datingModes: ["solo", "friends"],
  favoriteThings: ["chicken", "whiskey", "football"],
  height: "5'10",
  interestDetails: {
    football: ["Titans", "Super Bowl watch parties"],
    workingOut: ["strength training"],
  },
  interestedIn: ["women"],
  interests: ["food", "sports", "live music"],
  media: [
    {
      isPrimary: true,
      kind: "profile_photo",
      sortOrder: 0,
      url: "https://example.com/profile.jpg",
    },
    {
      kind: "intro_video",
      sortOrder: 0,
      url: "https://example.com/intro.mp4",
    },
  ],
  safetyOptIn: true,
  sex: "man",
  sexuality: "straight",
  trustedContacts: [
    {
      email: "safety@example.com",
      name: "Safety Friend",
    },
  ],
  weight: "",
};

const dateRequestPayload = {
  filters: ["chicken", "whiskey", "pool"],
  how: "dutch",
  partyMembers: [],
  paymentMode: "dutch",
  places: [
    {
      address: "123 Date St",
      name: "The Golden Booth",
      placeId: "place-1",
      rating: "4.7",
      types: ["eat", "drink"],
    },
    {
      address: "456 Social Ave",
      name: "Good Company Social",
      placeId: "place-2",
      rating: "4.5",
      types: ["drink", "play"],
    },
    {
      address: "789 Table Rd",
      name: "Cue & Co.",
      placeId: "place-3",
      rating: "4.6",
      types: ["play"],
    },
  ],
  scheduledAt: "2026-08-01T01:00:00.000Z",
  searchArea: "Nashville, TN",
  what: ["eat", "drink", "play"],
};

describe("dating routes", () => {
  it("requires auth for dating summary", async () => {
    const response = await app.request("/dating/summary");

    expect(response.status).toBe(401);
  });

  it("saves onboarding profile and reports dating readiness", async () => {
    const headers = authHeaders();
    const saveResponse = await app.request("/dating/profile", {
      body: JSON.stringify(profilePayload),
      headers,
      method: "PUT",
    });

    expect(saveResponse.status).toBe(200);
    expect(await saveResponse.json()).toMatchObject({
      readiness: {
        canDate: true,
        onboarded: true,
      },
    });

    const summaryResponse = await app.request("/dating/summary", { headers });

    expect(summaryResponse.status).toBe(200);
    expect(await summaryResponse.json()).toMatchObject({
      readiness: {
        canDate: true,
      },
    });
  });

  it("blocks social users from group date requests", async () => {
    const response = await app.request("/dating/requests", {
      body: JSON.stringify({
        ...dateRequestPayload,
        partyMembers: [
          {
            email: "friend@example.com",
            name: "Friend",
          },
        ],
      }),
      headers: authHeaders(),
      method: "POST",
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      message: "Social members can only create solo dates.",
    });
  });

  it("allows sugar users to request covered group dates and returns matches", async () => {
    const headers = authHeaders({
      "x-chewbuu-test-tier": "sugar",
      "x-chewbuu-test-user-id": crypto.randomUUID(),
    });
    const response = await app.request("/dating/requests", {
      body: JSON.stringify({
        ...dateRequestPayload,
        how: "me",
        partyMembers: [
          {
            email: "friend@example.com",
            name: "Friend",
          },
        ],
        paymentMode: "requester_covers",
      }),
      headers,
      method: "POST",
    });

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toMatchObject({
      matches: expect.arrayContaining([
        expect.objectContaining({
          introVideoUrl: expect.any(String),
          videoRepliesRequired: 3,
        }),
      ]),
      request: {
        paymentMode: "requester_covers",
      },
    });
  });

  it("suggests places for selected eat drink play filters", async () => {
    const response = await app.request("/dating/places/suggest", {
      body: JSON.stringify({
        area: "Nashville, TN",
        filters: ["chicken", "whiskey", "pool"],
        what: ["eat", "drink", "play"],
      }),
      headers: authHeaders(),
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      places: expect.arrayContaining([
        expect.objectContaining({
          name: "The Golden Booth",
        }),
      ]),
    });
  });
});
