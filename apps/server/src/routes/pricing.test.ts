import { describe, expect, it } from "vitest";

import app from "../app";

const authHeaders = (email = "cg@rocktownlabs.com") =>
  new Headers({
    "content-type": "application/json",
    "x-chewbuu-test-email": email,
    "x-chewbuu-test-user-id": crypto.randomUUID(),
  });

describe("pricing routes", () => {
  it("returns public membership plans", async () => {
    const response = await app.request("/pricing/plans");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      plans: expect.arrayContaining([
        expect.objectContaining({ tier: "social" }),
        expect.objectContaining({ tier: "mingle" }),
        expect.objectContaining({ tier: "sugar" }),
      ]),
    });
  });

  it("requires an admin email for pricing management", async () => {
    const response = await app.request("/admin/pricing/plans", {
      headers: authHeaders("member@example.com"),
    });

    expect(response.status).toBe(403);
  });

  it("lets admins seed and update membership pricing", async () => {
    const headers = authHeaders();
    const seedResponse = await app.request("/admin/pricing/seed", {
      headers,
      method: "POST",
    });

    expect(seedResponse.status).toBe(201);

    const updateResponse = await app.request("/admin/pricing/plans", {
      body: JSON.stringify({
        plans: [
          {
            active: true,
            annualPriceCents: 0,
            cta: "Keep Social",
            description: "Solo dating with two booked dates per day.",
            features: ["Solo dating"],
            monthlyPriceCents: 0,
            name: "Social",
            sortOrder: 0,
            stats: ["Free"],
            stripePriceId: "",
            tier: "social",
          },
        ],
      }),
      headers,
      method: "PUT",
    });

    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toMatchObject({
      plans: [
        expect.objectContaining({
          description: "Solo dating with two booked dates per day.",
          tier: "social",
        }),
      ],
    });
  });
});
