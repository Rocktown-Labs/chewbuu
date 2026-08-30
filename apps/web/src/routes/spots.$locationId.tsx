import { createFileRoute } from "@tanstack/react-router";

import { PublicSpotPage } from "@/features/spots/public-spot-page";

export const Route = createFileRoute("/spots/$locationId")({
  component: PublicSpotRoute,
  ssr: false,
});

function PublicSpotRoute() {
  const { locationId } = Route.useParams();
  return <PublicSpotPage placeId={locationId} />;
}
