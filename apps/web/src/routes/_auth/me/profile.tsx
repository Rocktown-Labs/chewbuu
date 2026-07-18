import { createFileRoute } from "@tanstack/react-router";

import { MePage } from "../me";

export const Route = createFileRoute("/_auth/me/profile")({
  component: () => <MePage initialTab="profile" />,
});
