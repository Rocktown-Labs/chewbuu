import { describe, expect, it } from "vitest";

import {
  DATE_REQUEST_ACTION_WINDOW_MS,
  getDateRequestWindowRemaining,
  isDateRequestActionable,
} from "./date-request-window";

const createdAt = "2026-08-29T12:00:00.000Z";
const createdTimestamp = new Date(createdAt).getTime();

describe("date request action window", () => {
  it("keeps a request actionable for two minutes", () => {
    expect(
      isDateRequestActionable(
        createdAt,
        createdTimestamp + DATE_REQUEST_ACTION_WINDOW_MS - 1
      )
    ).toBe(true);
    expect(
      getDateRequestWindowRemaining(
        createdAt,
        createdTimestamp + DATE_REQUEST_ACTION_WINDOW_MS - 1
      )
    ).toBe(1);
  });

  it("expires a request at the two-minute boundary", () => {
    expect(
      isDateRequestActionable(
        createdAt,
        createdTimestamp + DATE_REQUEST_ACTION_WINDOW_MS
      )
    ).toBe(false);
  });

  it("gives malformed timestamps a fresh client window", () => {
    expect(getDateRequestWindowRemaining("not-a-date", 10_000)).toBe(
      DATE_REQUEST_ACTION_WINDOW_MS
    );
  });
});
