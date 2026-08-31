import {
  Link,
  createFileRoute,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Receipt,
  ShieldCheck,
  Store,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { pricingApi, type MembershipPlan } from "@/lib/dating-api";
import { trackMarketingEvent } from "@/lib/marketing-events";
import {
  OG_IMAGE_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_TITLE,
  getCanonicalUrl,
} from "@/lib/seo";
import { getServerSession } from "@/lib/session.functions";
import { markSyncOnboardingIntent } from "@/lib/venue-onboarding-intent";

const HERO_IMAGES = [
  "/hero/date-rooftop.webp",
  "/hero/date-volleyball.webp",
  "/hero/date-food-truck.webp",
  "/hero/date-bowling.webp",
  "/hero/date-dinner.webp",
  "/hero/date-group-bowling.webp",
  "/hero/friends-07.webp",
  "/hero/friends-08.webp",
  "/hero/friends-09.webp",
  "/hero/friends-10.webp",
  "/hero/friends-11.webp",
  "/hero/friends-12.webp",
];

const DATE_SPOT_PROMISES = [
  {
    title: "Pick the place first",
    text: "Choose restaurants, coffee, drinks, activities, and conversation-friendly spots near you before matching.",
  },
  {
    title: "Match by verified media",
    text: "Live photos and intro videos make profiles harder to fake and easier to trust before a chat opens.",
  },
  {
    title: "Chat when there is a plan",
    text: "Request dates, review matches, save maybes for later, then chat with the people you actually want to meet.",
  },
];

const REASONS = [
  {
    icon: Video,
    title: "Video-First Matching",
    text: "No catfish, no fake profiles. Matches exchange short video intros before text chat unlocks.",
  },
  {
    icon: MapPin,
    title: "Integrated Date Spots",
    text: "Select real local restaurants, cafes, or activity spots directly in your date request wizard.",
  },
  {
    icon: Users,
    title: "Circles & Double Dates",
    text: "Go on dates alone or invite up to three friends to double date or hang out in group circles.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Safety Shield",
    text: "Designate safety contacts who receive automatic location coordinates when your dates start.",
  },
] as const;

const SYNC_HOME_FEATURES = [
  {
    icon: LayoutDashboard,
    title: "One operating workspace",
    text: "Service board, tables, orders, and team context.",
  },
  {
    icon: ChefHat,
    title: "Built for the floor",
    text: "Menus, kitchen states, guests, reservations, and tips.",
  },
  {
    icon: BarChart3,
    title: "Real venue signals",
    text: "Learn from the operational events you actually record.",
  },
] as const;

const FAQS = [
  {
    q: "What is Chewbuu?",
    a: "Chewbuu is a social dating platform designed to get real people off endless swiping and onto real dates. We combine video-first verification, integrated local place suggestions (Eat, Drink, Play), and trusted circle dating.",
  },
  {
    q: "How much does Chewbuu cost?",
    a: "Chewbuu is free forever under the Social tier. You can create solo date requests, view verified profiles, and book up to 2 dates per day. Upgrade to Mingle or Sugar for double dates, covering date costs, and more bookings.",
  },
  {
    q: "How does video-first verification work?",
    a: "During onboarding, every user records a live intro video and snaps a live photo. To start texting a match, you exchange quick video replies. This guarantees that you only date 100% verified, real people.",
  },
  {
    q: "What is the Chewbuu rating & score?",
    a: "At the end of every date, users are required to review the place and rate their date partner. Your Chewbuu Score reflects your safety, friendliness, and compatibility history, keeping the community safe.",
  },
  {
    q: "How does Chewbuu use my data?",
    a: "Chewbuu uses profile, date, location, and safety data to run the service, prevent fake profiles, suggest places, manage dates, and keep people safer. We are built around subscriptions and date commerce, not selling personal dating data.",
  },
  {
    q: "Where is Chewbuu currently available?",
    a: "Chewbuu is currently active in Nashville, TN, Little Rock, AR, and surrounding areas. We are rapidly expanding to other cities!",
  },
];

const HomeComponent = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const { plans: nextPlans } = await pricingApi.getPlans();
        setPlans(nextPlans.filter((plan) => plan.active));
      } catch {
        setPlans([]);
      }
    };

    void loadPlans();
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      {/* HERO SECTION (Netflix style grid layout) */}
      <section className="relative min-h-[92svh] flex flex-col items-center justify-center text-center px-4 py-20 border-b-8 border-border bg-muted/20 overflow-hidden">
        {/* Faded Background Grid Grid */}
        <div className="absolute inset-0 opacity-25 dark:opacity-30 pointer-events-none grid grid-cols-3 md:grid-cols-6 gap-3 p-4 select-none">
          {HERO_IMAGES.map((image, i) => (
            <div
              key={i}
              className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-border"
            >
              <img
                src={image}
                alt=""
                className="w-full h-full object-cover grayscale"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50 pointer-events-none" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl space-y-6 flex flex-col items-center mt-6">
          <h1 className="text-balance font-extrabold text-4xl md:text-7xl leading-[1.05] tracking-tight text-foreground">
            Meet for real dates, not endless swipes.
          </h1>
          <p className="max-w-2xl text-base md:text-xl text-muted-foreground font-medium">
            Chewbuu helps verified people request dates, choose nearby spots,
            chat with matches, and post recaps after the date happens.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground font-semibold uppercase tracking-wider">
            Create your profile, pick your places, then meet.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-2 justify-center">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3.5 shadow-lg shadow-primary/20 transition-all duration-200"
              to="/auth/sign-up"
            >
              <span>Get Started</span>
              <ChevronRight className="size-5 ml-1" />
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-border bg-card hover:bg-muted text-foreground font-bold px-8 py-3.5 transition-all duration-200"
              to="/auth/sign-in"
            >
              Sign In
            </Link>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              to="/spots"
            >
              Explore verified spots →
            </Link>
            <Link
              className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              to="/venue-portal"
            >
              Own or help onboard a venue →
            </Link>
          </div>
        </div>
      </section>

      <section
        className="px-5 md:px-12 py-16 border-b-8 border-border bg-background"
        id="how-it-works"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xl md:text-3xl font-extrabold text-foreground mb-8">
            Built around the date, not the swipe.
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {DATE_SPOT_PROMISES.map((item, index) => (
              <article
                className="rounded-2xl border border-border bg-card p-6"
                key={item.title}
              >
                <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                  {index + 1}
                </div>
                <h3 className="font-bold text-lg text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-muted-foreground text-sm/relaxed font-medium">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* REASONS TO JOIN */}
      <section className="px-5 md:px-12 py-20 border-b-8 border-border bg-muted/10">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          <h2 className="text-2xl md:text-4xl font-extrabold text-foreground text-center">
            More Reasons to Join
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {REASONS.map(({ icon: Icon, title, text }) => (
              <article
                className="rounded-3xl border border-border bg-card p-6 flex flex-col gap-4 hover:border-muted-foreground/30 transition duration-200"
                key={title}
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-bold text-lg text-foreground">{title}</h3>
                  <p className="text-muted-foreground text-xs/relaxed font-medium">
                    {text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="px-5 md:px-12 py-20 border-b-8 border-border bg-background"
        id="pricing"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary text-xs font-bold uppercase">
              <Receipt aria-hidden="true" className="size-3.5" />
              Pricing
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-foreground">
              Start free. Upgrade when dating gets social.
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {plans
              .toSorted((a, b) => a.sortOrder - b.sortOrder)
              .map((plan) => (
                <article
                  className="flex flex-col rounded-2xl border border-border bg-card p-6"
                  key={plan.tier}
                >
                  <h3 className="font-extrabold text-xl">{plan.name}</h3>
                  <p className="mt-2 min-h-12 text-muted-foreground text-sm/relaxed">
                    {plan.description}
                  </p>
                  <p className="my-6 text-3xl font-extrabold">
                    {plan.monthlyPriceCents === 0
                      ? "Free"
                      : `$${Math.round(plan.monthlyPriceCents / 100)}/mo`}
                  </p>
                  <ul className="flex flex-1 flex-col gap-3 text-sm">
                    {plan.features.slice(0, 4).map((feature) => (
                      <li className="flex gap-2" key={feature}>
                        <Check
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-primary"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 font-bold text-primary-foreground text-sm hover:bg-primary/90"
                    to="/auth/sign-up"
                  >
                    {plan.cta}
                  </Link>
                </article>
              ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="px-5 md:px-12 py-20 bg-background" id="faq">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <h2 className="text-2xl md:text-4xl font-extrabold text-foreground text-center">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="flex flex-col border border-border rounded-2xl overflow-hidden bg-card"
                >
                  <button
                    onClick={() => toggleFaq(i)}
                    type="button"
                    className="flex items-center justify-between px-6 py-5 text-left font-bold text-sm md:text-base text-foreground hover:bg-muted/50 transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`size-5 text-muted-foreground transition-transform duration-250 ${isOpen ? "rotate-180 text-primary" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-xs md:text-sm/relaxed font-medium text-muted-foreground border-t border-border/40 pt-4 bg-muted/10">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-4 mt-6 text-center">
            <span className="text-sm text-muted-foreground font-bold uppercase tracking-wider">
              Ready to begin your dating journey?
            </span>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 py-4 shadow-lg shadow-primary/20 transition-all duration-200 text-sm"
              to="/auth/sign-up"
            >
              <span>Get Started Free</span>
              <ChevronRight className="size-4 ml-1.5" />
            </Link>
          </div>
        </div>
      </section>

      <section
        className="border-b-8 border-border bg-foreground px-5 py-16 text-background sm:px-8 sm:py-20 lg:px-12"
        id="sync"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 font-bold text-primary text-xs uppercase tracking-wider">
              <Store className="size-3.5" />
              Chewbuu Sync for venues
            </div>
            <h2 className="mt-5 max-w-2xl text-balance font-black text-3xl tracking-tight sm:text-5xl">
              The place guests discover—and your team can actually run.
            </h2>
            <p className="mt-4 max-w-2xl text-background/70 text-base leading-7 sm:text-lg">
              Sync keeps your real venue profile, menu, staff, reservations,
              orders, and service flow connected. Start free with one location,
              then activate the $60/month plan when your team is ready.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground text-sm shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                onClick={() => {
                  markSyncOnboardingIntent();
                  trackMarketingEvent("cta_clicked", {
                    button_text: "Start free venue setup",
                    destination: "/venue-portal",
                    location: "home_sync_section",
                    product: "sync",
                  });
                }}
                to="/venue-portal"
              >
                Start free venue setup <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/20 px-6 font-bold text-background text-sm transition hover:bg-background/10"
                to="/sync-platform"
              >
                Explore Sync
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {SYNC_HOME_FEATURES.map(({ icon: Icon, title, text }) => (
              <div
                className="flex gap-3 rounded-2xl border border-background/10 bg-background/5 p-4"
                key={title}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="font-bold text-sm">{title}</p>
                  <p className="mt-1 text-background/55 text-xs leading-5">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t border-border px-5 py-10 md:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-extrabold text-foreground">Chewbuu</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Dates, matches, chats, circles, and recaps in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
            <a className="hover:text-foreground" href="/#how-it-works">
              How it works
            </a>
            <a className="hover:text-foreground" href="/#pricing">
              Pricing
            </a>
            <Link className="hover:text-foreground" to="/sync-platform">
              For venues
            </Link>
            <Link className="hover:text-foreground" to="/specials">
              Specials
            </Link>
            <Link className="hover:text-foreground" to="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-foreground" to="/terms">
              Terms
            </Link>
            <Link className="hover:text-foreground" to="/auth/sign-in">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
};

function IndexComponent() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.data?.user) {
      void navigate({
        to: session.data.user.hasCompletedOnboarding ? "/me" : "/onboarding",
      });
    }
  }, [session, navigate]);

  if (session?.data?.user) {
    return null;
  }

  return <HomeComponent />;
}

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session =
      typeof window === "undefined"
        ? await getServerSession()
        : await authClient.getSession();

    if (session.data?.user) {
      throw redirect({
        to: session.data.user.hasCompletedOnboarding ? "/me" : "/onboarding",
      });
    }
    return { session };
  },
  component: IndexComponent,
  head: () => ({
    links: [
      {
        href: getCanonicalUrl(),
        rel: "canonical",
      },
    ],
    meta: [
      { title: SITE_TITLE },
      {
        content: SITE_DESCRIPTION,
        name: "description",
      },
      {
        content: getCanonicalUrl(),
        property: "og:url",
      },
      {
        content: SITE_TITLE,
        property: "og:title",
      },
      {
        content: SITE_DESCRIPTION,
        property: "og:description",
      },
      {
        content: OG_IMAGE_URL,
        property: "og:image",
      },
      {
        content: SITE_TITLE,
        name: "twitter:title",
      },
      {
        content: SITE_DESCRIPTION,
        name: "twitter:description",
      },
      {
        content: OG_IMAGE_URL,
        name: "twitter:image",
      },
    ],
    scripts: [
      {
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          description: SITE_DESCRIPTION,
          logo: getCanonicalUrl("/brand/chewbuu-logo-500.png"),
          name: SITE_NAME,
          slogan: SITE_TAGLINE,
          url: getCanonicalUrl(),
        }),
        type: "application/ld+json",
      },
      {
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          description: SITE_DESCRIPTION,
          name: SITE_NAME,
          url: getCanonicalUrl(),
        }),
        type: "application/ld+json",
      },
      {
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((faq) => ({
            "@type": "Question",
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.a,
            },
            name: faq.q,
          })),
        }),
        type: "application/ld+json",
      },
    ],
  }),
});
