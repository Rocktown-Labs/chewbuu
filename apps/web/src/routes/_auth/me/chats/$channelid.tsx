import { createFileRoute } from "@tanstack/react-router";

import { MePage } from "../../me";

export const Route = createFileRoute("/_auth/me/chats/$channelid")({
  component: RouteComponent,
});

function RouteComponent() {
  const { channelid } = Route.useParams();

  return <MePage initialChatId={channelid} initialTab="chats" />;
}
