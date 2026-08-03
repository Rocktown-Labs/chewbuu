import { describe, expect, it } from "vitest";

import { nextDateLifecycleStatus } from "./date-lifecycle";

describe("date lifecycle", () => {
  const scheduledAt = new Date("2026-08-03T18:00:00.000Z");

  it("moves a checked-in date to review when its scheduled time has passed", () => {
    expect(
      nextDateLifecycleStatus({
        hasPendingReviews: false,
        now: new Date("2026-08-03T19:00:00.000Z"),
        scheduledAt,
        status: "checked_in",
      })
    ).toBe("review_due");
  });

  it("does not settle a review while required work remains", () => {
    expect(
      nextDateLifecycleStatus({
        hasPendingReviews: true,
        now: new Date("2026-08-03T20:00:00.000Z"),
        scheduledAt,
        status: "review_due",
      })
    ).toBe("review_due");
  });

  it("settles a review only after all required work is complete", () => {
    expect(
      nextDateLifecycleStatus({
        hasPendingReviews: false,
        now: new Date("2026-08-03T20:00:00.000Z"),
        scheduledAt,
        status: "review_due",
      })
    ).toBe("completed");
  });
});
