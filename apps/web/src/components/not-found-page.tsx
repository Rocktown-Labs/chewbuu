import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Compass, Home, Sparkles } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export function NotFoundPage() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  return (
    <main className="relative isolate grid min-h-[70vh] place-items-center overflow-hidden px-4 py-12 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_35%),radial-gradient(circle_at_bottom_right,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_30%)]"
      />
      <section className="w-full max-w-lg rounded-[2rem] border border-border bg-card/90 p-8 shadow-xl shadow-primary/10 backdrop-blur sm:p-10">
        <div className="mx-auto flex size-20 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10">
          <img
            alt="Chewbuu logo"
            className="size-14 rounded-2xl"
            src="/brand/chewbuu-logo-500.png"
          />
        </div>
        <p className="mt-6 font-bold text-primary text-xs uppercase tracking-[0.22em]">
          Chewbuu map check
        </p>
        <h1 className="mt-3 font-black text-3xl text-foreground tracking-tight sm:text-4xl">
          This date spot is off the map.
        </h1>
        <p className="mx-auto mt-4 max-w-md font-medium text-muted-foreground text-sm leading-6 sm:text-base">
          The page, profile, or date request may have moved. Let’s get you back
          to the people and plans that matter.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 font-bold text-foreground text-sm transition hover:bg-muted"
            onClick={() => navigate({ to: session ? "/me" : "/" })}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Take me back
          </button>

          <Link
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground text-sm shadow-lg shadow-primary/20 transition hover:bg-primary/90"
            to={session ? "/me" : "/"}
          >
            <Home aria-hidden="true" className="size-4" />
            {session ? "Open my Chewbuu" : "Find Chewbuu"}
          </Link>
        </div>
        <p className="mt-7 flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
          <Compass aria-hidden="true" className="size-3.5 text-primary" />
          <Sparkles aria-hidden="true" className="size-3.5 text-amber-400" />
          Real people. Real dates. Better directions.
        </p>
      </section>
    </main>
  );
}
