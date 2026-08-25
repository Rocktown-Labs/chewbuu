import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route } from "./index";

const mocks = vi.hoisted(() => ({
  getPlans: vi.fn(),
  getServerSession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    getSession: mocks.getSession,
  },
}));

vi.mock("@/lib/session.functions", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/dating-api", () => ({
  pricingApi: {
    getPlans: mocks.getPlans.mockResolvedValue({ plans: [] }),
  },
}));

describe("Index route beforeLoad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session without redirect for guest visitors", async () => {
    mocks.getSession.mockResolvedValue({ data: null });

    const { beforeLoad } = Route.options;
    if (!beforeLoad) {
      throw new Error("beforeLoad is required");
    }

    const result = await beforeLoad({} as any);
    expect(result).toEqual({ session: { data: null } });
  });

  it("redirects un-onboarded logged in users to /onboarding", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        user: {
          email: "newuser@example.com",
          hasCompletedOnboarding: false,
          id: "user-1",
        },
      },
    });

    const { beforeLoad } = Route.options;
    if (!beforeLoad) {
      throw new Error("beforeLoad is required");
    }

    await expect(beforeLoad({} as any)).rejects.toMatchObject({
      options: {
        to: "/onboarding",
      },
    });
  });

  it("redirects onboarded logged in users to /me", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        user: {
          email: "onboarded@example.com",
          hasCompletedOnboarding: true,
          id: "user-1",
        },
      },
    });

    const { beforeLoad } = Route.options;
    if (!beforeLoad) {
      throw new Error("beforeLoad is required");
    }

    await expect(beforeLoad({} as any)).rejects.toMatchObject({
      options: {
        to: "/me",
      },
    });
  });
});
