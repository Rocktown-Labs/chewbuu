import { afterEach, describe, expect, it, vi } from "vitest";

const sessionUser = {
  dailyDateLimit: 2,
  displayUsername: "taylor",
  email: "user@example.com",
  hasCompletedOnboarding: false,
  hasIntroVideo: false,
  hasProfilePhoto: false,
  id: "user-1",
  membershipTier: "social",
  name: "Taylor",
  username: "taylor",
};

const loadNotifications = async () => {
  vi.resetModules();
  return import("./notifications");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("invite notifications", () => {
  it("skips email sends when Resend is not configured", async () => {
    const { sendInviteEmail } = await loadNotifications();

    await expect(
      sendInviteEmail(
        {
          email: "spouse@example.com",
          name: "Pat",
          relationship: "spouse",
        },
        sessionUser
      )
    ).resolves.toEqual({ sent: false, skipped: true, type: "email" });
  });

  it("skips sms sends when Sent.dm is not configured", async () => {
    const { sendInviteSms } = await loadNotifications();

    await expect(
      sendInviteSms(
        {
          name: "Pat",
          phone: "(555) 555-0100",
          relationship: "spouse",
        },
        sessionUser
      )
    ).resolves.toEqual({ sent: false, skipped: true, type: "sms" });
  });

  it("attempts sms when the email provider fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
    vi.stubEnv("SENT_DM_API_KEY", "test-sent-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("email failed", { status: 500 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { sendInviteNotifications } = await loadNotifications();
    const [outcome] = await sendInviteNotifications(
      [
        {
          email: "spouse@example.com",
          name: "Pat",
          phone: "(555) 555-0100",
          relationship: "spouse",
        },
      ],
      sessionUser
    );

    expect(outcome).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(outcome?.results).toEqual([
      {
        error: "Resend email failed with status 500",
        sent: false,
        skipped: false,
        type: "email",
      },
      { sent: true, skipped: false, type: "sms" },
    ]);
  });
});
