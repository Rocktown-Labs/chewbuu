import { describe, expect, it } from "vitest";

import {
  DATE_SAFETY_GEOFENCE_MILES,
  isWithinDateSafetyGeofence,
  roundSafetyDistance,
} from "./date-safety";

describe("date safety geofence", () => {
  it("allows help at or inside the venue radius", () => {
    expect(isWithinDateSafetyGeofence(DATE_SAFETY_GEOFENCE_MILES)).toBe(true);
    expect(isWithinDateSafetyGeofence(0.1)).toBe(true);
  });

  it("rejects missing or distant locations", () => {
    expect(isWithinDateSafetyGeofence(null)).toBe(false);
    expect(isWithinDateSafetyGeofence(DATE_SAFETY_GEOFENCE_MILES + 0.001)).toBe(
      false
    );
  });

  it("rounds distances for user-facing safety status", () => {
    expect(roundSafetyDistance(0.123456)).toBe(0.123);
  });
});
