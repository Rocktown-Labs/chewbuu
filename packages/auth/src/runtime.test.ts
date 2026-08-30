import { describe, expect, it, vi } from "vitest";

import { resolveAuthModule } from "./runtime";

const createMockAuth = () => ({
  api: {
    getSession: vi.fn(),
  },
});

describe("resolveAuthModule", () => {
  it("resolves a named auth export", () => {
    const auth = createMockAuth();

    expect(resolveAuthModule({ auth })).toBe(auth);
  });

  it("resolves a CommonJS default module wrapper", () => {
    const auth = createMockAuth();

    expect(resolveAuthModule({ default: { auth } })).toBe(auth);
  });

  it("resolves a direct default auth export", () => {
    const auth = createMockAuth();

    expect(resolveAuthModule({ default: auth })).toBe(auth);
  });

  it("creates auth when only the factory is exported", () => {
    const auth = createMockAuth();

    expect(
      resolveAuthModule({
        createAuth: () => auth,
      })
    ).toBe(auth);
  });

  it("rejects modules without an auth API", () => {
    expect(() => resolveAuthModule({})).toThrow(
      "Better Auth module did not expose an initialized auth API."
    );
  });
});
