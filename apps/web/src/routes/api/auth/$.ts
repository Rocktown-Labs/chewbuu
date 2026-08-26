import { auth } from "@chewbuu/auth";
import { createFileRoute } from "@tanstack/react-router";

const handleAuth = ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname.endsWith("/api/auth/error")) {
    const errorUrl = new URL("/auth/error", url.origin);
    const errorCode = url.searchParams.get("error");
    if (errorCode) {
      errorUrl.searchParams.set("error", errorCode);
    }
    return Response.redirect(errorUrl, 302);
  }

  return auth.handler(request);
};

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
    },
  },
});
