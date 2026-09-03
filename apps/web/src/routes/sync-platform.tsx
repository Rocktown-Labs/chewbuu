import { Badge } from "@chewbuu/ui/components/badge";
import { buttonVariants } from "@chewbuu/ui/components/button";
import { Card, CardContent } from "@chewbuu/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  CalendarHeart,
  Check,
  ChefHat,
  ClipboardList,
  Flame,
  LayoutDashboard,
  Percent,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";

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

const SYNC_TIERS = [
  {
    badge: "Independent & Neighborhood",
    buttonText: "Start with Sync 50",
    description:
      "Full operational software suite for neighborhood cafes, bars, and independent bistros.",
    features: [
      "Table & floor map management with real-time dining seat states",
      "Full order taking and digital ticket lifecycle",
      "Kitchen Display System (KDS) tickets & cook timers",
      "Shift scheduling, shift swaps & manager approvals",
      "3-digit HMAC attendance kiosk & break tracking",
      "Isolated internal staff work chat (sync_staff)",
      "Guest dining CRM (visit history, VIP notes, party size)",
      "Public /spots/:handle listing & basic specials posting",
      "5% platform fee on in-app F&B dining transactions",
    ],
    id: "sync_50",
    maxStaffText: "Up to 50 active staff members",
    name: "Sync 50",
    popular: false,
    priceAnnual: 59,
    priceMonthly: 69,
  },
  {
    badge: "High-Volume & Multi-Shift",
    buttonText: "Start with Sync 100",
    description:
      "For busy restaurants and multi-station venues needing higher team capacity and kitchen routing.",
    features: [
      "Everything in Sync 50 included",
      "Up to 100 active staff members across all shifts",
      "Multi-station KDS routing (separate Bar, Hot Line, Prep)",
      "Advanced operational bottleneck analytics & table turnover pacing",
      "1 free Chewbuu Spotlight promotion included per month ($49 value)",
      "In-app local job listings board & applicant review pipeline",
      "Priority customer & technical support",
    ],
    id: "sync_100",
    maxStaffText: "Up to 100 active staff members",
    name: "Sync 100",
    popular: true,
    priceAnnual: 119,
    priceMonthly: 139,
  },
  {
    badge: "Hospitality Groups & Chains",
    buttonText: "Start with Enterprise",
    description:
      "For multi-unit groups requiring brand-level oversight, cross-branch staff, and custom integrations.",
    features: [
      "Everything in Sync 100 included",
      "Unlimited active staff across all shifts and seasons",
      "Centralized multi-location brand portal with unified organization",
      "Distinct location menus, pricing overrides & operating schedules",
      "Cross-location staff borrowing and schedule transfers",
      "Enterprise payroll & tip pool export integrations",
      "Guaranteed priority placement in Spots discovery & 99.9% uptime SLA",
      "Dedicated hospitality account manager",
    ],
    id: "sync_enterprise",
    maxStaffText: "Unlimited active staff members",
    name: "Sync Enterprise",
    popular: false,
    priceAnnual: 219,
    priceMonthly: 249,
  },
] as const;

const SPOTLIGHT_OFFERS = [
  {
    badge: "Most Popular for Weekends",
    description:
      "Pin your restaurant to the top of Explore Spots and Date Wizard recommendations for couples in your area.",
    duration: "7 days placement",
    features: [
      "Pinned to #1 in local Spots feed within 10 miles",
      "Featured placement in Date Wizard venue suggestions",
      "Warm gold 'Spotlight Partner' glow badge on your spot card",
      "Guaranteed visibility to couples planning upcoming date nights",
    ],
    icon: Flame,
    id: "spotlight_venue",
    name: "Spotlight Venue",
    price: "$49",
    priceSuffix: "/ week",
  },
  {
    badge: "Event & Entertainment Booster",
    description:
      "Drive daters to high-energy happenings: live jazz, trivia nights, wine pairings, and chef tastings.",
    duration: "Single event or 4-pack",
    features: [
      "Featured on dater home screen & 'What's Happening This Weekend'",
      "Prioritized in Date Wizard 'Play & Drink' date activity pickers",
      "Custom date tag (e.g. 'Live Jazz Tonight', 'Trivia Thursday')",
      "Bundle: $29 for single event or $89 for a monthly 4-event series",
    ],
    icon: CalendarHeart,
    id: "spotlight_event",
    name: "Spotlight Event",
    price: "$29",
    priceSuffix: "/ event",
  },
  {
    badge: "Happy Hour & Off-Peak Boost",
    description:
      "Fill empty seats on slow Tuesdays and Thursdays by pushing food & drink specials to active daters nearby.",
    duration: "3 days boost",
    features: [
      "Top placement in the in-app '⭐ Specials' tab",
      "Spotlight badge on the special with price highlight",
      "One-tap 'Plan date here' action button for daters",
      "Push badge to daters who saved or favorited your venue",
    ],
    icon: Tag,
    id: "special_boost",
    name: "Special Boost",
    price: "$19",
    priceSuffix: "/ 3 days",
  },
] as const;

