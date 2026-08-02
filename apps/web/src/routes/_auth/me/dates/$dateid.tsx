import { createFileRoute } from "@tanstack/react-router";

import { MePage } from "../../me";

export const Route = createFileRoute("/_auth/me/dates/$dateid")({
  component: RouteComponent,
});

function RouteComponent() {
  const { dateid } = Route.useParams();

  return <MePage initialDateId={dateid} initialTab="matches" />;
}
