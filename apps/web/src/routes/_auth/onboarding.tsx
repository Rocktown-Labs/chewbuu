import { createFileRoute } from "@tanstack/react-router";

import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export const Route = createFileRoute("/_auth/onboarding")({
  component: OnboardingForm,
});