const SYNC_FAQS = [
  {
    question: "How do the staff headcount tiers work?",
    answer:
      "All Chewbuu Sync tiers include our full operational software suite: table management, order taking, KDS tickets, shift scheduling, 3-digit HMAC attendance kiosk, and team chat. You choose your tier based on how many active staff members you schedule: Sync 50 covers up to 50 staff ($69/mo), Sync 100 covers up to 100 staff ($139/mo), and Sync Enterprise provides unlimited staff for hospitality groups ($249/mo).",
  },
  {
    question: "What is the 5% in-app transaction fee?",
    answer:
      "When daters discover your venue and pay their check in the Chewbuu app via Stripe Connect, a 5% platform fee applies strictly to the food and beverage subtotal. Tips go 100% to your staff and taxes pass through 100% fee-free to your tax account. We charge $0 for reservations booked directly or checks paid in cash or standard card at the table.",
  },
  {
    question:
      "What is Chewbuu Spotlight and how does it help fill slow nights?",
    answer:
      "Chewbuu Spotlight allows partner venues to promote their restaurant, date-night events, or daily specials directly to active daters planning nights out nearby. Venues can buy a Spotlight Venue placement for $49/week, boost a live event (like jazz or trivia) for $29, or boost a daily happy hour or food special for $19. Sync 100 subscribers receive 1 free Spotlight promotion every month.",
  },
  {
    question: "Can I manage more than one location?",
    answer:
      "Yes. Sync models organizations and physical locations separately. With Sync Enterprise, hospitality groups get a centralized brand portal to manage distinct menus, pricing, tables, and staff per branch, plus cross-location staff borrowing.",
  },
  {
    question: "What does free to start mean?",
    answer:
      "You can create an account, claim or add your venue, build your menu, and configure your tables without entering a credit card. You only choose a Sync subscription tier once you are ready to put the system into live service with your team.",
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
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly"
  );

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

      {/* Headcount-Based Sync Plans */}
      <section className="border-b-8 border-border bg-background px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="border-primary/30 bg-primary/10 text-primary">
              <Store data-icon="inline-start" /> Headcount-based plans
            </Badge>
            <h2 className="mt-4 text-balance font-black text-3xl tracking-tight sm:text-5xl">
              All the tools. Sized for your staff, not your feature wishlist.
            </h2>
            <p className="mt-4 text-muted-foreground text-base leading-7 sm:text-lg">
              Every tier includes our full operational software suite—table
              maps, KDS tickets, shift schedules, and team chat. Choose the
              capacity your team needs.
            </p>

            {/* Billing Toggle */}
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 p-1.5">
              <button
                className={`rounded-full px-5 py-2 text-xs font-bold transition cursor-pointer ${
                  billingInterval === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setBillingInterval("monthly")}
                type="button"
              >
                Monthly billing
              </button>
              <button
                className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold transition cursor-pointer ${
                  billingInterval === "annual"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setBillingInterval("annual")}
                type="button"
              >
                <span>Annual billing</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
                  Save ~15%
                </span>
              </button>
            </div>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {SYNC_TIERS.map((tier) => {
              const price =
                billingInterval === "annual"
                  ? tier.priceAnnual
                  : tier.priceMonthly;

              return (
                <Card
                  className={`flex flex-col justify-between overflow-hidden rounded-3xl border transition ${
                    tier.popular
                      ? "border-primary shadow-2xl shadow-primary/15 ring-2 ring-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                  key={tier.id}
                >
                  <div>
                    <div
                      className={`p-6 sm:p-8 ${
                        tier.popular
                          ? "bg-primary text-primary-foreground"
                          : "border-b border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className={`text-xs font-bold uppercase tracking-wider ${
                              tier.popular
                                ? "text-primary-foreground/80"
                                : "text-primary"
                            }`}
                          >
                            {tier.badge}
                          </p>
                          <h3 className="mt-1 font-black text-2xl sm:text-3xl">
                            {tier.name}
                          </h3>
                        </div>
                        {tier.popular ? (
                          <Badge className="border-primary-foreground/30 bg-primary-foreground/20 text-primary-foreground font-bold text-xs">
                            Most Popular
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-6 flex items-baseline gap-1">
                        <span className="font-black text-5xl tracking-tight">
                          ${price}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            tier.popular
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground"
                          }`}
                        >
                          /mo
                        </span>
                      </div>
                      <p
                        className={`mt-2 font-bold text-sm ${
                          tier.popular
                            ? "text-primary-foreground/90"
                            : "text-foreground"
                        }`}
                      >
                        {tier.maxStaffText}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          tier.popular
                            ? "text-primary-foreground/75"
                            : "text-muted-foreground"
                        }`}
                      >
                        {billingInterval === "annual"
                          ? "Billed annually"
                          : "Billed monthly"}
                      </p>
                    </div>

                    <CardContent className="p-6 sm:p-8">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {tier.description}
                      </p>

                      <div className="mt-6 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Included capabilities:
                        </p>
                        <ul className="space-y-2.5">
                          {tier.features.map((feature) => (
                            <li
                              className="flex items-start gap-2.5 text-sm"
                              key={feature}
                            >
                              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                              <span className="text-foreground/90 leading-tight">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-6 pt-0 sm:p-8 sm:pt-0">
                    <SyncCta location={`sync_tier_${tier.id}`}>
                      {tier.buttonText}
                    </SyncCta>
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
            Venue onboarding and operational setup are free to explore.
            Subscription billing activates only when your venue turns on live
            service.
          </p>
        </div>
      </section>

      {/* Chewbuu Spotlight Promotion Suite */}
      <section className="border-b-8 border-border bg-muted/20 px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles data-icon="inline-start" /> Chewbuu Spotlight
            </Badge>
            <h2 className="mt-4 text-balance font-black text-3xl tracking-tight sm:text-5xl">
              Turn slow nights into busy date nights.
            </h2>
            <p className="mt-4 text-muted-foreground text-base leading-7 sm:text-lg">
              No generic ads. Chewbuu Spotlight packages put your venue, live
              events, and daily specials directly in front of couples actively
              planning their next night out.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {SPOTLIGHT_OFFERS.map(
              ({
                badge,
                description,
                duration,
                features,
                icon: Icon,
                id,
                name,
                price,
                priceSuffix,
              }) => (
                <article
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 sm:p-8 transition hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5"
                  key={id}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid size-12 place-items-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Icon className="size-6" />
                      </span>
                      <Badge
                        className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold"
                        variant="outline"
                      >
                        {badge}
                      </Badge>
                    </div>

                    <h3 className="mt-6 font-black text-2xl">{name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-black text-4xl text-foreground">
                        {price}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {priceSuffix}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {duration}
                    </p>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                      {description}
                    </p>

                    <div className="mt-6 border-t border-border/80 pt-5 space-y-2.5">
                      {features.map((feat) => (
                        <div
                          className="flex items-start gap-2 text-xs sm:text-sm text-foreground/85"
                          key={feat}
                        >
                          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <Link
                      className={buttonVariants({
                        className: "w-full rounded-full font-bold",
                        size: "lg",
                        variant: "outline",
                      })}
                      onClick={() => {
                        markSyncOnboardingIntent();
                        trackMarketingEvent("cta_clicked", {
                          button_text: `Boost with ${name}`,
                          destination: "/venue-portal",
                          location: `sync_spotlight_${id}`,
                          product: "sync",
                        });
                      }}
                      to="/venue-portal"
                    >
                      Boost with {name}
                    </Link>
                  </div>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      {/* 5% In-App Platform Fee Breakdown */}
      <section className="border-b-8 border-border bg-background px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="border-primary/30 bg-primary/10 text-primary">
              <Percent data-icon="inline-start" /> Transparent marketplace
            </Badge>
            <h2 className="mt-4 text-balance font-black text-3xl tracking-tight sm:text-5xl">
              5% in-app dining fee. 100% pass-through for tips and taxes.
            </h2>
            <p className="mt-4 text-muted-foreground text-base leading-7 sm:text-lg">
              No 30% delivery app commissions. No per-cover booking penalties.
              When daters pay their tab in the Chewbuu app, our take-rate is
              predictable and fair.
            </p>
          </div>

          <div className="mt-12 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-10">
            <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div>
                <h3 className="font-black text-2xl">
                  Example check: $100 Food & Drink bill
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  On a $130 total credit card transaction ($100 food & beverage
                  + $10 municipal tax + $20 server tip):
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Chewbuu 5% Fee
                    </p>
                    <p className="mt-1 font-black text-2xl text-primary">
                      $5.00
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      5% strictly on F&B subtotal
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Staff Tip Pass-Through
                    </p>
                    <p className="mt-1 font-black text-2xl text-emerald-600">
                      $20.00
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      100% to servers & kitchen ($0 fee)
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Taxes & Venue Net
                    </p>
                    <p className="mt-1 font-black text-2xl text-foreground">
                      $105.00
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      $10 tax to escrow + $95 net
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <h4 className="font-extrabold text-base">
                  Why venues prefer Chewbuu:
                </h4>
                <ul className="mt-4 space-y-3 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      <strong>High-margin dine-in seats:</strong> Brings paying
                      couples directly into your dining room instead of
                      discounted takeout.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      <strong>Zero hardware leases:</strong> Runs on standard
                      iPads and phones. No locked proprietary POS hardware
                      contracts.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      <strong>Instant payout settlement:</strong> Built on
                      Stripe Connect with automated tip allocation to staff bank
                      accounts.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
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
              "Free venue setup; plans start at $59 per month for up to 50 staff seats.",
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
