import { describe, expect, it, vi } from "vitest";

import { SPOTLIGHT_OFFERS } from "./spotlight";

vi.mock("./database", () => ({ getDb: vi.fn() }));

describe("Chewbuu Spotlight offers", () => {
  it("matches the published promotion prices and durations", () => {
    expect(SPOTLIGHT_OFFERS).toEqual({
      event: { durationDays: 1, priceCents: 2900 },
      special: { durationDays: 3, priceCents: 1900 },
      venue: { durationDays: 7, priceCents: 4900 },
    });
  });
});
