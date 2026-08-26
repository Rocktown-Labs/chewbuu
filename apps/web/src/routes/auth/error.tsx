import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, House, Link2, Sparkles } from "lucide-react";
import { z } from "zod";

const authErrorSearchSchema = z.object({
  error: z.string().optional(),
});

const DEFAULT_ERROR_COPY = {
  body: "We hit a small snag while getting your sign-in ready. Your account is safe—give it another try or head back to Chewbuu.",
  title: "A quick detour before your next date",
};

const ERROR_COPY: Record<string, { body: string; title: string }> = {
  access_denied: {
    body: "The sign-in window closed before we could finish. You can try again whenever you're ready.",
    title: "The sign-in window took a rain check",
  },
  account_not_linked: {
    body: "That Google account is already connected to another Chewbuu account. Sign in with the account that already uses Google, then manage your connected sign-ins from Profile.",
    title: "That Google account is already connected",
  },
};

const AuthErrorPage = () => {
  const { error } = Route.useSearch();
  const copy = (error && ERROR_COPY[error]) || DEFAULT_ERROR_COPY;

  return (
    <main className="relative isolate grid min-h-[calc(100svh-5rem)] place-items-center overflow-hidden px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_35%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_35%,transparent)_1px,transparent_1px)] bg-[size:3rem_3rem]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-border bg-card/95 p-6 text-center shadow-2xl shadow-primary/10 backdrop-blur sm:p-10">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-fuchsia-400 to-amber-300"
        />
        <div className="mx-auto flex size-20 items-center justify-center rounded-[1.5rem] border border-primary/20 bg-primary/10 shadow-inner shadow-primary/10">
          <img
            alt="Chewbuu logo"
            className="size-14 rounded-2xl"
            src="/brand/chewbuu-logo-500.png"
          />
        </div>

        <p className="mt-7 font-bold text-primary text-xs uppercase tracking-[0.22em]">
          Chewbuu sign-in check
        </p>
        <h1 className="mx-auto mt-3 max-w-lg text-balance font-black text-3xl text-foreground tracking-tight sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground text-sm leading-6 sm:text-base">
          {copy.body}
        </p>

        {error && (
          <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 font-mono text-muted-foreground text-xs">
            <Link2 aria-hidden="true" className="size-3.5 text-primary" />
            Reference: {error}
          </p>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground text-sm shadow-lg shadow-primary/20 transition hover:bg-primary/90"
            to="/auth/sign-in"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Try sign-in again
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-6 font-bold text-foreground text-sm transition hover:bg-muted"
            to="/"
          >
            <House aria-hidden="true" className="size-4" />
            Back to Chewbuu
          </Link>
        </div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
          <Sparkles aria-hidden="true" className="size-3.5 text-amber-400" />
          Real people. Real dates. No account left behind.
        </p>
      </section>
    </main>
  );
};

export const Route = createFileRoute("/auth/error")({
  component: AuthErrorPage,
  validateSearch: authErrorSearchSchema,
});
