import { createFileRoute } from "@tanstack/react-router";

import { MePage } from "../me";

export const Route = createFileRoute("/_auth/me/recaps")({
  component: () => <MePage initialTab="recaps" />,
});
