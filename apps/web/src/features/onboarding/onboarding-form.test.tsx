import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingForm } from "./onboarding-form";

const mocks = vi.hoisted(() => ({
  getPlans: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");

  return {
    Link: ({
      children,
      to,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("@/lib/dating-api", () => ({
  datingApi: {
    saveProfile: vi.fn(),
  },
  getServerUrl: (url: string) => url,
  pricingApi: {
    getPlans: mocks.getPlans,
  },
}));

describe("OnboardingForm", () => {
  beforeEach(() => {
    mocks.getPlans.mockResolvedValue({ plans: [] });
    mocks.navigate.mockReset();
  });

  it("renders the redesigned basics step with profile validation fields", async () => {
    render(<OnboardingForm />);

    expect(
      await screen.findByRole("heading", {
        name: /tell chewbuu who is going out/i,
      })
    ).toBeVisible();
    expect(screen.getByLabelText(/area/i)).toBeVisible();
    expect(screen.getByText("Sex")).toBeVisible();
    expect(screen.getByText("Sexuality")).toBeVisible();
  });

  it("can move to the media step with upload and camera actions", async () => {
    const user = userEvent.setup();

    render(<OnboardingForm />);

    await screen.findByRole("heading", {
      name: /tell chewbuu who is going out/i,
    });

    await user.click(screen.getByRole("button", { name: "Media" }));

    expect(screen.getByRole("heading", { name: /video first/i })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /upload/i })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /record/i })).toBeVisible();
  });
});
