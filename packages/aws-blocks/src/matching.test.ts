import { describe, expect, it } from "vitest";

import {
  adjustReliabilityScore,
  calculateMatchScore,
  distanceBetweenMiles,
  hasLocation,
} from "./matching";

describe("matching foundations", () => {
  it("requires a valid area and coordinate pair", () => {
    expect(
      hasLocation({
        area: "Nashville, TN",
        latitude: "36.16",
        longitude: "-86.78",
      })
    ).toBe(true);
    expect(
      hasLocation({ area: "Nashville, TN", latitude: "", longitude: "-86.78" })
    ).toBe(false);
    expect(
      hasLocation({
        area: "Nashville, TN",
        latitude: "91",
        longitude: "-86.78",
      })
    ).toBe(false);
  });

  it("calculates distance and rejects missing coordinates", () => {
    expect(
      distanceBetweenMiles("36.12", "-86.67", "36.16", "-86.78")
    ).toBeCloseTo(6.7, 0);
    expect(distanceBetweenMiles(null, "-86.78", "36.16", "-86.78")).toBeNull();
  });

  it("includes reliability and contribution in match scores", () => {
    const score = calculateMatchScore(["hiking", "music"], {
      contributionScore: 4,
      distanceMiles: 2,
      interests: ["hiking"],
      reliabilityScore: 100,
    });
    expect(score).toBe(82);
    expect(adjustReliabilityScore(100, 1)).toBe(90);
    expect(adjustReliabilityScore(0, 5)).toBe(10);
  });
});
