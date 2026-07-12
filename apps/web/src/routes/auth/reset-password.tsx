import { createFileRoute } from "@tanstack/react-router";

import { Auth } from "@/components/auth/auth";

const RouteComponent = () => (
  <main className="grid min-h-full place-items-center px-4 py-10">
    <Auth className="shadow-xl shadow-primary/10" view="resetPassword" />
  </main>
);

export const Route = createFileRoute("/auth/reset-password")({
  component: RouteComponent,
});
