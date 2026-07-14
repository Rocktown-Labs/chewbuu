import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/login",
      });
    }
    const { user } = session.data;
    const needsOnboarding = !user.hasCompletedOnboarding;

    if (needsOnboarding && location.pathname !== "/onboarding") {
      throw redirect({
        to: "/onboarding",
      });
    }

    return { session };
  },
  component: AuthLayout,
  ssr: false,
});

function AuthLayout() {
  return <Outlet />;
}
