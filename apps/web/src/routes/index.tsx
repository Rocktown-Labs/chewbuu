import { Badge } from "@chewbuu/ui/components/badge";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarHeart,
  Check,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  MapPin,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TrendingItem {
  rank: number;
  couple: string;
  placeName: string;
  image: string;
  rating: string;
  compatibility: string;
}

const TRENDING_DATES: TrendingItem[] = [
  {
    rank: 1,
    couple: "Sarah & Dax",
    placeName: "KJ's Market & Sandwich Shop",
    rating: "4.8",
    compatibility: "94%",
    image:
      "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=60",
  },
  {
    rank: 2,
    couple: "Jessica & Cameron",
    placeName: "Cue & Co. Pool Hall",
    rating: "4.6",
    compatibility: "91%",
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&auto=format&fit=crop&q=60",
  },
  {
    rank: 3,
    couple: "Dylan & Taylor",
    placeName: "The Golden Booth",
    rating: "4.7",
    compatibility: "89%",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=60",
  },
  {
    rank: 4,
    couple: "Sophia & James",
    placeName: "Whiskey Cabin",
    rating: "4.9",
    compatibility: "92%",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=500&auto=format&fit=crop&q=60",
  },
  {
    rank: 5,
    couple: "Chloe & Michael",
    placeName: "Boba Haven",
    rating: "4.5",
    compatibility: "87%",
    image:
      "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=500&auto=format&fit=crop&q=60",
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
    q: "Where is Chewbuu currently available?",
    a: "Chewbuu is currently active in Nashville, TN, Little Rock, AR, and surrounding areas. We are rapidly expanding to other cities!",
  },
];

const HomeComponent = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      {/* HERO SECTION (Netflix style grid layout) */}
      <section className="relative min-h-[92svh] flex flex-col items-center justify-center text-center px-4 py-20 border-b-8 border-border bg-muted/20 overflow-hidden">
        {/* Faded Background Grid Grid */}
        <div className="absolute inset-0 opacity-15 dark:opacity-20 pointer-events-none grid grid-cols-3 md:grid-cols-6 gap-3 p-4 select-none">
          {TRENDING_DATES.map((item, i) => (
            <div
              key={i}
              className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-border"
            >
              <img
                src={item.image}
                alt=""
                className="w-full h-full object-cover grayscale"
              />
            </div>
          ))}
          {TRENDING_DATES.map((item, i) => (
            <div
              key={`dup-${i}`}
              className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-border hidden md:block"
            >
              <img
                src={item.image}
                alt=""
                className="w-full h-full object-cover grayscale"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50 pointer-events-none" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl space-y-6 flex flex-col items-center mt-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 font-bold text-primary text-xs uppercase tracking-wider shadow-inner">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Social dating with actual plans
          </div>
          <h1 className="text-balance font-extrabold text-4xl md:text-7xl leading-[1.05] tracking-tight text-foreground">
            Real People, Real Dates, Real Results.
          </h1>
          <p className="max-w-2xl text-base md:text-xl text-muted-foreground font-medium">
            Ditch endless swiping. Pick your favorite local spots, match by live
            video, and plan real dates near you.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground font-semibold uppercase tracking-wider">
            Ready to date? Enter the Chewbuu portal.
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
        </div>
      </section>

      {/* TRENDING DATES */}
      <section className="px-5 md:px-12 py-16 border-b-8 border-border bg-background">
        <h2 className="text-xl md:text-2xl font-extrabold text-foreground mb-8">
          Trending Dates Right Now
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
          {TRENDING_DATES.map((item) => (
            <div
              key={item.rank}
              className="relative shrink-0 w-[240px] md:w-[280px] snap-start rounded-2xl overflow-hidden border border-border bg-card group cursor-pointer"
            >
              <div className="absolute top-3 left-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-base font-black text-primary border border-primary/20">
                #{item.rank}
              </div>
              <div className="aspect-[4/3] w-full overflow-hidden relative">
                <img
                  src={item.image}
                  alt={item.couple}
                  className="w-full h-full object-cover transition-all duration-350 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">
                    {item.couple}
                  </span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] font-extrabold">
                    {item.compatibility} Match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-bold truncate flex items-center gap-1">
                  <MapPin className="size-3 text-primary shrink-0" />
                  {item.placeName}
                </p>
                <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit mt-1">
                  <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  <span>{item.rating} Spot Rating</span>
                </div>
              </div>
            </div>
          ))}
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

      {/* FAQ SECTION */}
      <section className="px-5 md:px-12 py-20 bg-background">
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
    </main>
  );
};

function IndexComponent() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.data?.user) {
      void navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  if (session?.data?.user) {
    return null;
  }

  return <HomeComponent />;
}

export const Route = createFileRoute("/")({
  component: IndexComponent,
});
