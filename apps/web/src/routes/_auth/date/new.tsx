import { createFileRoute } from "@tanstack/react-router";

import { DateWizard } from "@/features/date-wizard/date-wizard";

export const Route = createFileRoute("/_auth/date/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  return (
    <DateWizard
      membershipTier={session.data?.user.membershipTier ?? "social"}
    />
  );
}
