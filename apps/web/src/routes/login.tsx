import { Navigate, createFileRoute } from "@tanstack/react-router";

const RouteComponent = () => <Navigate replace to="/auth/sign-in" />;

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});
