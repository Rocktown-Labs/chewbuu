import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button, buttonVariants } from "@chewbuu/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Input } from "@chewbuu/ui/components/input";
import { Progress } from "@chewbuu/ui/components/progress";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarHeart,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  Heart,
  Home,
  ImagePlus,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tv,
  User,
  UserPlus,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  datingApi,
  type DatePlace,
  type DatingProfilePayload,
  type DatingSummary,
} from "@/lib/dating-api";

interface DateRecap {
  id: string;
  userName: string;
  userAvatar?: string;
  placeName: string;
  placeAddress: string;
  photos: string[];
  caption: string;
  placeRating: number;
  personName: string;
  compatibilityScore: number;
  createdAt: string;
}

const defaultRecaps: DateRecap[] = [
  {
    id: "recap-1",
    userName: "Sarah Smith",
    userAvatar: "",
    placeName: "KJ's Market & Sandwich Shop",
    placeAddress: "123 Date St, Nashville, TN",
    photos: [
      "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=60",
    ],
    caption:
      "Grabbing lunch at KJ's was amazing! The chicken and waffles were perfect.",
    placeRating: 5,
    personName: "Dax",
    compatibilityScore: 94,
    createdAt: "2026-07-13T18:30:00.000Z",
  },
  {
    id: "recap-2",
    userName: "Dax Stewart",
    userAvatar: "",
    placeName: "Cue & Co. Pool Hall",
    placeAddress: "456 Social Ave, Little Rock, AR",
    photos: [
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&auto=format&fit=crop&q=60",
    ],
    caption:
      "Washed Sarah at pool tonight. Extremely fun spot for drinks and games.",
    placeRating: 4,
    personName: "Sarah",
    compatibilityScore: 89,
    createdAt: "2026-07-12T22:15:00.000Z",
  },
  {
    id: "recap-3",
    userName: "Jessica Miller",
    userAvatar: "",
    placeName: "The Golden Booth",
    placeAddress: "789 Table Rd, Nashville, TN",
    photos: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=60",
    ],
    caption: "Mingle date went great! Food and mocktails were lovely.",
    placeRating: 5,
    personName: "Cameron & Friends",
    compatibilityScore: 91,
    createdAt: "2026-07-11T20:00:00.000Z",
  },
];

