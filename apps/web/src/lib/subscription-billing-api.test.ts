import { beforeEach, describe, expect, it, vi } from "vitest";

import { subscriptionBillingApi } from "./subscription-billing-api";

const subscriptionMocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  list: vi.fn(),
}));

vi.mock("./auth-client", () => ({
  authClient: { subscription: subscriptionMocks },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("subscription billing API", () => {
  it("starts the hosted user cancellation flow without redirecting automatically", async () => {
    subscriptionMocks.cancel.mockResolvedValue({
      data: { redirect: false, url: "https://billing.stripe.com/session" },
      error: null,
    });

    await expect(
      subscriptionBillingApi.cancel({
        customerType: "user",
        returnPath: "/me?billing=cancelled",
      })
    ).resolves.toEqual({
      redirect: false,
      url: "https://billing.stripe.com/session",
    });

    expect(subscriptionMocks.cancel).toHaveBeenCalledWith({
      customerType: "user",
      disableRedirect: true,
      returnUrl: `${window.location.origin}/me?billing=cancelled`,
    });
  });

  it("lists organization subscriptions and surfaces API failures", async () => {
    subscriptionMocks.list.mockResolvedValueOnce({
      data: [
        {
          plan: "sync_100",
          referenceId: "org-123",
          status: "active",
        },
      ],
      error: null,
    });

    await expect(
      subscriptionBillingApi.list({
        customerType: "organization",
        referenceId: "org-123",
      })
    ).resolves.toEqual([
      {
        plan: "sync_100",
        referenceId: "org-123",
        status: "active",
      },
    ]);

    subscriptionMocks.list.mockResolvedValueOnce({
      data: undefined,
      error: { message: "Not authorized" },
    });

    await expect(
      subscriptionBillingApi.list({ customerType: "organization" })
    ).rejects.toThrow("Not authorized");
  });
});
