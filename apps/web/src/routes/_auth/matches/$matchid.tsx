import { createFileRoute } from "@tanstack/react-router";

import { StreamMatchRoom } from "@/features/stream/stream-match-room";

export const Route = createFileRoute("/_auth/matches/$matchid")({
  component: MatchRoomRoute,
});

function MatchRoomRoute() {
  const { matchid } = Route.useParams();

  return <StreamMatchRoom matchId={matchid} />;
}