const mockSpots = {
  eat: [
    {
      id: "spot-1",
      name: "KJ's Market & Sandwich Shop",
      address: "Nashville, TN",
      rating: "4.8",
      image:
        "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=300&auto=format&fit=crop&q=60",
      tags: ["Sandwiches", "Lunch", "Casual"],
    },
    {
      id: "spot-2",
      name: "The Golden Booth",
      address: "Nashville, TN",
      rating: "4.7",
      image:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&auto=format&fit=crop&q=60",
      tags: ["Italian", "Fine Dining", "Cocktails"],
    },
  ],
  drink: [
    {
      id: "spot-3",
      name: "Whiskey Cabin",
      address: "Nashville, TN",
      rating: "4.9",
      image:
        "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=60",
      tags: ["Bourbon", "Bar", "Live Music"],
    },
    {
      id: "spot-4",
      name: "Boba Haven",
      address: "Little Rock, AR",
      rating: "4.5",
      image:
        "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=300&auto=format&fit=crop&q=60",
      tags: ["Tea", "Mocktails", "Desserts"],
    },
  ],
  play: [
    {
      id: "spot-5",
      name: "Cue & Co.",
      address: "Little Rock, AR",
      rating: "4.6",
      image:
        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&auto=format&fit=crop&q=60",
      tags: ["Billiards", "Social", "Arcade"],
    },
    {
      id: "spot-6",
      name: "Good Company Social",
      address: "Nashville, TN",
      rating: "4.8",
      image:
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60",
      tags: ["Comedy", "Bowling", "Games"],
    },
  ],
};

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"feed" | "spots" | "profile">(
    "feed"
  );
  const [spotsCategory, setSpotsCategory] = useState<
    "all" | "eat" | "drink" | "play"
  >("all");
  const [profileSubTab, setProfileSubTab] = useState<
    "intro" | "photos" | "recaps"
  >("recaps");

  const [summary, setSummary] = useState<DatingSummary | null>(null);
  const [profile, setProfile] = useState<DatingProfilePayload | null>(null);

  // Local state for user's own uploaded date recaps (persisted to localStorage)
  const [userRecaps, setUserRecaps] = useState<DateRecap[]>([]);
  const [showAddRecap, setShowAddRecap] = useState(false);
  const [recapForm, setRecapForm] = useState({
    placeName: "",
    placeAddress: "",
    caption: "",
    placeRating: 5,
    personName: "",
    compatibilityScore: 90,
    photoUrl: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [nextSummary, nextProfile] = await Promise.all([
          datingApi.getSummary(),
          datingApi.getProfile(),
        ]);
        setSummary(nextSummary);
        setProfile(nextProfile.profile);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not load dashboard."
        );
      }
    };

    void load();

    // Load user recaps from localStorage
    const saved = localStorage.getItem("chewbuu_user_recaps");
    if (saved) {
      try {
        setUserRecaps(JSON.parse(saved) as DateRecap[]);
      } catch (error) {
        console.error("Failed to parse local recaps:", error);
      }
    }
  }, []);

  const allRecaps = useMemo(() => {
    return [...userRecaps, ...defaultRecaps].toSorted(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [userRecaps]);

  const displayName = session.data?.user.name ?? "there";
  const tier =
    summary?.membershipTier ?? session.data?.user.membershipTier ?? "social";
  const canDate = summary?.readiness.canDate ?? false;
  const media = profile?.media ?? [];
  const profilePhoto = media.find((item) => item.kind === "profile_photo")?.url;
  const introVideo = media.find((item) => item.kind === "intro_video")?.url;
  const extraPhotos = media.filter((item) => item.kind === "photo");

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      await navigate({ to: "/" });
      toast.success("Signed out successfully.");
    } catch {
      toast.error("Failed to sign out.");
    }
  };

  const handleCreateRecap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recapForm.placeName || !recapForm.caption) {
      toast.error("Please fill in the place name and caption.");
      return;
    }

    const newRecap: DateRecap = {
      id: `recap-${crypto.randomUUID()}`,
      userName: displayName,
      userAvatar: profilePhoto ?? "",
      placeName: recapForm.placeName,
      placeAddress: recapForm.placeAddress || "Nashville, TN",
      photos: [
        recapForm.photoUrl ||
          "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=60",
      ],
      caption: recapForm.caption,
      placeRating: Number(recapForm.placeRating),
      personName: recapForm.personName || "Date Partner",
      compatibilityScore: Number(recapForm.compatibilityScore),
      createdAt: new Date().toISOString(),
    };

    const nextRecaps = [newRecap, ...userRecaps];
    setUserRecaps(nextRecaps);
    localStorage.setItem("chewbuu_user_recaps", JSON.stringify(nextRecaps));

    setShowAddRecap(false);
    setRecapForm({
      placeName: "",
      placeAddress: "",
      caption: "",
      placeRating: 5,
      personName: "",
      compatibilityScore: 90,
      photoUrl: "",
    });
    toast.success("Date recap uploaded to your feed!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="lg:col-span-3 border-r border-border/80 p-5 flex flex-col justify-between h-sticky sticky top-0 hidden md:flex">
          <div className="flex flex-col gap-8">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 px-2">
              <img
                src="/brand/chewbuu-logo-500-trans.png"
                alt="Chewbuu"
                className="h-8 w-8 object-contain"
              />
              <span className="font-extrabold text-xl tracking-tight text-foreground">
                chewbuu
              </span>
            </Link>

            {/* Menu Links */}
            <nav className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("feed")}
                className={`flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === "feed"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Home className="size-5" />
                <span>Feed</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("spots")}
                className={`flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === "spots"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <MapPin className="size-5" />
                <span>Spots</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <User className="size-5" />
                <span>My Profile</span>
              </button>
              <Link
                to="/onboarding"
                className="flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
              >
                <ClipboardList className="size-5" />
                <span>Edit Profile</span>
              </Link>
            </nav>

            {/* Plan a Date Button */}
            <Link
              to={canDate ? "/date/new" : "/onboarding"}
              className={`w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition duration-200 ${
                canDate
                  ? "bg-primary text-primary-foreground shadow-primary/15"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <CalendarHeart className="size-5" />
              <span>Plan a Date</span>
            </Link>
          </div>

          {/* User Account Card */}
          <div className="flex items-center justify-between p-3 rounded-2xl border bg-card/60">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 border border-border">
                {profilePhoto && <AvatarImage src={profilePhoto} />}
                <AvatarFallback className="font-bold text-xs uppercase bg-primary/10 text-primary">
                  {displayName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="font-bold text-sm truncate max-w-28">
                  {displayName}
                </span>
                <Badge
                  className="w-fit text-[10px] py-0 px-1.5 font-bold uppercase mt-0.5"
                  variant="secondary"
                >
                  {tier}
                </Badge>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition cursor-pointer"
              title="Sign Out"
              type="button"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </aside>

        {/* MOBILE TOP BAR (visible on mobile only) */}
        <header className="md:hidden border-b border-border/80 p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 w-full col-span-1">
          <div className="flex items-center gap-2">
            <img
              src="/brand/chewbuu-logo-500-trans.png"
              alt="Chewbuu"
              className="h-6 w-6"
            />
            <span className="font-extrabold tracking-tight">chewbuu</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("feed")}
              className={`p-2 rounded-full ${activeTab === "feed" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
            >
              <Home className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("spots")}
              className={`p-2 rounded-full ${activeTab === "spots" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
            >
              <MapPin className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`p-2 rounded-full ${activeTab === "profile" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
            >
              <User className="size-4" />
            </button>
          </div>
        </header>

        {/* MAIN MIDDLE COLUMN (FEED / SPOTS / PROFILE) */}
        <main className="lg:col-span-6 md:col-span-9 border-r border-border/80 min-h-screen pb-16 md:pb-6">
          {/* FEED SUB-VIEW */}
          {activeTab === "feed" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 md:top-0 bg-background/90 backdrop-blur-md z-30 flex items-center justify-between">
                <h2 className="text-xl font-bold">Home Feed</h2>
                <Badge
                  className="rounded-full bg-primary/10 text-primary border-primary/20"
                  variant="outline"
                >
                  Real People Verified
                </Badge>
              </div>

              {/* Status Update Widget / Quick Date CTA */}
              <div className="p-5 border-b border-border/80 bg-card/30 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <Avatar className="size-10 border">
                    {profilePhoto && <AvatarImage src={profilePhoto} />}
                    <AvatarFallback className="font-bold text-xs uppercase bg-primary/15 text-primary">
                      {displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <span className="font-bold text-foreground">
                      Going out today, {displayName}?
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Set up your date details in 2 minutes. Pick places and let
                      Chewbuu find a verified partner.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => setActiveTab("profile")}
                    variant="outline"
                    className="rounded-full text-xs font-semibold h-8"
                  >
                    Post Date Recap
                  </Button>
                  <Link
                    to={canDate ? "/date/new" : "/onboarding"}
                    className={buttonVariants({
                      className: "rounded-full text-xs font-semibold h-8",
                      size: "sm",
                    })}
                  >
                    Start Date Wizard
                  </Link>
                </div>
              </div>

              {/* Recaps Feed List */}
              <div className="flex flex-col divide-y divide-border/70">
                {allRecaps.map((recap) => (
                  <article className="p-5 flex flex-col gap-4" key={recap.id}>
                    {/* Recap Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 border border-border">
                          {recap.userAvatar && (
                            <AvatarImage src={recap.userAvatar} />
                          )}
                          <AvatarFallback className="font-bold text-xs bg-muted text-muted-foreground uppercase">
                            {recap.userName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-sm flex items-center gap-1">
                            {recap.userName}
                            <Check className="size-3.5 text-primary fill-primary/10 rounded-full" />
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(recap.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Compatibility Badge */}
                      <Badge
                        className="rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold"
                        variant="outline"
                      >
                        {recap.compatibilityScore}% Compatibility
                      </Badge>
                    </div>

                    {/* Recap Body */}
                    <p className="text-sm/relaxed font-medium text-foreground">
                      {recap.caption}
                    </p>

                    {/* Place Card Inside Recap */}
                    <div className="rounded-2xl border border-border/80 p-3 bg-card/40 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-xs text-foreground">
                            {recap.placeName}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {recap.placeAddress}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Star className="size-3 fill-yellow-500 text-yellow-500" />
                        <span>{recap.placeRating}.0</span>
                      </div>
                    </div>

                    {/* Recap Image */}
                    {recap.photos.length > 0 && (
                      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border/80 bg-muted/20">
                        <img
                          src={recap.photos[0]}
                          alt={recap.placeName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Feedback Rating details */}
                    <p className="text-xs text-muted-foreground italic">
                      Date partner rating:{" "}
                      <span className="font-bold text-foreground">
                        {recap.personName}
                      </span>{" "}
                      was rated 5/5. Both place & person reviews cleared.
                    </p>

                    {/* Interaction Bar */}
                    <div className="flex items-center gap-6 border-t border-border/40 pt-3 text-muted-foreground text-xs font-semibold">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-primary transition cursor-pointer"
                      >
                        <Heart className="size-4" />
                        <span>Like</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-primary transition cursor-pointer"
                      >
                        <MessageSquare className="size-4" />
                        <span>Comment</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* SPOTS SUB-VIEW (DoorDash Style) */}
          {activeTab === "spots" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-30 flex flex-col gap-3">
                <h2 className="text-xl font-bold">Explore Local Spots</h2>
                {/* Search Bar */}
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
                  <Input
                    className="pl-10 rounded-full h-11 bg-card/60"
                    placeholder={`Search Eat, Drink, Play spots in ${profile?.area || "Nashville, TN"}...`}
                  />
                </div>
              </div>

              {/* Category selector pills */}
              <div className="flex gap-2 overflow-x-auto px-5 py-4 border-b border-border/80 scrollbar-none">
                {["all", "eat", "drink", "play"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSpotsCategory(cat as any)}
                    className={`rounded-full px-5 py-1.5 text-xs font-bold capitalize transition shrink-0 cursor-pointer ${
                      spotsCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted-hover hover:text-foreground"
                    }`}
                    type="button"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Spot Grid Content */}
              <div className="p-5 flex flex-col gap-8">
                {(spotsCategory === "all" || spotsCategory === "eat") && (
                  <div className="flex flex-col gap-4">
                    <h3 className="font-bold text-lg text-foreground flex items-center justify-between">
                      <span>Top Eat Spots Near You</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {mockSpots.eat.map((spot) => (
                        <SpotCard
                          key={spot.id}
                          spot={spot}
                          category="eat"
                          canDate={canDate}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {(spotsCategory === "all" || spotsCategory === "drink") && (
                  <div className="flex flex-col gap-4">
                    <h3 className="font-bold text-lg text-foreground flex items-center justify-between">
                      <span>Top Drink Spots Near You</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {mockSpots.drink.map((spot) => (
                        <SpotCard
                          key={spot.id}
                          spot={spot}
                          category="drink"
                          canDate={canDate}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {(spotsCategory === "all" || spotsCategory === "play") && (
                  <div className="flex flex-col gap-4">
                    <h3 className="font-bold text-lg text-foreground flex items-center justify-between">
                      <span>Top Play Spots Near You</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {mockSpots.play.map((spot) => (
                        <SpotCard
                          key={spot.id}
                          spot={spot}
                          category="play"
                          canDate={canDate}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROFILE SUB-VIEW (Instagram Style) */}
          {activeTab === "profile" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-30 flex items-center justify-between">
                <h2 className="text-xl font-bold">My Profile</h2>
                <Link
                  to="/onboarding"
                  className={buttonVariants({
                    className: "rounded-full text-xs font-semibold h-8",
                    size: "sm",
                    variant: "outline",
                  })}
                >
                  Edit Profile
                </Link>
              </div>

              {/* Instagram Header */}
              <div className="p-5 flex flex-col gap-5 border-b border-border/80">
                <div className="flex items-center gap-6 md:gap-10">
                  <Avatar className="size-20 md:size-24 border-2 border-primary/20 shadow-md">
                    {profilePhoto && <AvatarImage src={profilePhoto} />}
                    <AvatarFallback className="font-bold text-lg uppercase bg-primary/10 text-primary">
                      {displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-lg md:text-xl text-foreground">
                        {
                          allRecaps.filter((r) => r.userName === displayName)
                            .length
                        }
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                        Recaps
                      </span>
                    </div>
                    <div className="flex flex-col border-x border-border/80">
                      <span className="font-extrabold text-lg md:text-xl text-foreground flex items-center justify-center gap-0.5">
                        4.9{" "}
                        <Star className="size-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                        Score
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-lg md:text-xl text-foreground">
                        {profile?.friendInvites?.length ?? 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                        Circle
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div className="flex flex-col text-left gap-1.5 mt-2">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-1.5">
                    {displayName}
                    <Check className="size-4 text-primary fill-primary/10 rounded-full" />
                  </h3>
                  {profile?.occupation && (
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      💼 {profile.occupation}
                    </p>
                  )}
                  {profile?.bio && (
                    <p className="text-sm text-foreground/90 mt-1 max-w-xl">
                      {profile.bio}
                    </p>
                  )}

                  {/* Private Details */}
                  {profile?.race && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold rounded-full px-2.5 py-0.5"
                      >
                        Private Race: {profile.race}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold rounded-full px-2.5 py-0.5"
                      >
                        Sexuality: {profile.sexuality}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Instagram Sub-tabs */}
              <div className="flex border-b border-border/80">
                <button
                  type="button"
                  onClick={() => setProfileSubTab("recaps")}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition duration-200 cursor-pointer ${
                    profileSubTab === "recaps"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Date Reels
                </button>
                <button
                  type="button"
                  onClick={() => setProfileSubTab("intro")}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition duration-200 cursor-pointer ${
                    profileSubTab === "intro"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Verified Intro
                </button>
                <button
                  type="button"
                  onClick={() => setProfileSubTab("photos")}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition duration-200 cursor-pointer ${
                    profileSubTab === "photos"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Extra Photos
                </button>
              </div>

              {/* Profile Sub-tab Content */}
              <div className="p-5">
                {profileSubTab === "recaps" && (
                  <div className="flex flex-col gap-6">
                    {/* Add Recap Trigger Button */}
                    <Button
                      onClick={() => setShowAddRecap(true)}
                      className="rounded-full font-bold flex items-center justify-center gap-1.5 w-full border border-dashed border-primary/45 bg-primary/5 text-primary hover:bg-primary/10 transition"
                      variant="outline"
                    >
                      <Plus className="size-4" />
                      Upload New Date Recap (Reel)
                    </Button>

                    {/* Add Recap Form Dialog */}
                    {showAddRecap && (
                      <Card className="border-2 border-primary/30 p-5 mt-2 rounded-2xl bg-card/60">
                        <form
                          onSubmit={handleCreateRecap}
                          className="flex flex-col gap-4"
                        >
                          <h4 className="font-bold text-sm text-foreground">
                            Write a New Date Recap
                          </h4>
                          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground ml-1">
                                Place Name
                              </span>
                              <Input
                                placeholder="E.g. KJ's Sandwich Shop"
                                value={recapForm.placeName}
                                onChange={(e) =>
                                  setRecapForm({
                                    ...recapForm,
                                    placeName: e.target.value,
                                  })
                                }
                                className="rounded-full h-9 text-xs"
                                required
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground ml-1">
                                Date Partner Name
                              </span>
                              <Input
                                placeholder="E.g. Sarah, Dax"
                                value={recapForm.personName}
                                onChange={(e) =>
                                  setRecapForm({
                                    ...recapForm,
                                    personName: e.target.value,
                                  })
                                }
                                className="rounded-full h-9 text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground ml-1">
                                Place Rating (1-5)
                              </span>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                value={recapForm.placeRating}
                                onChange={(e) =>
                                  setRecapForm({
                                    ...recapForm,
                                    placeRating: Number(e.target.value),
                                  })
                                }
                                className="rounded-full h-9 text-xs"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground ml-1">
                                Compatibility Score (1-100)
                              </span>
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                value={recapForm.compatibilityScore}
                                onChange={(e) =>
                                  setRecapForm({
                                    ...recapForm,
                                    compatibilityScore: Number(e.target.value),
                                  })
                                }
                                className="rounded-full h-9 text-xs"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground ml-1">
                                Photo URL (Optional)
                              </span>
                              <Input
                                placeholder="E.g. https://example.com/date.jpg"
                                value={recapForm.photoUrl}
                                onChange={(e) =>
                                  setRecapForm({
                                    ...recapForm,
                                    photoUrl: e.target.value,
                                  })
                                }
                                className="rounded-full h-9 text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground ml-1">
                              What did you love about this date?
                            </span>
                            <Textarea
                              placeholder="Describe your recap. E.g., Great conversations, loved the pool table..."
                              value={recapForm.caption}
                              onChange={(e) =>
                                setRecapForm({
                                  ...recapForm,
                                  caption: e.target.value,
                                })
                              }
                              className="rounded-xl min-h-16 text-xs p-3"
                              required
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              onClick={() => setShowAddRecap(false)}
                              variant="ghost"
                              className="rounded-full h-9 text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="rounded-full h-9 text-xs"
                            >
                              Publish Recap
                            </Button>
                          </div>
                        </form>
                      </Card>
                    )}

                    {/* User's own recaps grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {allRecaps
                        .filter((r) => r.userName === displayName)
                        .map((recap) => (
                          <div
                            className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition duration-200"
                            key={recap.id}
                          >
                            <div className="aspect-video w-full relative bg-muted/10">
                              <img
                                src={recap.photos[0]}
                                alt={recap.placeName}
                                className="w-full h-full object-cover"
                              />
                              <Badge
                                className="absolute top-3 right-3 rounded-full bg-black/60 text-white font-bold text-[10px]"
                                variant="secondary"
                              >
                                {recap.compatibilityScore}% Co.
                              </Badge>
                            </div>
                            <div className="p-4 flex flex-col gap-2">
                              <span className="font-bold text-xs text-primary">
                                {recap.placeName}
                              </span>
                              <p className="text-xs text-foreground/90 font-medium truncate">
                                {recap.caption}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 border-t pt-2">
                                <span>{recap.personName} was rated 5/5</span>
                                <span>
                                  {new Date(
                                    recap.createdAt
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      {allRecaps.filter((r) => r.userName === displayName)
                        .length === 0 && (
                        <p className="text-sm text-muted-foreground italic col-span-2 text-center py-8">
                          No date recaps uploaded yet. Go on dates to post
                          reels!
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {profileSubTab === "intro" && (
                  <div className="flex flex-col gap-4 max-w-xl mx-auto text-center py-4">
                    {introVideo ? (
                      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border bg-black relative">
                        <video
                          src={introVideo}
                          controls
                          className="w-full h-full object-cover"
                        >
                          <track kind="captions" />
                        </video>
                        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground font-bold text-[10px] rounded-full flex items-center gap-1">
                          <Check className="size-3" /> Verified Live Intro
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No verified intro video uploaded yet.
                      </p>
                    )}
                  </div>
                )}

                {profileSubTab === "photos" && (
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                    {extraPhotos.map((photo, i) => (
                      <div
                        key={photo.url}
                        className="aspect-square rounded-2xl overflow-hidden border bg-muted/10"
                      >
                        <img
                          src={photo.url}
                          alt={`Extra ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {extraPhotos.length === 0 && (
                      <p className="text-sm text-muted-foreground italic col-span-3 text-center py-8">
                        No extra photos uploaded.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR WIDGETS */}
        <aside className="lg:col-span-3 p-5 hidden lg:flex flex-col gap-6 sticky top-0 h-sticky overflow-y-auto">
          {/* Geolocation & Verification Checklist */}
          <Card className="rounded-2xl border-border bg-card/45 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                Dating Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">
                  Status:
                </span>
                <Badge
                  className={`rounded-full text-[10px] font-bold ${canDate ? "bg-emerald-500/10 text-emerald-600" : "bg-yellow-500/10 text-yellow-600"}`}
                >
                  {canDate ? "Ready to Mingle" : "Action Required"}
                </Badge>
              </div>

              {/* Checklist */}
              <div className="flex flex-col gap-1.5 border-t border-border/40 pt-2">
                <ChecklistItem
                  label="Verified Photo"
                  checked={!!profilePhoto}
                />
                <ChecklistItem label="Verified Video" checked={!!introVideo} />
                <ChecklistItem
                  label="Dating Location"
                  checked={!!profile?.area}
                />
                <ChecklistItem
                  label="Safety Contact"
                  checked={contacts.length > 0}
                />
              </div>
            </CardContent>
          </Card>

          {/* Daily Limit Progress */}
          <Card className="rounded-2xl border-border bg-card/45 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">
                Daily Bookings Limit
              </CardTitle>
              <CardDescription className="text-[10px] capitalize">
                {tier} Membership
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Booked today</span>
                <span>
                  {summary?.requests.length ?? 0} /{" "}
                  {tier === "social" ? 2 : tier === "mingle" ? 8 : 24}
                </span>
              </div>
              <Progress
                value={
                  ((summary?.requests.length ?? 0) /
                    (tier === "social" ? 2 : tier === "mingle" ? 8 : 24)) *
                  100
                }
                className="h-2 rounded-full"
              />
            </CardContent>
          </Card>

          {/* Friends Widget */}
          <Card className="rounded-2xl border-border bg-card/45 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <UserPlus className="size-4 text-primary" />
                Dating Circle
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b pb-2 mb-1">
                <span>Circle Friends</span>
                <span>({profile?.friendInvites?.length ?? 0})</span>
              </div>
              {profile?.friendInvites && profile.friendInvites.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {profile.friendInvites.map((friend, i) => (
                    <div
                      className="flex items-center justify-between gap-2"
                      key={i}
                    >
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold truncate max-w-28 text-foreground/90">
                          {friend.email?.split("@")[0] ||
                            friend.phone ||
                            "Circle Friend"}
                        </span>
                      </div>
                      <Badge
                        className="text-[8px] font-bold uppercase rounded-full"
                        variant="secondary"
                      >
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Add friends to build your group circles.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ChecklistItem({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className={checked ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      {checked ? (
        <Check className="size-3 text-primary" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
      )}
    </div>
  );
}

function SpotCard({
  spot,
  category,
  canDate,
}: {
  spot: {
    id: string;
    name: string;
    address: string;
    rating: string;
    image: string;
    tags: string[];
  };
  category: string;
  canDate: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition duration-200 flex flex-col justify-between">
      <div className="aspect-video w-full relative bg-muted/10 border-b border-border/40">
        <img
          src={spot.image}
          alt={spot.name}
          className="w-full h-full object-cover"
        />
        <Badge
          className="absolute top-3 right-3 rounded-full bg-black/60 text-white font-bold text-[10px] flex items-center gap-0.5 border-0"
          variant="secondary"
        >
          <Star className="size-3 fill-yellow-500 text-yellow-500" />
          {spot.rating}
        </Badge>
      </div>
      <div className="p-4 flex flex-col gap-3 justify-between flex-1">
        <div className="flex flex-col gap-1">
          <h4 className="font-bold text-sm text-foreground leading-snug">
            {spot.name}
          </h4>
          <p className="text-[10px] text-muted-foreground">{spot.address}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {spot.tags.map((tag) => (
              <Badge
                key={tag}
                className="text-[9px] font-semibold rounded-full px-2 py-0"
                variant="secondary"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <Link
          to={
            canDate
              ? `/date/new?placeId=${spot.id}&placeName=${encodeURIComponent(spot.name)}`
              : "/onboarding"
          }
          className={buttonVariants({
            className: "w-full rounded-full text-xs font-bold h-9 mt-2",
            size: "sm",
          })}
        >
          📍 Plan Date Here
        </Link>
      </div>
    </div>
  );
}
