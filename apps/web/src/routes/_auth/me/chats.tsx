import { createFileRoute } from "@tanstack/react-router";

import { MePage } from "../me";

export const Route = createFileRoute("/_auth/me/chats")({
  component: () => <MePage initialTab="chats" />,
});
