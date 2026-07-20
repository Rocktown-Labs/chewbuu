import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, HeartHandshake, Home } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export function NotFoundPage() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4 text-center">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
        <AlertCircle className="size-10" />
      </div>

      <h1 className="font-extrabold text-3xl text-foreground tracking-tight sm:text-4xl">
        Page Not Found
      </h1>

      <p className="mt-3 max-w-md font-medium text-muted-foreground text-sm sm:text-base">
        The page, profile, or date request you're looking for doesn't exist, has
        been removed, or is no longer available.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 font-medium text-foreground text-sm shadow-sm transition hover:bg-muted"
          onClick={() => navigate({ to: session ? "/me" : "/" })}
          type="button"
        >
          <ArrowLeft className="size-4" />
          Go Back
        </button>

        <Link
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground text-sm shadow-sm transition hover:bg-primary/90"
          to={session ? "/me" : "/"}
        >
          <Home className="size-4" />
          {session ? "Return to /me" : "Return Home"}
        </Link>
      </div>
    </div>
  );
}
