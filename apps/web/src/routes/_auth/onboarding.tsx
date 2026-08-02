import { createFileRoute, redirect } from "@tanstack/react-router";

import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export const Route = createFileRoute("/_auth/onboarding")({
  beforeLoad: ({ context }) => {
    if (context.session.data?.user.hasCompletedOnboarding) {
      throw redirect({ to: "/me/profile" });
    }
  },
  component: OnboardingForm,
});
