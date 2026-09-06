import { describe, expect, it } from "vitest";

import "@/polyfills";

import {
  dateRequestsCollection,
  recapsCollection,
  profileCollection,
} from "./collections";

describe("native collections and polyfills", () => {
  it("provides crypto randomUUID and getRandomValues", () => {
    expect(typeof globalThis.crypto.randomUUID).toBe("function");
    expect(typeof globalThis.crypto.getRandomValues).toBe("function");
    const id = globalThis.crypto.randomUUID();
    expect(typeof id).toBe("string");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("initializes TanStack DB collections without random number generator errors", () => {
    expect(dateRequestsCollection).toBeDefined();
    expect(recapsCollection).toBeDefined();
    expect(profileCollection).toBeDefined();
  });
});
