import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CalendarHeart,
  MapPin,
  MessagesSquare,
  Sparkles,
  Utensils,
} from "lucide-react";

const DATE_FLOW = [
  {
    icon: Utensils,
    label: "Eat, drink, or play",
    text: "Pick the kind of date and the spots that feel right.",
  },
  {
    icon: CalendarHeart,
    label: "Choose when",
    text: "Set the date, time, party size, and who pays.",
  },
  {
    icon: MapPin,
    label: "Select three places",
    text: "Use places that match the mood before Chewbuu finds people.",
  },
  {
    icon: MessagesSquare,
    label: "Meet by video first",
    text: "Send intros and video replies before text chat opens.",
  },
] as const;

const HomeComponent = () => (
  <main className="overflow-hidden">
    <section className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl gap-10 px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-16">
      <div className="space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-4 py-2 font-medium text-primary text-sm shadow-sm">
          <Sparkles aria-hidden="true" className="size-4" />
          Social dating with actual plans
        </div>
        <div className="max-w-3xl space-y-5">
          <h1 className="text-balance font-semibold text-5xl leading-[1.02] text-foreground md:text-7xl">
            Real People, Real Dates, Real Results.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
            Chewbuu gets people off endless swiping and onto food, drinks,
            games, events, and shared moments that produce real memories.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md shadow-primary/15 transition hover:bg-primary/90"
            to="/auth/sign-up"
          >
            Start on Social
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 font-semibold text-foreground transition hover:bg-accent"
            to="/auth/sign-in"
          >
            Sign in
          </Link>
        </div>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-[440px]">
        <div className="absolute inset-0 rounded-[2rem] bg-secondary" />
        <img
          src="/brand/chewbuu-logo-500.png"
          alt="Chewbuu logo"
          className="relative h-full w-full rounded-[2rem] object-cover shadow-2xl shadow-primary/10"
        />
      </div>
    </section>

    <section className="border-border/70 border-t bg-card/50 py-12">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 md:grid-cols-4">
        {DATE_FLOW.map(({ icon: Icon, label, text }) => (
          <article
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
            key={label}
          >
            <Icon aria-hidden="true" className="mb-4 size-5 text-primary" />
            <h2 className="font-semibold text-base">{label}</h2>
            <p className="mt-2 text-muted-foreground text-sm">{text}</p>
          </article>
        ))}
      </div>
    </section>
  </main>
);

export const Route = createFileRoute("/")({
  component: HomeComponent,
});
