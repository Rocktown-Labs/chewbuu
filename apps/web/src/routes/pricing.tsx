import { Badge } from "@chewbuu/ui/components/badge";
import { buttonVariants } from "@chewbuu/ui/components/button";
import { Card, CardContent } from "@chewbuu/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CreditCard,
  Crown,
  HeartHandshake,
  Percent,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { useState } from "react";

import { getCanonicalUrl } from "@/lib/seo";

const CONSUMER_PLANS = [
  {
    badge: "Free Forever",
    description:
      "Discover verified restaurants, explore daily specials, and plan Dutch dates with singles and friends.",
    features: [
      "Browse curated local restaurant spots & menus",
      "Discover daily specials, discounts, and happy hours",
      "Plan up to 2 dates per day",
      "Solo date planning with locked Dutch payment",
      "Basic profile and photo verification",
    ],
    id: "social",
    name: "Social",
    popular: false,
    annualEquivalent: 0,
    annualTotal: 0,
    priceMonthly: 0,
    priceSuffix: "free",
    tagline: "Explore the dining scene",
  },
  {
    badge: "Most Popular",
    description:
      "Go on group double dates, coordinate social circles, and unlock priority matching signals.",
    features: [
      "Group dates & double dates (up to 4 people)",
      "Invite friends and build private dining circles",
      "Match with other friend groups and parties",
      "Plan up to 8 dates per day",
      "Priority discovery in local neighborhood feeds",
      "Includes all Social tier capabilities",
    ],
    id: "mingle",
    name: "Mingle",
    popular: true,
    annualEquivalent: 15.83,
    annualTotal: 190,
    priceMonthly: 19,
    priceSuffix: "/mo",
    tagline: "Social dining with friend circles",
  },
  {
    badge: "VIP Host",
    description:
      "Treat your date, reserve premier tables, bypass public matching pools, and send direct invitations.",
    features: [
      "Host & cover the dining check (Dutch optional)",
      "Send direct date invitations to specific members",
      "Direct reservation locks at partner venues",
      "Plan up to 24 dates per day",
      "Distinctive VIP Host gold badge on profile",
      "Customer support for billing and account questions",
      "Includes all Mingle & Social capabilities",
    ],
    id: "host",
    name: "Host",
    popular: false,
    annualEquivalent: 32.5,
    annualTotal: 390,
    priceMonthly: 39,
    priceSuffix: "/mo",
    tagline: "Premier table hosting & invitations",
  },
];

const getAnnualSavings = (monthlyPrice: number, annualTotal: number) =>
  Math.round((1 - annualTotal / (monthlyPrice * 12)) * 100);

const formatPrice = (price: number) =>
  Number.isInteger(price) ? String(price) : price.toFixed(2);

const VENUE_TIERS = [
  {
    badge: "Neighborhood",
    features: [
      "Up to 50 active staff members",
      "Interactive table maps and live floor plan",
      "Kitchen Display System (KDS) live order board",
      "Shift scheduling, clock-in kiosk, and shift swaps",
      "Stripe Connect dining checkout & automated tip splits",
    ],
    name: "Sync 50",
    annualEquivalent: 59,
    annualTotal: 708,
    priceMonthly: 69,
  },
  {
    badge: "High-Volume",
    features: [
      "Up to 100 active staff members",
      "Multi-station kitchen routing & expediter view",
      "Comprehensive table turnover & operational metrics",
      "1 free Chewbuu Spotlight promotion included monthly",
      "Customer and operator support",
    ],
    name: "Sync 100",
    popular: true,
    annualEquivalent: 119,
    annualTotal: 1428,
    priceMonthly: 139,
  },
  {
    badge: "Enterprise",
    features: [
      "Unlimited active staff members",
      "Multi-location restaurant group controls",
      "Centralized menu syndication and cross-unit analytics",
      "Enterprise account support and integration planning",
      "Enterprise billing review and account support",
    ],
    name: "Sync Enterprise",
    annualEquivalent: 219,
    annualTotal: 2628,
    priceMonthly: 249,
  },
];

