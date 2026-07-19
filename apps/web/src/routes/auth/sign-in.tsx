import { createFileRoute, redirect } from "@tanstack/react-router";

import { Auth } from "@/components/auth/auth";
import { authClient } from "@/lib/auth-client";

const AuthPage = ({ view }: { view: "signIn" }) => (
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
            Real People, Real Dates, Real Results.
          </p>
          <h1 className="text-balance font-semibold text-4xl leading-tight text-foreground md:text-6xl">
            Meet for something worth showing up for.
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Chewbuu helps singles, friends, couples, and circles plan real dates
            around food, drinks, games, events, and quick video-first intros.
          </p>
        </div>
      </div>
      <Auth
        className="shadow-xl shadow-primary/10"
        socialPosition="bottom"
        view={view}
      />
    </section>
  </main>
);

const RouteComponent = () => <AuthPage view="signIn" />;

export const Route = createFileRoute("/auth/sign-in")({
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
