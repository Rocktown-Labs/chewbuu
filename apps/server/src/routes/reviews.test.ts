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

const reviewPayload = {
  personComment: "Great conversation and showed up on time.",
  personCriteria: {
    chemistry: 4,
    conversation: 5,
    hygiene: 5,
    reliability: 5,
    respect: 5,
    style: 4,
  },
  personRating: 5,
  placeComment: "Easy first-date spot with good service.",
  placeCriteria: {
    atmosphere: 5,
    cleanliness: 5,
    date_fit: 5,
    food_drink: 4,
    service: 5,
    value: 4,
  },
  placeRating: 5,
};

describe("review routes", () => {
  it("requires auth for review prompts", async () => {
    const response = await app.request("/reviews/date-requests/request-1");

    expect(response.status).toBe(401);
  });

  it("returns person and place review criteria", async () => {
    const response = await app.request("/reviews/date-requests/request-1", {
      headers: authHeaders(),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      criteria: {
        person: expect.arrayContaining([
          expect.objectContaining({ key: "hygiene" }),
        ]),
        place: expect.arrayContaining([
          expect.objectContaining({ key: "date_fit" }),
        ]),
      },
    });
  });

  it("submits a completed review", async () => {
    const headers = authHeaders();
    const response = await app.request("/reviews/date-requests/request-2", {
      body: JSON.stringify(reviewPayload),
      headers,
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      review: {
        personCriteria: {
          hygiene: 5,
        },
        personRating: 5,
        placeCriteria: {
          date_fit: 5,
        },
        placeRating: 5,
        required: false,
      },
    });
  });

  it("rejects ratings outside the five-star range", async () => {
    const response = await app.request("/reviews/date-requests/request-3", {
      body: JSON.stringify({
        ...reviewPayload,
        personRating: 6,
      }),
      headers: authHeaders(),
      method: "POST",
    });

    expect(response.status).toBe(422);
  });
});
