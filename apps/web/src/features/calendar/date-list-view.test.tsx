import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DatingSummary } from "@/lib/dating-api";

import { DateListView } from "./date-list-view";

const request: DatingSummary["requests"][number] = {
  filters: [],
  id: "request-1",
  matches: [],
  partyMembers: [],
  partySize: 1,
  paymentMode: "dutch",
  places: [
    {
      name: "Good Company",
      placeId: "place-1",
      types: ["restaurant"],
    },
  ],
  scheduledAt: "2099-08-29T18:00:00.000Z",
  searchArea: "Little Rock",
  status: "accepted",
  what: ["eat"],
};

describe("DateListView", () => {
  it("shows scheduled dates and opens their details", async () => {
    const user = userEvent.setup();
    const onOpenDate = vi.fn();

    render(
      <DateListView
        dates={[request]}
        onOpenDate={onOpenDate}
        onPlanDate={vi.fn()}
      />
    );

    expect(screen.getByText("Upcoming dates")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /good company/i }));
    expect(onOpenDate).toHaveBeenCalledWith("request-1");
  });

  it("passes the selected day to the plan action", async () => {
    const user = userEvent.setup();
    const onPlanDate = vi.fn();

    render(
      <DateListView dates={[]} onOpenDate={vi.fn()} onPlanDate={onPlanDate} />
    );

    await user.click(screen.getByRole("button", { name: /plan a date/i }));
    expect(onPlanDate).toHaveBeenCalledWith(expect.any(Date));
  });
});
