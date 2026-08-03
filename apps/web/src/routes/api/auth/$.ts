import { auth } from "@chewbuu/auth";
import { createFileRoute } from "@tanstack/react-router";

const handleAuth = ({ request }: { request: Request }) => auth.handler(request);

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
    },
  },
});
