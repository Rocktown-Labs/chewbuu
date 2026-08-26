import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route } from "./route";

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    getSession: mocks.getSession,
  },
}));

vi.mock("@chewbuu/aws-blocks", () => ({
  api: {
    getProfile: mocks.getProfile,
  },
}));

describe("_auth route guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to /login", async () => {
    mocks.getSession.mockResolvedValue({ data: null });

    const { beforeLoad } = Route.options;
    if (!beforeLoad) {
      throw new Error("beforeLoad is required");
    }

    await expect(
      beforeLoad({
        location: { pathname: "/me" },
      } as any)
    ).rejects.toMatchObject({
      options: {
        to: "/login",
      },
    });
  });

  it("allows un-onboarded users to resume from /me", async () => {
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

    const result = await beforeLoad({
      location: { pathname: "/me" },
    } as any);

    expect(result).toEqual({ session: { data: expect.anything() } });
  });

  it("allows un-onboarded users to access /me/profile", async () => {
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

    const result = await beforeLoad({
      location: { pathname: "/me/profile" },
    } as any);

    expect(result).toEqual({ session: { data: expect.anything() } });
  });

  it("allows un-onboarded users to access /onboarding", async () => {
    const sessionData = {
      user: {
        email: "newuser@example.com",
        hasCompletedOnboarding: false,
        id: "user-1",
      },
    };
    mocks.getSession.mockResolvedValue({ data: sessionData });

    const { beforeLoad } = Route.options;
    if (!beforeLoad) {
      throw new Error("beforeLoad is required");
    }

    const result = await beforeLoad({
      location: { pathname: "/onboarding" },
    } as any);

    expect(result).toEqual({ session: { data: sessionData } });
  });

  it("allows onboarded users to access /me", async () => {
    const sessionData = {
      user: {
        email: "onboarded@example.com",
        hasCompletedOnboarding: true,
        id: "user-1",
      },
    };
    mocks.getSession.mockResolvedValue({ data: sessionData });

    const { beforeLoad } = Route.options;
    if (!beforeLoad) {
      throw new Error("beforeLoad is required");
    }

    const result = await beforeLoad({
      location: { pathname: "/me" },
    } as any);

    expect(result).toEqual({ session: { data: sessionData } });
  });

  it("redirects onboarded users missing location to /me/profile when accessing dating routes", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        user: {
          email: "onboarded@example.com",
          hasCompletedOnboarding: true,
          id: "user-1",
        },
      },
    });
    mocks.getProfile.mockResolvedValue({
      profile: {
        area: "",
        latitude: null,
        longitude: null,
      },
    });

    const { beforeLoad } = Route.options;
    if (!beforeLoad) {
      throw new Error("beforeLoad is required");
    }

    await expect(
      beforeLoad({
        location: { pathname: "/matches" },
      } as any)
    ).rejects.toMatchObject({
      options: {
        search: { tab: "profile" },
        to: "/me/profile",
      },
    });
  });
});
