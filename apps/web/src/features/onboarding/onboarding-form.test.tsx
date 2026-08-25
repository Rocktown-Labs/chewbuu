import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingForm } from "./onboarding-form";
import { useOnboardingStore } from "./onboarding-store";

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  getPlans: vi.fn(),
  navigate: vi.fn(),
  routerInvalidate: vi.fn(),
  saveProfile: vi.fn(),
  saveProfileDraft: vi.fn(),
  session: {
    data: {
      user: {
        email: "casey@example.com",
        name: "Casey Tester",
      },
    },
  },
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
  useNavigate: () => mocks.navigate,
  useRouter: () => ({
    invalidate: mocks.routerInvalidate,
  }),
}));

vi.mock("@/lib/dating-api", () => ({
  datingApi: {
    getProfile: mocks.getProfile,
    saveProfile: mocks.saveProfile,
    saveProfileDraft: mocks.saveProfileDraft,
  },
  getServerUrl: (url: string) => url,
  pricingApi: {
    getPlans: mocks.getPlans,
  },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    stripe: {
      upgrade: vi.fn(),
    },
    updateUser: vi.fn(),
    useSession: () => mocks.session,
  },
}));

const birthdayForAge = (age: number, dayOffset = 0) => {
  const today = new Date();
  const birthday = new Date(
    today.getFullYear() - age,
    today.getMonth(),
    today.getDate() + dayOffset
  );
  return birthday.toISOString().slice(0, 10);
};

describe("OnboardingForm", () => {
  beforeEach(() => {
    localStorage.clear();
    useOnboardingStore.getState().clear();
    mocks.getProfile.mockResolvedValue(null);
    mocks.getPlans.mockResolvedValue({ plans: [] });
    mocks.navigate.mockReset();
    mocks.routerInvalidate.mockReset();
    mocks.saveProfile.mockReset();
    mocks.saveProfileDraft.mockReset();
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
    expect(screen.getByText("Relationship Status")).toBeVisible();
  });

  it("can navigate to the permissions step and view device access cards", async () => {
    const user = userEvent.setup();

    render(<OnboardingForm />);

    await screen.findByRole("heading", {
      name: /tell chewbuu who is going out/i,
    });

    await user.click(screen.getByRole("button", { name: "Permissions" }));

    expect(
      await screen.findByRole("heading", {
        name: /enable device access & alerts/i,
      })
    ).toBeVisible();
    expect(screen.getByText("Camera Access")).toBeVisible();
    expect(screen.getByText("Microphone Access")).toBeVisible();
    expect(screen.getByText("Push Notifications & Alerts")).toBeVisible();
    expect(screen.getByText("Location Access")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /enable all permissions/i })
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /test haptics/i })).toBeVisible();
  });

  it("can move to the media step with live capture and record actions", async () => {
    const user = userEvent.setup();

    render(<OnboardingForm />);

    await screen.findByRole("heading", {
      name: /tell chewbuu who is going out/i,
    });

    await user.click(screen.getByRole("button", { name: "Media" }));

    expect(
      screen.getByRole("heading", { name: /live capture/i })
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /camera shutter/i })
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /record live/i })).toBeVisible();
  });

  it("lets Social users add friend referrals during onboarding", async () => {
    const user = userEvent.setup();

    render(<OnboardingForm />);

    await screen.findByRole("heading", {
      name: /tell chewbuu who is going out/i,
    });

    await user.click(screen.getByRole("button", { name: "Friends" }));

    expect(
      await screen.findByRole("heading", {
        name: /chewbuu is better with friends/i,
      })
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /add friend/i })).toBeVisible();
    expect(screen.getByText(/referral credit/i)).toBeVisible();
  });

  it("shows an 18 and older stop screen after basics for underage users", async () => {
    const user = userEvent.setup();
    mocks.getProfile.mockResolvedValue({
      profile: {
        area: "Little Rock, AR",
        bio: "I like real plans and good food.",
        birthday: birthdayForAge(17, 1),
        maritalStatus: "Single",
        occupation: "Student",
        phone: "(555) 555-5555",
        race: "Prefer not to say",
        sex: "Female",
        sexuality: "Straight",
      },
    });

    render(<OnboardingForm />);

    await screen.findByRole("heading", {
      name: /tell chewbuu who is going out/i,
    });

    await user.click(screen.getByRole("button", { name: /^next/i }));

    expect(
      await screen.findByRole("heading", {
        name: /sorry, chewbuu is for adults/i,
      })
    ).toBeVisible();
    expect(screen.getByText(/come back on/i)).toBeVisible();
  });

  it("limits the match age slider to 18-22 for under-21 members", async () => {
    const user = userEvent.setup();
    mocks.getProfile.mockResolvedValue({
      profile: {
        birthday: birthdayForAge(20),
      },
    });

    render(<OnboardingForm />);

    await screen.findByRole("heading", {
      name: /tell chewbuu who is going out/i,
    });
    await user.click(screen.getByRole("button", { name: "Preferences" }));

    expect(
      await screen.findByText(/limits matching to ages 18-22/i)
    ).toBeVisible();

    const allSliders = await screen.findAllByRole("slider", { hidden: true });
    const sliders = allSliders.filter((s) => s.getAttribute("max") !== "100");
    expect(sliders).toHaveLength(2);
    for (const slider of sliders) {
      expect(slider).toHaveAttribute("max", "22");
    }
  });

  it("starts match options at 23 for members 21 and up", async () => {
    const user = userEvent.setup();
    mocks.getProfile.mockResolvedValue({
      profile: {
        birthday: birthdayForAge(34),
      },
    });

    render(<OnboardingForm />);

    await screen.findByRole("heading", {
      name: /tell chewbuu who is going out/i,
    });
    await user.click(screen.getByRole("button", { name: "Preferences" }));

    expect(await screen.findByText(/match options start at 23/i)).toBeVisible();

    const allSliders = await screen.findAllByRole("slider", { hidden: true });
    const sliders = allSliders.filter((s) => s.getAttribute("max") !== "100");
    expect(sliders).toHaveLength(2);
    for (const slider of sliders) {
      expect(slider).toHaveAttribute("min", "23");
    }
  });
});
