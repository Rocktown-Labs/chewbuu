import { describe, expect, it } from "vitest";

import { getNearbySpotsArea, getNearbySpotsFilters } from "./spot-search";

describe("nearby spots search", () => {
  it("uses the current location before the profile area", () => {
    expect(getNearbySpotsArea("Searcy, Arkansas")).toBe("Searcy, Arkansas");
    expect(getNearbySpotsArea("  ", "Little Rock, Arkansas")).toBe(
      "Little Rock, Arkansas"
    );
  });

  it("does not require a completed dating profile to provide an area", () => {
    expect(getNearbySpotsArea("Searcy, Arkansas")).toBe("Searcy, Arkansas");
    expect(getNearbySpotsArea()).toBe("");
  });

  it("only sends a search filter when the user entered one", () => {
    expect(getNearbySpotsFilters("  coffee  ")).toEqual(["coffee"]);
    expect(getNearbySpotsFilters(" ")).toEqual([]);
  });
});
