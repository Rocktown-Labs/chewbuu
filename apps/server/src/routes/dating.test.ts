import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../app";
import {
  buildGooglePlacesTextQuery,
  invitePurposeForMembership,
  isJoinableInvite,
  mergeInviteRowsForSave,
  normalizeGooglePlaces,
} from "./dating";

const authHeaders = (overrides: Record<string, string> = {}) =>
  new Headers({
    "content-type": "application/json",
    "x-chewbuu-test-intro-video": "true",
    "x-chewbuu-test-onboarded": "true",
    "x-chewbuu-test-profile-photo": "true",
    "x-chewbuu-test-tier": "social",
    "x-chewbuu-test-user-id": crypto.randomUUID(),
    "x-chewbuu-test-username": "testuser",
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

const birthdayForAge = (age: number, dayOffset = 0) => {
  const today = new Date();
  const birthday = new Date(
    today.getFullYear() - age,
    today.getMonth(),
    today.getDate() + dayOffset
  );
  return birthday.toISOString().slice(0, 10);
};

const saveTestProfile = async (headers: Headers) => {
  const response = await app.request("/dating/profile", {
    body: JSON.stringify(profilePayload),
    headers,
    method: "PUT",
  });

  expect(response.status).toBe(200);
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

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GOOGLE_PLACES_API_KEY;
});

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

  it("does not complete onboarding without a username", async () => {
    const headers = authHeaders({ "x-chewbuu-test-username": "" });
    const saveResponse = await app.request("/dating/profile", {
      body: JSON.stringify(profilePayload),
      headers,
      method: "PUT",
    });

    expect(saveResponse.status).toBe(200);
    expect(await saveResponse.json()).toMatchObject({
      readiness: {
        canDate: false,
        onboarded: false,
      },
    });
  });

  it("does not complete onboarding without a safety contact", async () => {
    const headers = authHeaders();
    const saveResponse = await app.request("/dating/profile", {
      body: JSON.stringify({
        ...profilePayload,
        safetyOptIn: false,
        trustedContacts: [],
      }),
      headers,
      method: "PUT",
    });

    expect(saveResponse.status).toBe(200);
    expect(await saveResponse.json()).toMatchObject({
      readiness: {
        canDate: false,
        onboarded: false,
      },
    });
  });

  it("rejects profiles for users younger than 18", async () => {
    const response = await app.request("/dating/profile", {
      body: JSON.stringify({
        ...profilePayload,
        birthday: birthdayForAge(17, 1),
      }),
      headers: authHeaders(),
      method: "PUT",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      message: "Chewbuu is for users 18 and older.",
    });
  });

  it("caps under-21 profile match ranges at 22", async () => {
    const response = await app.request("/dating/profile", {
      body: JSON.stringify({
        ...profilePayload,
        ageRangeMax: 23,
        ageRangeMin: 18,
        birthday: birthdayForAge(18),
      }),
      headers: authHeaders(),
      method: "PUT",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      message: "Users under 21 can only match with ages 18 to 22.",
    });
  });

  it("persists spouse invites from onboarding", async () => {
    const headers = authHeaders();
    const saveResponse = await app.request("/dating/profile", {
      body: JSON.stringify({
        ...profilePayload,
        friendInvites: [
          {
            email: "spouse@example.com",
            name: "Pat Partner",
            phone: "(555) 555-0100",
            relationship: "spouse",
          },
        ],
        maritalStatus: "Married",
      }),
      headers,
      method: "PUT",
    });

    expect(saveResponse.status).toBe(200);
    expect(await saveResponse.json()).toMatchObject({
      profile: {
        friendInvites: [
          {
            email: "spouse@example.com",
            name: "Pat Partner",
            relationship: "spouse",
          },
        ],
        maritalStatus: "Married",
      },
    });
  });

  it("lets Social users invite friends as referral leads during onboarding", async () => {
    const headers = authHeaders({
      "x-chewbuu-test-tier": "social",
      "x-chewbuu-test-user-id": crypto.randomUUID(),
    });
    const saveResponse = await app.request("/dating/profile", {
      body: JSON.stringify({
        ...profilePayload,
        friendInvites: [
          {
            email: "friend@example.com",
            phone: "(555) 555-0199",
            relationship: "friend",
          },
        ],
      }),
      headers,
      method: "PUT",
    });

    expect(saveResponse.status).toBe(200);
    expect(await saveResponse.json()).toMatchObject({
      profile: {
        friendInvites: [
          {
            email: "friend@example.com",
            invitePurpose: "friend_referral",
            relationship: "friend",
          },
        ],
      },
    });
  });

  it("marks premium onboarding friend invites as circle invites", async () => {
    const headers = authHeaders({
      "x-chewbuu-test-tier": "mingle",
      "x-chewbuu-test-user-id": crypto.randomUUID(),
    });
    const saveResponse = await app.request("/dating/profile", {
      body: JSON.stringify({
        ...profilePayload,
        friendInvites: [
          {
            email: "friend@example.com",
            relationship: "friend",
          },
        ],
      }),
      headers,
      method: "PUT",
    });

    expect(saveResponse.status).toBe(200);
    expect(await saveResponse.json()).toMatchObject({
      profile: {
        friendInvites: [
          {
            invitePurpose: "circle_invite",
            relationship: "friend",
          },
        ],
      },
    });
  });

  it("keeps existing sent invites from becoming pending on later profile saves", () => {
    const [sameInvite, changedInvite] = mergeInviteRowsForSave(
      [
        {
          circleId: null,
          email: "spouse@example.com",
          id: "invite-1",
          inviteToken: "token-1",
          invitePurpose: "spouse_invite",
          name: "Original Name",
          phone: null,
          relationship: "spouse",
          status: "sent",
          userId: "user-1",
        },
      ],
      [
        {
          email: "spouse@example.com",
          name: "Updated Name",
          relationship: "spouse",
        },
        {
          email: "new-spouse@example.com",
          name: "New Spouse",
          relationship: "spouse",
        },
      ],
      "user-1"
    );

    expect(sameInvite).toMatchObject({
      id: "invite-1",
      inviteToken: "token-1",
      name: "Updated Name",
      status: "sent",
    });
    expect(changedInvite).toMatchObject({
      email: "new-spouse@example.com",
      invitePurpose: "spouse_invite",
      name: "New Spouse",
      relationship: "spouse",
      status: "pending",
    });
  });

  it("blocks social users from group date requests", async () => {
    const headers = authHeaders();
    await saveTestProfile(headers);

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
      headers,
      method: "POST",
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      message: "Social members can only create solo dates.",
    });
  });

  it("blocks dating until required intro video and profile photo are present", async () => {
    const response = await app.request("/dating/requests", {
      body: JSON.stringify(dateRequestPayload),
      headers: authHeaders({
        "x-chewbuu-test-intro-video": "false",
        "x-chewbuu-test-profile-photo": "false",
      }),
      method: "POST",
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      message:
        "Complete onboarding, profile photo, and intro video before dating.",
    });
  });

  it("enforces the daily booked date limit", async () => {
    const headers = authHeaders({
      "x-chewbuu-test-daily-limit": "0",
    });
    await saveTestProfile(headers);

    const response = await app.request("/dating/requests", {
      body: JSON.stringify(dateRequestPayload),
      headers,
      method: "POST",
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      message: "Daily date booking limit reached.",
    });
  });

  it("enforces date overlap prevention (within 2 hours)", async () => {
    const headers = authHeaders({
      "x-chewbuu-test-user-id": "overlap-test-user",
    });
    await saveTestProfile(headers);

    // First request at 12:00
    const response1 = await app.request("/dating/requests", {
      body: JSON.stringify({
        ...dateRequestPayload,
        scheduledAt: "2026-08-01T12:00:00.000Z",
      }),
      headers,
      method: "POST",
    });
    expect(response1.status).toBe(201);

    // Second request at 13:00 (overlaps - within 2 hours!)
    const response2 = await app.request("/dating/requests", {
      body: JSON.stringify({
        ...dateRequestPayload,
        scheduledAt: "2026-08-01T13:00:00.000Z",
      }),
      headers,
      method: "POST",
    });
    expect(response2.status).toBe(403);
    expect(await response2.json()).toMatchObject({
      message: "You already have a date booked within 2 hours of this time.",
    });

    // Third request at 14:30 (allowed - more than 2 hours!)
    const response3 = await app.request("/dating/requests", {
      body: JSON.stringify({
        ...dateRequestPayload,
        scheduledAt: "2026-08-01T14:30:00.000Z",
      }),
      headers,
      method: "POST",
    });
    expect(response3.status).toBe(201);
  });

  it("allows sugar users to request covered group dates and returns matches", async () => {
    const headers = authHeaders({
      "x-chewbuu-test-tier": "sugar",
      "x-chewbuu-test-user-id": crypto.randomUUID(),
    });
    await saveTestProfile(headers);

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

  it("accepts the move category and returns fallback suggestions", async () => {
    const response = await app.request("/dating/places/suggest", {
      body: JSON.stringify({
        area: "Nashville, TN",
        filters: ["yoga", "hiking"],
        what: ["move"],
      }),
      headers: authHeaders(),
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      places: expect.arrayContaining([
        expect.objectContaining({
          placeId: expect.stringContaining("mock-"),
        }),
      ]),
    });
  });

  it("builds a Google Places text query from date intent", () => {
    expect(
      buildGooglePlacesTextQuery({
        area: "Little Rock, AR",
        filters: ["chicken", "whiskey", "pool"],
        what: ["eat", "drink", "play"],
      })
    ).toBe(
      "chicken whiskey pool food restaurant bar drinks wine beer coffee cocktail fun entertainment things to do near Little Rock, AR"
    );
  });

  it("builds a move-category query with fitness keywords", () => {
    expect(
      buildGooglePlacesTextQuery({
        area: "Nashville, TN",
        filters: ["yoga", "hiking"],
        what: ["move"],
      })
    ).toBe("yoga hiking fitness gym activity workout near Nashville, TN");
  });

  it("omits empty filters from the Google Places text query", () => {
    expect(
      buildGooglePlacesTextQuery({
        area: "Nashville, TN",
        filters: [],
        what: ["eat"],
      })
    ).toBe("food restaurant near Nashville, TN");
  });

  it("keeps text filters when biasing Google Places by coordinates", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "test-places-key";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ places: [] }));

    const response = await app.request("/dating/places/suggest", {
      body: JSON.stringify({
        area: "Searcy, AR",
        filters: ["tacos"],
        latitude: "35.2468",
        longitude: "-91.7337",
        what: ["eat"],
      }),
      headers: authHeaders(),
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:searchText",
      expect.objectContaining({
        body: expect.any(String),
      })
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as {
      includedType?: string;
      locationBias?: {
        circle?: {
          center?: { latitude?: number; longitude?: number };
        };
      };
      textQuery?: string;
    };
    expect(body).toMatchObject({
      includedType: "restaurant",
      textQuery: "tacos food restaurant near Searcy, AR",
    });
    expect(body.locationBias?.circle?.center).toEqual({
      latitude: 35.2468,
      longitude: -91.7337,
    });
  });

  it("proxies Google Places photos without exposing the API key in redirects", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "test-places-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("image-bytes", {
        headers: { "content-type": "image/jpeg" },
        status: 200,
      })
    );

    const response = await app.request(
      "/dating/places/photos?name=places/place-1/photos/photo-1",
      {
        headers: authHeaders(),
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(await response.text()).toBe("image-bytes");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/place-1/photos/photo-1/media?maxWidthPx=960",
      expect.objectContaining({
        headers: {
          "x-goog-api-key": "test-places-key",
        },
      })
    );
  });

  it("considers user onboarded but unable to date when basics are present but media is missing", async () => {
    const headers = authHeaders({
      "x-chewbuu-test-intro-video": "false",
      "x-chewbuu-test-profile-photo": "false",
    });

    const payloadWithoutMedia = {
      ...profilePayload,
      media: [],
    };

    const saveResponse = await app.request("/dating/profile", {
      body: JSON.stringify(payloadWithoutMedia),
      headers,
      method: "PUT",
    });

    expect(saveResponse.status).toBe(200);
    expect(await saveResponse.json()).toMatchObject({
      readiness: {
        canDate: false,
        onboarded: true,
      },
    });
  });

  it("marks profile not ready to date when the intro video is missing but photo is present", async () => {
    const headers = authHeaders();

    const payloadWithPhotoOnly = {
      ...profilePayload,
      media: [
        {
          isPrimary: true,
          kind: "profile_photo",
          sortOrder: 0,
          url: "https://example.com/profile.jpg",
        },
      ],
    };

    const saveResponse = await app.request("/dating/profile", {
      body: JSON.stringify(payloadWithPhotoOnly),
      headers,
      method: "PUT",
    });

    expect(saveResponse.status).toBe(200);
    expect(await saveResponse.json()).toMatchObject({
      readiness: {
        canDate: false,
        onboarded: true,
      },
    });
  });

  it("lets mingle members book group dates with dutch payment", async () => {
    const headers = authHeaders({
      "x-chewbuu-test-tier": "mingle",
      "x-chewbuu-test-user-id": crypto.randomUUID(),
    });
    await saveTestProfile(headers);

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
      headers,
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      request: {
        partySize: 2,
        paymentMode: "dutch",
      },
    });
  });

  it("normalizes Google Places text search results", () => {
    expect(
      normalizeGooglePlaces([
        {
          displayName: { text: "Big Orange" },
          formattedAddress: "17809 Chenal Pkwy, Little Rock, AR",
          id: "ChIJ-test-place",
          primaryType: "restaurant",
          rating: 4.6,
          types: ["restaurant", "bar", "food"],
        },
        {
          formattedAddress: "No display name",
          id: "missing-name",
        },
      ])
    ).toEqual([
      {
        address: "17809 Chenal Pkwy, Little Rock, AR",
        name: "Big Orange",
        placeId: "ChIJ-test-place",
        rating: "4.6",
        types: ["restaurant", "bar", "food"],
      },
    ]);
  });

  it("keeps Google Places coordinates when present", () => {
    expect(
      normalizeGooglePlaces([
        {
          displayName: { text: "Big Orange" },
          id: "place-with-coords",
          location: { latitude: 34.7465, longitude: -92.2896 },
        },
      ])
    ).toEqual([
      {
        latitude: 34.7465,
        longitude: -92.2896,
        name: "Big Orange",
        placeId: "place-with-coords",
        types: [],
      },
    ]);
  });
});

