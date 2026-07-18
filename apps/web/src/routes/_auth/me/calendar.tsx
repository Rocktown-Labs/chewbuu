import { createFileRoute } from "@tanstack/react-router";

import { MePage } from "../me";

export const Route = createFileRoute("/_auth/me/calendar")({
  component: () => <MePage initialTab="calendar" />,
});
