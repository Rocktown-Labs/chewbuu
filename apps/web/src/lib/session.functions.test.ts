import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadServerSession } from "./session.functions";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveAuthModule: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    handler: <T>(handler: T) => handler,
  }),
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => ({ headers: new Headers() }),
}));

vi.mock("@chewbuu/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}));

vi.mock("@chewbuu/auth/runtime", () => ({
  resolveAuthModule: mocks.resolveAuthModule,
}));

describe("loadServerSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns the session when the lookup succeeds", async () => {
    const session = { user: { id: "user-1" } };
    mocks.resolveAuthModule.mockReturnValue({
      api: { getSession: mocks.getSession },
    });
    mocks.getSession.mockResolvedValue(session);

    await expect(loadServerSession(new Headers())).resolves.toEqual({
      data: session,
      error: null,
    });
  });

  it("returns an anonymous session when the session read throws", async () => {
    mocks.resolveAuthModule.mockReturnValue({
      api: { getSession: mocks.getSession },
    });
    mocks.getSession.mockRejectedValue(new Error("read ECONNRESET"));

    await expect(loadServerSession(new Headers())).resolves.toEqual({
      data: null,
      error: null,
    });
  });

  it("returns an anonymous session when the auth module cannot be resolved", async () => {
    mocks.resolveAuthModule.mockImplementation(() => {
      throw new Error(
        "Better Auth module did not expose an initialized auth API."
      );
    });

    await expect(loadServerSession(new Headers())).resolves.toEqual({
      data: null,
      error: null,
    });
  });
});
