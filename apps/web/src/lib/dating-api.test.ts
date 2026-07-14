import { describe, expect, it } from "vitest";

import { getServerUrl } from "./dating-api";

describe("getServerUrl", () => {
  it("returns absolute URLs without a trailing slash", () => {
    expect(getServerUrl("https://api.example.com/")).toBe(
      "https://api.example.com"
    );
    expect(getServerUrl("https://api.example.com")).toBe(
      "https://api.example.com"
    );
  });

  it("returns absolute URLs with paths unchanged", () => {
    expect(getServerUrl("https://api.example.com/v1")).toBe(
      "https://api.example.com/v1"
    );
  });

  it("prefixes same-origin paths with the current window origin", () => {
    expect(getServerUrl("/api")).toBe(`${window.location.origin}/api`);
    expect(getServerUrl("/api/")).toBe(`${window.location.origin}/api`);
  });
});
