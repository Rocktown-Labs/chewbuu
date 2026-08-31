import { Badge } from "@chewbuu/ui/components/badge";
import { buttonVariants } from "@chewbuu/ui/components/button";
import { Card, CardContent } from "@chewbuu/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Check,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { trackMarketingEvent } from "@/lib/marketing-events";
import { OG_IMAGE_URL, getCanonicalUrl, SITE_NAME } from "@/lib/seo";
import { markSyncOnboardingIntent } from "@/lib/venue-onboarding-intent";

const SYNC_FEATURES = [
  {
    icon: Store,
    title: "One real venue profile",
    text: "Keep your address, hours, brand, menu, photos, specials, and guest-facing spot page in sync.",
  },
  {
    icon: ClipboardList,
    title: "A calmer service board",
    text: "Give hosts, servers, kitchen teams, and managers one shared view of the work in front of them.",
  },
  {
    icon: Users,
    title: "Your team in the loop",
    text: "Invite staff, assign roles and shifts, share updates, and keep venue conversations in the right room.",
  },
  {
    icon: BarChart3,
    title: "Better decisions after close",
    text: "Turn real reservations, orders, tips, and timeline events into useful operational signals.",
  },
] as const;

const SETUP_STEPS = [
  {
    number: "01",
    title: "Create your free account",
    text: "No card and no paid plan required to put your venue into the setup pipeline.",
  },
  {
    number: "02",
    title: "Find or add the real location",
    text: "Start with a Google Place match, then review the details. Chewbuu keeps the venue record canonical and editable.",
  },
  {
    number: "03",
    title: "Verify, build, and invite",
    text: "Complete representative verification, shape the public profile, add the menu, and invite the team.",
  },
  {
    number: "04",
    title: "Launch when you are ready",
    text: "Choose the Sync plan once your team is ready to operate with it. Until then, your setup stays free.",
  },
] as const;

const SYNC_FAQS = [
  {
    question: "Is Sync only for restaurants?",
    answer:
      "Restaurants are our first focus, but Sync is built around flexible venue data and workflows. Cafes, bars, activity spaces, and other guest-facing businesses can use the same location, team, menu, reservation, and service foundations.",
  },
  {
    question: "What does free to start mean?",
    answer:
      "You can create an account, submit a real venue, and work through the setup flow without entering a card. The intended Sync plan is $60 per month for up to 50 staff seats when you choose to activate paid operations.",
  },
  {
    question: "What happens to my venue data?",
    answer:
      "Your Chewbuu venue record is the source of truth. Discovery services can help find and prefill a place, while approved venue operators control the profile, menu, media, team, and operational data that guests see.",
  },
  {
    question: "Can I manage more than one location?",
    answer:
      "Yes. Sync models organizations and physical locations separately, so independent venues can start simply and growing groups can add locations without mixing their operating data. Expansion and enterprise pricing can be scoped as your footprint grows.",
  },
] as const;

const SyncCta = ({
  children,
  location,
}: {
  children: ReactNode;
  location: string;
}) => (
  <Link
    className={buttonVariants({ size: "lg" })}
    onClick={() => {
      markSyncOnboardingIntent();
      trackMarketingEvent("cta_clicked", {
        button_text: typeof children === "string" ? children : "Sync CTA",
        destination: "/venue-portal",
        location,
        product: "sync",
      });
    }}
    to="/venue-portal"
  >
    {children}
    <ArrowRight data-icon="inline-end" />
  </Link>
);

