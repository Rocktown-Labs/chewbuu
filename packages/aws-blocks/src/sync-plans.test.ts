import { describe, expect, it } from "vitest";

import {
  DEFAULT_SYNC_PLANS,
  normalizeSyncPlanCode,
  SYNC_PLAN_CODES,
} from "./sync-plans";

describe("Sync plan entitlements", () => {
  it("keeps all purchasable tiers explicitly bounded", () => {
    expect(SYNC_PLAN_CODES).toEqual(["sync_50", "sync_100", "sync_enterprise"]);
    expect(DEFAULT_SYNC_PLANS).toMatchObject({
      sync_50: { freeSpotlightsPerMonth: 0, maxStaff: 50 },
      sync_100: { freeSpotlightsPerMonth: 1, maxStaff: 100 },
      sync_enterprise: { freeSpotlightsPerMonth: 0, maxStaff: 999_999 },
    });
  });

  it("normalizes the legacy Sync plan without accepting arbitrary plans", () => {
    expect(normalizeSyncPlanCode("sync")).toBe("sync_50");
    expect(normalizeSyncPlanCode("sync_100")).toBe("sync_100");
    expect(normalizeSyncPlanCode("mingle")).toBeNull();
    expect(normalizeSyncPlanCode()).toBeNull();
  });
});
