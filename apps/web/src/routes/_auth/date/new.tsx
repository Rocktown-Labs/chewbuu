import { createFileRoute } from "@tanstack/react-router";

import { DateWizard } from "@/features/date-wizard/date-wizard";
import type { DatePlace } from "@/lib/dating-api";

export const Route = createFileRoute("/_auth/date/new")({
  component: RouteComponent,
  validateSearch: (
    search: Record<string, unknown>
  ): { placeId?: string; placeName?: string } => ({
    placeId: typeof search.placeId === "string" ? search.placeId : undefined,
    placeName:
      typeof search.placeName === "string" ? search.placeName : undefined,
  }),
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { placeId, placeName } = Route.useSearch();

  const presetPlace: DatePlace | undefined =
    placeId && placeName ? { name: placeName, placeId, types: [] } : undefined;

  return (
    <DateWizard
      membershipTier={session.data?.user.membershipTier ?? "social"}
      presetPlace={presetPlace}
    />
  );
}
