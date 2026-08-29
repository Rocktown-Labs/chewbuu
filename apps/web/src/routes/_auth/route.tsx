import { api as blocksApi } from "@chewbuu/aws-blocks";
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
    const isSpotsRoute = location.pathname.startsWith("/me/spots/");

    if (needsOnboarding) {
      const canViewIncompleteDashboard =
        location.pathname === "/me" ||
        location.pathname === "/me/profile" ||
        isSpotsRoute;
      if (!canViewIncompleteDashboard && location.pathname !== "/onboarding") {
        throw redirect({
          to: "/onboarding",
        });
      }
    } else {
      const isProfileRoute =
        location.pathname === "/me" ||
        location.pathname === "/me/profile" ||
        isSpotsRoute;
      if (!isProfileRoute && location.pathname !== "/onboarding") {
        const profileResult = await blocksApi.getProfile();
        const { profile } = profileResult;
        const hasLocation = Boolean(
          profile?.area && profile.latitude && profile.longitude
        );
        if (!hasLocation) {
          throw redirect({
            to: "/me/profile",
            search: { tab: "profile" },
          });
        }
      }
    }

    return { session };
  },
  component: AuthLayout,
  ssr: false,
});

function AuthLayout() {
  return <Outlet />;
}
