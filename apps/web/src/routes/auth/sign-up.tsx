import { createFileRoute, redirect } from "@tanstack/react-router";

import { Auth } from "@/components/auth/auth";
import { authClient } from "@/lib/auth-client";

const RouteComponent = () => (
  <main className="grid min-h-full place-items-center px-4 py-10">
    <section className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
      <div className="space-y-6">
        <img
          src="/brand/chewbuu-logo-500.png"
          alt="Chewbuu"
          className="h-24 w-24 rounded-3xl border border-border shadow-md"
        />
        <div className="max-w-xl space-y-4">
          <p className="font-semibold text-primary text-sm uppercase tracking-[0.18em]">
            Social is free.
          </p>
          <h1 className="text-balance font-semibold text-4xl leading-tight text-foreground md:text-6xl">
            Start with two real date plans a day.
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Upgrade later to Mingle or Sugar for bigger parties, more matching
            power, and premium date options.
          </p>
        </div>
      </div>
      <Auth
        className="shadow-xl shadow-primary/10"
        socialPosition="bottom"
        view="signUp"
      />
    </section>
  </main>
);

export const Route = createFileRoute("/auth/sign-up")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data?.user) {
      throw redirect({
        to: "/me",
      });
    }
  },
  component: RouteComponent,
});
