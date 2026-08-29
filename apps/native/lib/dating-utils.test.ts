import { describe, expect, it } from "vitest";

import {
  getPastRequests,
  getUpcomingRequests,
  isRecapEligible,
} from "./dating-utils";

const requests = [
  { id: "future", scheduledAt: "2026-09-02T18:00:00.000Z", status: "accepted" },
  { id: "past", scheduledAt: "2026-08-01T18:00:00.000Z", status: "completed" },
  {
    id: "cancelled",
    scheduledAt: "2026-09-03T18:00:00.000Z",
    status: "cancelled",
  },
];

describe("native dating utilities", () => {
  it("separates future active dates from terminal requests", () => {
    expect(
      getUpcomingRequests(requests, Date.parse("2026-08-15T00:00:00.000Z")).map(
        (request) => request.id
      )
    ).toEqual(["future"]);
    expect(getPastRequests(requests).map((request) => request.id)).toEqual([
      "past",
      "cancelled",
    ]);
  });

  it("only allows recaps for completed or review-due dates", () => {
    expect(isRecapEligible("completed")).toBe(true);
    expect(isRecapEligible("review_due")).toBe(true);
    expect(isRecapEligible("accepted")).toBe(false);
  });
});