function SyncPlatformPage() {
  return (
    <main className="overflow-hidden bg-background text-foreground">
      <section className="relative isolate border-b-8 border-border bg-foreground px-5 py-20 text-background sm:px-8 sm:py-28 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 -z-10 size-[32rem] rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 -z-10 h-48 w-1/2 bg-primary/10 blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge className="border-primary/30 bg-primary/15 text-primary-foreground">
              <Store data-icon="inline-start" /> Chewbuu Sync for venues
            </Badge>
            <p className="mt-7 font-bold text-primary text-xs uppercase tracking-[0.24em]">
              The operating layer behind a great guest experience
            </p>
            <h1 className="mt-4 max-w-3xl text-balance font-black text-4xl leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
              Run the place behind every great night.
            </h1>
            <p className="mt-6 max-w-2xl text-background/75 text-lg leading-8 sm:text-xl">
              Sync connects your real venue profile, menu, team, guests, and
              service flow in one workspace—so the details guests discover are
              the details your team can actually deliver.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <SyncCta location="sync_hero">Start free venue setup</SyncCta>
              <a
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/20 px-6 font-bold text-background text-sm transition hover:bg-background/10"
                href="#how-it-works"
              >
                See how Sync works
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-background/60 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" /> Free to set up
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" /> No card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" /> Built for real teams
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2.5rem] border border-primary/20 bg-primary/10 blur-sm" />
            <Card className="relative overflow-hidden rounded-[2rem] border-background/15 bg-background/95 text-foreground shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <LayoutDashboard className="size-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Sync desk</p>
                    <p className="text-muted-foreground text-xs">
                      Tonight at your venue
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Live
                </Badge>
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Tables", "18", "open"],
                    ["Covers", "42", "tonight"],
                    ["Orders", "12", "in motion"],
                  ].map(([label, value, note]) => (
                    <div
                      className="rounded-2xl border border-border bg-muted/40 p-3"
                      key={label}
                    >
                      <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                        {label}
                      </p>
                      <p className="mt-2 font-black text-2xl">{value}</p>
                      <p className="mt-1 text-muted-foreground text-[10px]">
                        {note}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ChefHat className="size-4 text-primary" />
                      <p className="font-bold text-sm">Service board</p>
                    </div>
                    <span className="size-2 rounded-full bg-emerald-500" />
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      "Table 4 · ready to seat",
                      "Order 108 · preparing",
                      "Table 9 · check requested",
                    ].map((item, index) => (
                      <div
                        className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5 text-xs shadow-xs"
                        key={item}
                      >
                        <span className="grid size-5 place-items-center rounded-full bg-muted font-bold text-[9px]">
                          {index + 1}
                        </span>
                        <span className="font-semibold">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background">
                  <BadgeCheck className="size-5 text-primary" />
                  <div>
                    <p className="font-bold text-xs">
                      Your public spot stays current
                    </p>
                    <p className="mt-0.5 text-background/60 text-[10px]">
                      Menu, specials, photos, and details from one venue record.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-b-8 border-border bg-background px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="font-bold text-primary text-xs uppercase tracking-[0.2em]">
              One source of truth
            </p>
            <h2 className="mt-3 text-balance font-black text-3xl tracking-tight sm:text-5xl">
              Your venue should not live in five disconnected tabs.
            </h2>
            <p className="mt-4 text-muted-foreground text-base leading-7 sm:text-lg">
              Sync brings the public-facing place and the behind-the-scenes work
              closer together, without forcing every business into the same
              shape.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SYNC_FEATURES.map(({ icon: Icon, title, text }) => (
              <article
                className="rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                key={title}
              >
                <span className="grid size-11 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 font-extrabold text-lg">{title}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-6">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-b-8 border-border bg-muted/20 px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
        id="how-it-works"
      >
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="font-bold text-primary text-xs uppercase tracking-[0.2em]">
              A guided start
            </p>
            <h2 className="mt-3 text-balance font-black text-3xl tracking-tight sm:text-5xl">
              From “we should be on Chewbuu” to ready for service.
            </h2>
            <p className="mt-5 text-muted-foreground leading-7">
              We do not ask a venue operator to become a dating-app expert. The
              setup starts with the location, then moves through the checks and
              data that make Sync useful to the team and trustworthy to guests.
            </p>
            <div className="mt-8 rounded-3xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm leading-6">
                  <strong>Venue-controlled data:</strong> discovery can help
                  identify a place, but approved venue operators control what is
                  published and what the team uses to operate.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SETUP_STEPS.map(({ number, title, text }) => (
              <article
                className="rounded-3xl border border-border bg-card p-6"
                key={number}
              >
                <span className="font-mono font-black text-primary text-sm">
                  {number}
                </span>
                <h3 className="mt-8 font-extrabold text-lg">{title}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-6">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-8 border-border bg-background px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-bold text-primary text-xs uppercase tracking-[0.2em]">
              Start without the sales dance
            </p>
            <h2 className="mt-3 text-balance font-black text-3xl tracking-tight sm:text-5xl">
              Set up free. Pay when Sync is doing real work for your team.
            </h2>
            <p className="mt-4 text-muted-foreground leading-7">
              Get the location and profile right first. Activate the operating
              plan when your venue is ready to use the workspace day to day.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="overflow-hidden rounded-3xl border-primary/35 shadow-xl shadow-primary/10">
              <div className="bg-primary px-6 py-5 text-primary-foreground">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-2xl">Sync Core</p>
                    <p className="mt-1 text-primary-foreground/75 text-sm">
                      The starting plan for a working venue team
                    </p>
                  </div>
                  <Badge className="border-primary-foreground/20 bg-primary-foreground/15 text-primary-foreground">
                    Planned offer
                  </Badge>
                </div>
                <p className="mt-7 font-black text-5xl">
                  $60<span className="font-bold text-lg">/mo</span>
                </p>
                <p className="mt-1 text-primary-foreground/75 text-sm">
                  includes up to 50 staff seats
                </p>
              </div>
              <CardContent className="p-6">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {[
                    "Venue profile and public spot page",
                    "Menus, modifiers, photos, and specials",
                    "Reservations, tables, and service board",
                    "Staff roles, invitations, shifts, and chat",
                    "Guest, order, kitchen, and tip workflows",
                    "Operational events and venue analytics",
                  ].map((feature) => (
                    <li className="flex gap-2 text-sm" key={feature}>
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <SyncCta location="sync_pricing">
                    Build my venue for free
                  </SyncCta>
                  <Link
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                    })}
                    onClick={() => {
                      markSyncOnboardingIntent();
                      trackMarketingEvent("cta_clicked", {
                        button_text: "I am helping a venue",
                        destination: "/venue-portal",
                        location: "sync_pricing",
                        product: "sync",
                      });
                    }}
                    to="/venue-portal"
                  >
                    I am helping a venue
                  </Link>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col justify-center rounded-3xl border border-border bg-muted/30 p-6 sm:p-8">
              <Sparkles className="size-6 text-primary" />
              <h3 className="mt-5 font-black text-2xl">
                Growing past one location?
              </h3>
              <p className="mt-3 text-muted-foreground text-sm leading-6">
                Sync keeps organizations and locations separate, so your next
                branch can have its own menu, staff, hours, tables, and
                operating data. Ask us about expansion and enterprise pricing
                when you are ready.
              </p>
              <Link
                className="mt-6 inline-flex items-center gap-2 font-bold text-primary text-sm hover:underline"
                onClick={() => {
                  markSyncOnboardingIntent();
                  trackMarketingEvent("cta_clicked", {
                    button_text: "Start with one real location",
                    destination: "/venue-portal",
                    location: "sync_expansion",
                    product: "sync",
                  });
                }}
                to="/venue-portal"
              >
                Start with one real location <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-center text-muted-foreground text-xs leading-5">
            Pricing shown is the intended Sync Core offer and may be finalized
            as paid billing is enabled. Venue setup remains free for now; no
            payment is collected by this page.
          </p>
        </div>
      </section>

      <section className="border-b-8 border-border bg-muted/20 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="font-bold text-primary text-xs uppercase tracking-[0.2em]">
              Questions operators ask
            </p>
            <h2 className="mt-3 text-balance font-black text-3xl tracking-tight sm:text-5xl">
              Clear before you commit.
            </h2>
          </div>
          <div className="mt-10 grid gap-3">
            {SYNC_FAQS.map(({ question, answer }) => (
              <details
                className="group rounded-2xl border border-border bg-card p-5 open:shadow-sm"
                key={question}
              >
                <summary className="cursor-pointer list-none pr-6 font-extrabold text-sm marker:hidden sm:text-base">
                  <span className="relative after:absolute after:right-0 after:top-1/2 after:text-primary after:content-['+'] after:-translate-y-1/2 after:text-xl group-open:after:content-['−']">
                    {question}
                  </span>
                </summary>
                <p className="mt-4 border-t border-border/60 pt-4 text-muted-foreground text-sm leading-6">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary px-5 py-16 text-center text-primary-foreground sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <p className="font-bold text-primary-foreground/70 text-xs uppercase tracking-[0.2em]">
            Your venue, your data, your next shift
          </p>
          <h2 className="mt-3 text-balance font-black text-3xl tracking-tight sm:text-5xl">
            Give your team one place to make the night work.
          </h2>
          <p className="mt-4 text-primary-foreground/75 leading-7">
            Create your free account and start with the location you actually
            operate.
          </p>
          <div className="mt-8 flex justify-center">
            <SyncCta location="sync_final_cta">Start free venue setup</SyncCta>
          </div>
        </div>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/sync-platform")({
  component: SyncPlatformPage,
  head: () => ({
    links: [{ href: getCanonicalUrl("/sync-platform"), rel: "canonical" }],
    meta: [
      {
        title: `${SITE_NAME} Sync | Venue operations for real teams`,
      },
      {
        name: "description",
        content:
          "Chewbuu Sync helps restaurants and guest-facing venues manage their real profile, menu, team, reservations, orders, and service operations. Start free.",
      },
      { property: "og:url", content: getCanonicalUrl("/sync-platform") },
      {
        property: "og:title",
        content: `${SITE_NAME} Sync | Venue operations for real teams`,
      },
      {
        property: "og:description",
        content:
          "Set up your real venue for free, then run menus, teams, reservations, orders, and service from one Sync workspace.",
      },
      { property: "og:image", content: OG_IMAGE_URL },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          applicationCategory: "BusinessApplication",
          description:
            "Venue operations software for restaurants and guest-facing businesses.",
          name: `${SITE_NAME} Sync`,
          offers: {
            "@type": "Offer",
            description:
              "Free venue setup; the intended Sync Core plan is $60 per month for up to 50 staff seats.",
            price: "0",
            priceCurrency: "USD",
          },
          operatingSystem: "Web",
          url: getCanonicalUrl("/sync-platform"),
        }),
      },
    ],
  }),
});
