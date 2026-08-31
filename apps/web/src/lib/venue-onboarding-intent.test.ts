import { beforeEach, describe, expect, it } from "vitest";

import {
  consumeSyncOnboardingIntent,
  getAuthCallbackUrl,
  hasSyncOnboardingIntent,
  markSyncOnboardingIntent,
} from "./venue-onboarding-intent";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("venue onboarding intent", () => {
  it("marks and consumes a Sync onboarding intent once", () => {
    expect(hasSyncOnboardingIntent()).toBe(false);

    markSyncOnboardingIntent();

    expect(hasSyncOnboardingIntent()).toBe(true);
    expect(consumeSyncOnboardingIntent()).toBe(true);
    expect(hasSyncOnboardingIntent()).toBe(false);
    expect(consumeSyncOnboardingIntent()).toBe(false);
  });

  it("uses the venue portal as the auth callback while the intent is active", () => {
    markSyncOnboardingIntent();

    expect(getAuthCallbackUrl("https://chewbuu.com/api/auth", "/me")).toBe(
      "https://chewbuu.com/api/auth/venue-portal"
    );

    consumeSyncOnboardingIntent();

    expect(getAuthCallbackUrl("https://chewbuu.com/api/auth", "/me")).toBe(
      "https://chewbuu.com/api/auth/me"
    );
  });
});
