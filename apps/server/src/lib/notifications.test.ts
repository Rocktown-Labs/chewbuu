import { describe, expect, it } from "vitest";

import { sendInviteEmail, sendInviteSms } from "./notifications";

const sessionUser = {
  dailyDateLimit: 2,
  email: "user@example.com",
  hasCompletedOnboarding: false,
  hasIntroVideo: false,
  hasProfilePhoto: false,
  id: "user-1",
  membershipTier: "social",
  name: "Taylor",
};

describe("invite notifications", () => {
  it("skips email sends when Resend is not configured", async () => {
    await expect(
      sendInviteEmail(
        {
          email: "spouse@example.com",
          name: "Pat",
          relationship: "spouse",
        },
        sessionUser
      )
    ).resolves.toEqual({ skipped: true, type: "email" });
  });

  it("skips sms sends when Sent.dm is not configured", async () => {
    await expect(
      sendInviteSms(
        {
          name: "Pat",
          phone: "(555) 555-0100",
          relationship: "spouse",
        },
        sessionUser
      )
    ).resolves.toEqual({ skipped: true, type: "sms" });
  });
});
