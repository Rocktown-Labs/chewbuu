import { createLazyFileRoute, getRouteApi } from "@tanstack/react-router";

import { StreamMatchRoom } from "@/features/stream/stream-match-room";

const routeApi = getRouteApi("/_auth/matches/$matchid");

export const Route = createLazyFileRoute("/_auth/matches/$matchid")({
  component: MatchRoomRoute,
});

function MatchRoomRoute() {
  const { matchid } = routeApi.useParams();

  return <StreamMatchRoom matchId={matchid} />;
}
