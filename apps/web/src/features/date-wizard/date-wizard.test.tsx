import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DateWizard } from "./date-wizard";

const mocks = vi.hoisted(() => ({
  createRequest: vi.fn(),
  getProfile: vi.fn(),
  suggestPlaces: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  notFound: () => new Error("Not Found"),
  useBlocker: () => ({
    proceed: vi.fn(),
    reset: vi.fn(),
    state: "idle",
    status: "idle",
  }),
}));

vi.mock("@/lib/dating-api", () => ({
  datingApi: {
    createRequest: mocks.createRequest,
    getProfile: mocks.getProfile,
    suggestPlaces: mocks.suggestPlaces,
  },
}));

const birthdayForAge = (age: number) => {
  const today = new Date();
  return new Date(today.getFullYear() - age, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);
};

describe("DateWizard", () => {
  beforeEach(() => {
    mocks.getProfile.mockResolvedValue({ profile: null });
    mocks.suggestPlaces.mockResolvedValue({ places: [] });
    mocks.createRequest.mockReset();
  });

  it("keeps social members on solo dates with locked dutch payment", async () => {
    const user = userEvent.setup();
    render(<DateWizard membershipTier="social" />);

    await user.click(screen.getByRole("button", { name: /guests/i }));
    expect(screen.getByText(/social members date solo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add guest/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /payment options/i }));
    const dutch = screen.getByRole("checkbox", {
      name: /split the bill/i,
    });
    expect(dutch).toBeChecked();
    expect(dutch).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText(/go sugar to cover the date yourself/i)
    ).toBeInTheDocument();
  });

  it("lets sugar members uncheck dutch to cover the date", async () => {
    const user = userEvent.setup();

    render(<DateWizard membershipTier="sugar" />);

    await user.click(screen.getByRole("button", { name: /payment options/i }));
    const dutch = await screen.findByRole("checkbox", {
      name: /split the bill/i,
    });
    expect(dutch).toBeEnabled();

    await user.click(dutch);
    expect(dutch).not.toBeChecked();
  });

  it("hides the drink option for under-21 members", async () => {
    mocks.getProfile.mockResolvedValue({
      profile: {
        area: "Nashville, TN",
        birthday: birthdayForAge(20),
      },
    });

    render(<DateWizard membershipTier="social" />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /drink/i })
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(/drink dates unlock when you turn 21/i)
    ).toBeInTheDocument();
  });

  it("offers eat, drink, and play toggles to members 21 and up", async () => {
    mocks.getProfile.mockResolvedValue({
      profile: {
        area: "Nashville, TN",
        birthday: birthdayForAge(30),
      },
    });

    render(<DateWizard membershipTier="mingle" />);

    expect(
      await screen.findByRole("button", { name: /^eat/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^drink/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play/i })).toBeInTheDocument();
  });

  it("uses the selected calendar date as the request date", async () => {
    const selectedDate = new Date(2026, 8, 15);
    const user = userEvent.setup();

    render(<DateWizard initialDate={selectedDate} membershipTier="social" />);

    await user.click(screen.getByRole("button", { name: /when & where/i }));
    expect(screen.getByRole("button", { name: /sep 15/i })).toBeInTheDocument();
  });

  it("moves to the places step once the plan is valid", async () => {
    const user = userEvent.setup();
    mocks.getProfile.mockResolvedValue({
      profile: {
        area: "Nashville, TN",
        birthday: birthdayForAge(28),
      },
    });

    render(<DateWizard membershipTier="mingle" />);

    await screen.findByRole("button", { name: /^eat/i });
    await user.click(
      screen.getByRole("button", { name: /continue to spots/i })
    );

    expect(await screen.findByText(/your spots/i)).toBeInTheDocument();
    expect(mocks.suggestPlaces).toHaveBeenCalledWith(
      expect.objectContaining({ area: "Nashville, TN", what: ["eat"] })
    );
  });

  it("submits the place selected in the places step", async () => {
    const user = userEvent.setup();
    const selectedPlace = {
      address: "100 Main Street",
      name: "The Local Table",
      placeId: "place-local-table",
      types: ["restaurant"],
    };
    mocks.getProfile.mockResolvedValue({
      profile: {
        area: "Nashville, TN",
        birthday: birthdayForAge(28),
      },
    });
    mocks.suggestPlaces.mockResolvedValue({ places: [selectedPlace] });
    mocks.createRequest.mockResolvedValue({
      matches: [],
      request: { id: "request-1" },
    });

    render(<DateWizard membershipTier="mingle" />);

    await screen.findByRole("button", { name: /^eat/i });
    await user.click(
      screen.getByRole("button", { name: /continue to spots/i })
    );
    await user.click(
      await screen.findByRole("button", { name: /the local table/i })
    );
    await user.click(screen.getByRole("button", { name: /find matches/i }));

    await waitFor(() => {
      expect(mocks.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({ places: [selectedPlace] })
      );
    });
  });
});
