import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingForm } from "./onboarding-form";
import { useOnboardingStore } from "./onboarding-store";

const mocks = vi.hoisted(() => ({
  createIdentityVerificationSession: vi.fn(),
  getIdentityVerificationStatus: vi.fn(),
  getProfile: vi.fn(),
  getPlans: vi.fn(),
  navigate: vi.fn(),
  routerInvalidate: vi.fn(),
  saveProfile: vi.fn(),
  saveProfileDraft: vi.fn(),
  suggestPlaces: vi.fn(),
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
    createIdentityVerificationSession: mocks.createIdentityVerificationSession,
    getIdentityVerificationStatus: mocks.getIdentityVerificationStatus,
    getProfile: mocks.getProfile,
    saveProfile: mocks.saveProfile,
    saveProfileDraft: mocks.saveProfileDraft,
    suggestPlaces: mocks.suggestPlaces,
  },
  getServerUrl: (url: string) => url,
  pricingApi: {
    getPlans: mocks.getPlans,
  },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    getSession: mocks.getProfile,
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
    if (typeof window !== "undefined") {
      window.location.hash = "";
    }
    localStorage.clear();
    useOnboardingStore.getState().clear();
    mocks.createIdentityVerificationSession.mockReset();
    mocks.getIdentityVerificationStatus.mockReset();
    mocks.getIdentityVerificationStatus.mockResolvedValue({
      id: "",
      status: "verified",
      url: "",
    });
    mocks.getProfile.mockResolvedValue({ profile: null });
    mocks.getPlans.mockResolvedValue({ plans: [] });
    mocks.navigate.mockReset();
    mocks.routerInvalidate.mockReset();
    mocks.saveProfile.mockReset();
    mocks.saveProfileDraft.mockReset();
    mocks.suggestPlaces.mockReset();
    mocks.suggestPlaces.mockResolvedValue({ places: [] });
  });

  it("renders the redesigned basics step with profile validation sections", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm />);

    expect(
      await screen.findByRole("heading", {
        name: /tell chewbuu who is going out/i,
      })
    ).toBeVisible();
    expect(screen.getByText("Contact & Handle")).toBeVisible();
    expect(screen.getByText("Personal Details & Location")).toBeVisible();
    expect(screen.getByText("Identity & Bio")).toBeVisible();

    await user.click(screen.getByText("Personal Details & Location"));
    expect(screen.getByLabelText(/area/i)).toBeVisible();

    await user.click(screen.getByText("Identity & Bio"));
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
    expect(screen.getByText("Camera")).toBeVisible();
    expect(screen.getByText("Microphone")).toBeVisible();
    expect(screen.getByText("Push Alerts")).toBeVisible();
    expect(screen.getByText("Location")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /enable all permissions/i })
    ).toBeVisible();
  });

  it("requires identity confirmation before opening media", async () => {
    const user = userEvent.setup();
    mocks.getIdentityVerificationStatus.mockResolvedValue({
      id: "",
      status: "not_started",
      url: "",
    });

    render(<OnboardingForm />);
    await screen.findByRole("heading", {
      name: /tell chewbuu who is going out/i,
    });

    await user.click(screen.getByRole("button", { name: "Identity" }));
    expect(
      await screen.findByRole("heading", {
        name: /confirm you’re a real person/i,
      })
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Media" }));
    expect(
      screen.getByRole("heading", { name: /confirm you’re a real person/i })
    ).toBeVisible();
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

    await user.click(screen.getByText("Intro Video"));
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

  it("saves progress and returns to the app from Save for later", async () => {
    const user = userEvent.setup();
    mocks.saveProfileDraft.mockResolvedValue({
      profile: null,
      readiness: {
        canDate: false,
        identityVerified: false,
        onboarded: false,
        pendingReviews: 0,
      },
    });

    render(<OnboardingForm />);
    await screen.findByRole("heading", {
      name: /tell chewbuu who is going out/i,
    });
    await user.click(screen.getByRole("button", { name: /save for later/i }));

    expect(mocks.saveProfileDraft).toHaveBeenCalledTimes(1);
    expect(mocks.routerInvalidate).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith({
      replace: true,
      to: "/me",
    });
  });

  it("treats interests as persistent category steps and saves favorite places", async () => {
    const user = userEvent.setup();
    mocks.suggestPlaces.mockResolvedValue({
      places: [
        {
          address: "Main Street",
          name: "Texas Roadhouse",
          placeId: "texas-roadhouse",
          types: ["restaurant"],
        },
      ],
    });

    render(<OnboardingForm />);
    await screen.findByRole("heading", {
      name: /tell chewbuu who is going out/i,
    });
    await user.click(screen.getByRole("button", { name: "Interests" }));
    expect(screen.getByText(/interest step 1 of 6/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Tacos" }));
    await user.click(
      screen.getByRole("button", { name: /search selected eat signals/i })
    );
    const place = await screen.findByRole("button", {
      name: /texas roadhouse/i,
    });
    await user.click(place);
    await user.click(screen.getByRole("button", { name: /next category/i }));
    await user.click(screen.getByRole("button", { name: "Eat (1)" }));

    expect(screen.getByText("Texas Roadhouse")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /remove texas roadhouse/i })
    ).toBeVisible();
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

    await user.click(screen.getByRole("button", { name: /^next$/i }));

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