function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly"
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Header */}
      <section className="border-b border-border bg-card/40 px-5 py-16 text-center sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-3xl space-y-4">
          <Badge className="border-primary/30 bg-primary/10 text-primary">
            <Sparkles data-icon="inline-start" /> Simple, Transparent Pricing
          </Badge>
          <h1 className="text-balance font-extrabold text-4xl sm:text-6xl tracking-tight">
            Plans built for real dining experiences.
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Whether you are discovering new spots for date night, dining with
            friend circles, or operating a busy restaurant with Chewbuu
            Sync—pricing is published up front, with self-serve cancellation
            controls for active subscriptions.
          </p>

          {/* Billing Cadence Toggle */}
          <div className="pt-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 p-1.5 shadow-inner">
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
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-500 dark:text-emerald-400">
                  Save 12–17%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Consumer Plans Section */}
      <section className="border-b border-border px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline">
              <HeartHandshake data-icon="inline-start" /> Consumer Memberships
            </Badge>
            <h2 className="mt-3 text-balance font-extrabold text-3xl sm:text-4xl">
              Social dining & date night tools
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Start free with Social, or upgrade to Mingle and Host for group
              dates, tab-covering privileges, and VIP reservation tools.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {CONSUMER_PLANS.map((plan) => {
              const isAnnual = billingInterval === "annual";
              const price = isAnnual
                ? plan.annualEquivalent
                : plan.priceMonthly;

              return (
                <Card
                  className={`flex flex-col justify-between overflow-hidden rounded-3xl border transition ${
                    plan.popular
                      ? "border-primary shadow-2xl shadow-primary/15 ring-2 ring-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                  key={plan.id}
                >
                  <div>
                    <div
                      className={`p-6 sm:p-8 ${
                        plan.popular
                          ? "bg-primary text-primary-foreground"
                          : "border-b border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className={`text-xs font-bold uppercase tracking-wider ${
                              plan.popular
                                ? "text-primary-foreground/80"
                                : "text-primary"
                            }`}
                          >
                            {plan.badge}
                          </p>
                          <h3 className="mt-1 font-black text-2xl sm:text-3xl">
                            {plan.name}
                          </h3>
                        </div>
                        {plan.id === "host" ? (
                          <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                            <Crown className="size-5" />
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-6 flex items-baseline gap-1">
                        <span className="font-black text-5xl tracking-tight">
                          ${formatPrice(price)}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            plan.popular
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isAnnual ? "/mo equiv." : plan.priceSuffix}
                        </span>
                      </div>
                      <p
                        className={`mt-2 font-bold text-sm ${
                          plan.popular
                            ? "text-primary-foreground/90"
                            : "text-foreground"
                        }`}
                      >
                        {plan.tagline}
                      </p>
                      <p
                        className={`mt-0.5 text-xs ${
                          plan.popular
                            ? "text-primary-foreground/75"
                            : "text-muted-foreground"
                        }`}
                      >
                        {plan.priceMonthly === 0
                          ? "Free for all members"
                          : isAnnual
                            ? `Billed annually · $${plan.annualTotal}/yr total · Save ${getAnnualSavings(plan.priceMonthly, plan.annualTotal)}%`
                            : "Billed monthly"}
                      </p>
                    </div>

                    <CardContent className="p-6 sm:p-8">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {plan.description}
                      </p>

                      <div className="mt-6 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Included features:
                        </p>
                        <ul className="space-y-2.5">
                          {plan.features.map((feature) => (
                            <li
                              className="flex items-start gap-2.5 text-xs sm:text-sm"
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
                    <Link
                      className={buttonVariants({
                        className: "w-full rounded-full font-bold",
                        size: "lg",
                        variant: plan.popular ? "default" : "outline",
                      })}
                      to={
                        plan.id === "social" ? "/auth/sign-up" : "/onboarding"
                      }
                    >
                      {plan.id === "social"
                        ? "Get Started Free"
                        : `Choose ${plan.name}`}
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Venue Plans Section (Chewbuu Sync) */}
      <section className="border-b border-border bg-muted/20 px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline">
              <Store data-icon="inline-start" /> Restaurant Operations
            </Badge>
            <h2 className="mt-3 text-balance font-extrabold text-3xl sm:text-4xl">
              Chewbuu Sync for venues
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Floor plans, KDS order tickets, shift scheduling, and Stripe
              Connect checkout. Sized by staff headcount, not feature paywalls.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {VENUE_TIERS.map((tier) => {
              const isAnnual = billingInterval === "annual";
              const price = isAnnual
                ? tier.annualEquivalent
                : tier.priceMonthly;

              return (
                <div
                  className={`flex flex-col justify-between rounded-3xl border bg-card p-6 sm:p-8 transition ${
                    tier.popular
                      ? "border-primary shadow-xl shadow-primary/10 ring-2 ring-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                  key={tier.name}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-extrabold text-2xl">{tier.name}</h3>
                      <Badge variant="secondary">{tier.badge}</Badge>
                    </div>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-black text-4xl">
                        ${formatPrice(price)}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {isAnnual ? "/mo equiv." : "/mo"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isAnnual
                        ? `Billed annually · $${tier.annualTotal}/yr total · Save ${getAnnualSavings(tier.priceMonthly, tier.annualTotal)}%`
                        : "Billed monthly"}
                    </p>

                    <div className="mt-6 border-t border-border pt-5 space-y-2.5">
                      {tier.features.map((feat) => (
                        <div
                          className="flex items-start gap-2 text-xs sm:text-sm text-foreground/85"
                          key={feat}
                        >
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
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
                        variant: tier.popular ? "default" : "outline",
                      })}
                      to="/sync-platform"
                    >
                      Explore {tier.name}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link
              className="inline-flex items-center gap-1.5 font-bold text-sm text-primary hover:underline"
              to="/sync-platform"
            >
              See complete Chewbuu Sync venue feature guide{" "}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Transparent Marketplace Fee Card */}
      <section className="border-b border-border px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-primary/25 bg-primary/5 p-6 sm:p-10">
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Percent className="size-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-xl sm:text-2xl">
                  5% In-App Dining Marketplace Fee
                </h3>
                <p className="text-xs text-muted-foreground">
                  Applied solely to food & beverage subtotals processed via
                  Stripe Connect
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              When guests order and pay their tab in the Chewbuu app, our 5%
              platform fee applies strictly to the food and beverage subtotal.
              We assess{" "}
              <strong>
                $0 in platform fees on staff tips and municipal taxes
              </strong>
              —100% of tips are deposited directly into restaurant and worker
              accounts.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  Chewbuu 5% Fee
                </p>
                <p className="mt-1 font-black text-2xl text-primary">$5.00</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  5% on a $100 F&B bill
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  100% Tip Pass-Through
                </p>
                <p className="mt-1 font-black text-2xl text-emerald-600 dark:text-emerald-400">
                  $20.00
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  100% directly to staff ($0 fee)
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  Taxes & Venue Net
                </p>
                <p className="mt-1 font-black text-2xl text-foreground">
                  $105.00
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  $10 tax to escrow + $95 venue net
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transparency & Card Underwriting Compliance Box */}
      <section className="border-b border-border bg-card/40 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="text-center">
            <Badge variant="outline">
              <ShieldCheck data-icon="inline-start" /> Buyer Protection &
              Transparency
            </Badge>
            <h2 className="mt-3 font-extrabold text-2xl sm:text-3xl">
              Billing & policy information
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-xs sm:text-sm">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <RefreshCw className="size-4 text-primary" /> Self-Serve
                Cancellation
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Consumer members can cancel renewal in Account Settings. Venue
                managers can cancel Sync from the Sync workspace. Access
                continues through the end of the prepaid period.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <ShieldCheck className="size-4 text-primary" /> 72-Hour Refund
                Grace
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Accidental auto-renewal? Contact support@chewbuu.com within 72
                hours for a refund review. Read our{" "}
                <Link className="text-primary underline" to="/refund-policy">
                  Refund Policy
                </Link>
                .
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <CreditCard className="size-4 text-primary" /> Clear Descriptors
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Transactions are processed in USD through Stripe. The statement
                descriptor depends on the merchant account and transaction.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      {
        title: "Chewbuu Plans & Pricing | Social Dining & Venue Software",
      },
      {
        name: "description",
        content:
          "Explore Chewbuu consumer memberships (Social, Mingle, Host) and Chewbuu Sync restaurant software. Transparent monthly and annual plans with self-serve cancellation.",
      },
      { property: "og:url", content: getCanonicalUrl("/pricing") },
    ],
  }),
});