describe("invitePurposeForMembership", () => {
  it("tracks Social friend invites as referrals instead of circle membership", () => {
    expect(
      invitePurposeForMembership({ relationship: "friend" }, "social")
    ).toBe("friend_referral");
  });

  it("tracks premium friend invites as circle invites", () => {
    expect(
      invitePurposeForMembership({ relationship: "friend" }, "mingle")
    ).toBe("circle_invite");
  });

  it("keeps spouse invites distinct from friend rewards", () => {
    expect(
      invitePurposeForMembership({ relationship: "spouse" }, "sugar")
    ).toBe("spouse_invite");
  });
});

describe("isJoinableInvite", () => {
  it("joins when the invite email matches the new account", () => {
    expect(
      isJoinableInvite(
        { email: "Friend@Example.com", status: "sent" },
        { email: "friend@example.com" }
      )
    ).toBe(true);
  });

  it("joins when normalized phone numbers match", () => {
    expect(
      isJoinableInvite(
        { phone: "(555) 123-4567", status: "pending" },
        { email: "other@example.com", phone: "555.123.4567" }
      )
    ).toBe(true);
  });

  it("does not re-join an already joined invite", () => {
    expect(
      isJoinableInvite(
        { email: "friend@example.com", status: "joined" },
        { email: "friend@example.com" }
      )
    ).toBe(false);
  });

  it("does not join unrelated invites", () => {
    expect(
      isJoinableInvite(
        { email: "someone@example.com", status: "sent" },
        { email: "other@example.com" }
      )
    ).toBe(false);
  });
});
