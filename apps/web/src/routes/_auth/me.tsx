import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button, buttonVariants } from "@chewbuu/ui/components/button";
import {
  Card,
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
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  Heart,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Star,
  User,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DashboardChats } from "@/features/stream/dashboard-chats";
import { authClient } from "@/lib/auth-client";
import {
  datingApi,
  getApiUrl,
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
  personName: string;
  createdAt: string;
}

type DashboardTab = "chats" | "feed" | "matches" | "profile" | "spots";
type SpotCategory = "all" | "eat" | "drink" | "play";

export const Route = createFileRoute("/_auth/me")({
  component: RouteComponent,
});

const getAge = (birthdayString: string) => {
  const birthday = new Date(birthdayString);
  if (Number.isNaN(birthday.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthOffset = today.getMonth() - birthday.getMonth();
  if (
    monthOffset < 0 ||
    (monthOffset === 0 && today.getDate() < birthday.getDate())
  ) {
    age -= 1;
  }

  return age;
};

const formatLabel = (value: string) =>
  value
    .split("_")
    .join(" ")
    .replaceAll(/\b\w/g, (letter) => letter.toUpperCase());

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DashboardTab>("feed");
  const [spotsCategory, setSpotsCategory] = useState<SpotCategory>("all");
  const [profileSubTab, setProfileSubTab] = useState<
    "intro" | "photos" | "recaps"
  >("recaps");

  const [summary, setSummary] = useState<DatingSummary | null>(null);
  const [profile, setProfile] = useState<DatingProfilePayload | null>(null);
  const [spots, setSpots] = useState<DatePlace[]>([]);
  const [spotsQuery, setSpotsQuery] = useState("");
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [readRequestIds, setReadRequestIds] = useState<string[]>([]);

  // Local state for user's own uploaded date recaps (persisted to localStorage)
  const [userRecaps, setUserRecaps] = useState<DateRecap[]>([]);
  const [showAddRecap, setShowAddRecap] = useState(false);
  const [recapForm, setRecapForm] = useState({
    placeName: "",
    placeAddress: "",
    caption: "",
    personName: "",
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

    const savedReadRequests = localStorage.getItem(
      "chewbuu_read_date_requests"
    );
    if (savedReadRequests) {
      try {
        setReadRequestIds(JSON.parse(savedReadRequests) as string[]);
      } catch (error) {
        console.error("Failed to parse read date requests:", error);
      }
    }
  }, []);

  const allRecaps = useMemo(() => {
    return userRecaps.toSorted(
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
  const profilePhotos = [
    ...(profilePhoto ? [{ url: profilePhoto }] : []),
    ...extraPhotos,
  ];
  const trustedContactCount = profile?.trustedContacts?.length ?? 0;
  const spouseInvite = profile?.friendInvites?.find(
    (invite) => invite.relationship === "spouse"
  );
  const circleInvites =
    profile?.friendInvites?.filter(
      (invite) => invite.relationship !== "spouse"
    ) ?? [];
  const circleMembers = circleInvites.filter(
    (invite) => invite.status === "joined"
  );
  const pendingCircleInvites = circleInvites.filter(
    (invite) => invite.status !== "joined"
  );
  const age = profile?.birthday ? getAge(profile.birthday) : null;
  const profileComplete = Boolean(
    profile?.bio &&
    profile?.area &&
    profile?.birthday &&
    profile?.lookingFor?.length &&
    profile?.politics &&
    profile?.religion &&
    profile?.kids &&
    profile?.wantsKids
  );
  const readinessItems = [
    { checked: profileComplete, hash: "basics", label: "Profile Details" },
    { checked: !!profilePhoto, hash: "media", label: "Verified Photo" },
    { checked: !!introVideo, hash: "media", label: "Verified Video" },
    { checked: !!profile?.area, hash: "basics", label: "Dating Location" },
    {
      checked: trustedContactCount > 0,
      hash: "friends",
      label: "Safety Contact",
    },
  ];
  const readinessReady =
    canDate && readinessItems.every((item) => item.checked);
  const pendingRequests = summary?.requests ?? [];
  const unreadRequestCount = pendingRequests.filter(
    (request) => !readRequestIds.includes(request.id)
  ).length;
  const featuredSpot = spots.find((spot) => spot.photoUrl) ?? spots[0];
  const spotsByCategory = useMemo(() => {
    const grouped: Record<Exclude<SpotCategory, "all">, DatePlace[]> = {
      drink: [],
      eat: [],
      play: [],
    };

    for (const spot of spots) {
      const normalizedTypes = spot.types.join(" ").toLowerCase();
      if (
        normalizedTypes.includes("restaurant") ||
        normalizedTypes.includes("food") ||
        normalizedTypes.includes("cafe") ||
        normalizedTypes.includes("eat")
      ) {
        grouped.eat.push(spot);
      }
      if (
        normalizedTypes.includes("bar") ||
        normalizedTypes.includes("night") ||
        normalizedTypes.includes("brewery") ||
        normalizedTypes.includes("drink")
      ) {
        grouped.drink.push(spot);
      }
      if (
        normalizedTypes.includes("entertainment") ||
        normalizedTypes.includes("bowling") ||
        normalizedTypes.includes("arcade") ||
        normalizedTypes.includes("park") ||
        normalizedTypes.includes("play")
      ) {
        grouped.play.push(spot);
      }
    }

    return grouped;
  }, [spots]);

  const setDashboardTab = (tab: DashboardTab) => {
    setActiveTab(tab);

    if (tab === "matches" && pendingRequests.length > 0) {
      const nextReadIds = Array.from(
        new Set([...readRequestIds, ...pendingRequests.map((item) => item.id)])
      );
      setReadRequestIds(nextReadIds);
      localStorage.setItem(
        "chewbuu_read_date_requests",
        JSON.stringify(nextReadIds)
      );
    }
  };

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
      photos: recapForm.photoUrl ? [recapForm.photoUrl] : [],
      caption: recapForm.caption,
      personName: recapForm.personName || "Date Partner",
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
      personName: "",
      photoUrl: "",
    });
    toast.success("Date recap uploaded to your feed!");
  };

  useEffect(() => {
    if (!profile?.area) {
      setSpots([]);
      return;
    }

    const fetchSpots = async () => {
      setIsLoadingSpots(true);
      try {
        const filters = spotsQuery.trim() ? [spotsQuery.trim()] : ["date spot"];
        const requests =
          spotsCategory === "all"
            ? (["eat", "drink", "play"] as const).map((what) =>
                datingApi.suggestPlaces({
                  area: profile.area,
                  filters,
                  latitude: profile.latitude || undefined,
                  longitude: profile.longitude || undefined,
                  what: [what],
                })
              )
            : [
                datingApi.suggestPlaces({
                  area: profile.area,
                  filters,
                  latitude: profile.latitude || undefined,
                  longitude: profile.longitude || undefined,
                  what: [spotsCategory],
                }),
              ];
        const responses = await Promise.all(requests);
        const placeById = new Map(
          responses.flatMap((response) =>
            response.places.map((place) => [place.placeId, place] as const)
          )
        );
        const places = Array.from(placeById.values());
        setSpots(places);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load nearby date spots."
        );
      } finally {
        setIsLoadingSpots(false);
      }
    };

    const timeout = window.setTimeout(() => {
      void fetchSpots();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    profile?.area,
    profile?.latitude,
    profile?.longitude,
    spotsCategory,
    spotsQuery,
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="lg:col-span-3 border-r border-border/80 p-5 hidden lg:flex flex-col justify-between sticky top-0 h-screen overflow-y-auto">
          <div className="flex flex-col gap-8 pt-16">
            {/* Menu Links */}
            <nav className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setDashboardTab("feed")}
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
                onClick={() => setDashboardTab("spots")}
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
                onClick={() => setDashboardTab("matches")}
                className={`flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === "matches"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Heart className="size-5" />
                <span>Dates</span>
                {unreadRequestCount > 0 && (
                  <Badge className="ml-auto rounded-full px-2 py-0 text-[10px]">
                    {unreadRequestCount}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("chats")}
                className={`flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === "chats"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <MessageCircle className="size-5" />
                <span>Chats</span>
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("profile")}
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
        <header className="lg:hidden border-b border-border/80 p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 w-full col-span-1">
          <div className="flex items-center gap-2">
            <img
              src="/brand/chewbuu-logo-500-trans.png"
              alt="Chewbuu"
              className="h-6 w-6"
            />
            <span className="font-extrabold tracking-tight">chewbuu</span>
          </div>
          <Link
            to={canDate ? "/date/new" : "/onboarding"}
            className={buttonVariants({
              className: "rounded-full text-xs font-semibold h-8",
              size: "sm",
            })}
          >
            <CalendarHeart className="size-4" />
            Plan a Date
          </Link>
        </header>

        {/* MAIN MIDDLE COLUMN (FEED / SPOTS / MATCHES / CHATS / PROFILE) */}
        <main className="lg:col-span-6 border-r border-border/80 min-h-screen pb-24 lg:pb-6">
          {/* FEED SUB-VIEW */}
          {activeTab === "feed" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 md:top-0 bg-background/90 backdrop-blur-md z-30 flex items-center justify-between">
                <h2 className="text-xl font-bold">Feed</h2>
                <Badge
                  className="rounded-full bg-primary/10 text-primary border-primary/20"
                  variant="outline"
                >
                  Friends & Date Requests
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
                    onClick={() => setDashboardTab("profile")}
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

              {pendingRequests.length > 0 && (
                <div className="flex flex-col gap-3 border-b border-border/80 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">Active date requests</h3>
                    {unreadRequestCount > 0 && (
                      <Badge className="rounded-full text-[10px]">
                        {unreadRequestCount} new
                      </Badge>
                    )}
                  </div>
                  {pendingRequests.slice(0, 3).map((request) => (
                    <button
                      className="flex w-full items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-left transition hover:border-primary/45 hover:bg-primary/15"
                      key={request.id}
                      onClick={() => setDashboardTab("matches")}
                      type="button"
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <CalendarHeart className="size-4" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center gap-2 font-bold text-sm">
                          {request.what.map(formatLabel).join(", ")} request
                          <Badge className="rounded-full bg-background/70 text-[9px] text-foreground">
                            Date request
                          </Badge>
                          {!readRequestIds.includes(request.id) && (
                            <span className="size-2 rounded-full bg-primary" />
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Matching around {request.searchArea} for{" "}
                          {new Date(request.scheduledAt).toLocaleString()}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {(request.places ?? []).slice(0, 3).map((place) => (
                            <Badge
                              className="rounded-full text-[10px]"
                              key={place.placeId}
                              variant="secondary"
                            >
                              {place.name}
                            </Badge>
                          ))}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Recaps Feed List */}
              <div className="flex flex-col divide-y divide-border/70">
                {allRecaps.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CalendarCheck className="size-6" />
                    </div>
                    <h3 className="font-bold text-lg">No recaps yet</h3>
                    <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm/relaxed">
                      Friend date recaps and active date-request posts will show
                      here. After your own date, you can collect photos and
                      videos into a recap and choose when to post it.
                    </p>
                    <Link
                      to={canDate ? "/date/new" : "/onboarding"}
                      className={buttonVariants({
                        className: "mt-5 rounded-full text-sm font-semibold",
                        size: "sm",
                      })}
                    >
                      {canDate ? "Plan a Date" : "Finish Profile"}
                    </Link>
                  </div>
                )}
                {allRecaps.map((recap) => (
                  <article className="p-5 flex flex-col gap-4" key={recap.id}>
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

                      <Badge className="rounded-full" variant="secondary">
                        Recap
                      </Badge>
                    </div>

                    <p className="text-sm/relaxed font-medium text-foreground">
                      {recap.caption}
                    </p>

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
                    </div>

                    {recap.photos.length > 0 && (
                      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border/80 bg-muted/20">
                        <img
                          src={recap.photos[0]}
                          alt={recap.placeName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground italic">
                      Date with{" "}
                      <span className="font-bold text-foreground">
                        {recap.personName}
                      </span>
                    </p>

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

          {activeTab === "matches" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-30">
                <h2 className="text-xl font-bold">Dates & Requests</h2>
                <p className="mt-1 text-muted-foreground text-xs">
                  Review date requests, save people for later, decline, or chat
                  once the match is ready.
                </p>
              </div>
              <div className="grid gap-4 p-5">
                {pendingRequests.length === 0 ? (
                  <Card className="rounded-2xl border-border bg-card/45">
                    <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                      <Heart className="size-8 text-primary" />
                      <CardTitle className="text-base">
                        No active date requests yet
                      </CardTitle>
                      <CardDescription className="max-w-sm">
                        Start with a date request. Chewbuu will create a match
                        room for each person found, then move the request
                        forward once you choose, friend, or decline them.
                      </CardDescription>
                      <Link
                        to={canDate ? "/date/new" : "/onboarding"}
                        className={buttonVariants({
                          className: "mt-2 rounded-full text-xs font-semibold",
                          size: "sm",
                        })}
                      >
                        {canDate ? "Request a Date" : "Finish Profile"}
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  pendingRequests.map((request) => (
                    <Card
                      className="rounded-2xl border-border bg-card/45"
                      key={request.id}
                    >
                      <CardHeader>
                        <CardTitle className="text-base">
                          {request.what.map(formatLabel).join(", ")} date
                        </CardTitle>
                        <CardDescription>
                          {new Date(request.scheduledAt).toLocaleString()} in{" "}
                          {request.searchArea}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                          {request.places?.length ? (
                            request.places.map((place) => (
                              <Badge key={place.placeId} variant="secondary">
                                {place.name}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="secondary">Places pending</Badge>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Button
                            className="rounded-full"
                            onClick={() => setDashboardTab("chats")}
                            size="sm"
                          >
                            <MessageSquare className="mr-1.5 size-4" />
                            Match Rooms
                          </Button>
                          <Button
                            className="rounded-full"
                            disabled
                            size="sm"
                            variant="outline"
                          >
                            Save Soon
                          </Button>
                          <Button
                            className="rounded-full"
                            disabled
                            size="sm"
                            variant="ghost"
                          >
                            Decline Soon
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* CHATS SUB-VIEW (Stream) */}
          {activeTab === "chats" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-30">
                <h2 className="text-xl font-bold">Chats</h2>
                <p className="mt-1 text-muted-foreground text-xs">
                  Your regular friend DMs stay here. Date requests also create
                  match rooms until you choose, friend, or decline each person.
                </p>
              </div>
              <DashboardChats />
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
                    onChange={(event) => setSpotsQuery(event.target.value)}
                    placeholder={`Search Eat, Drink, Play spots in ${profile?.area || "Nashville, TN"}...`}
                    value={spotsQuery}
                  />
                </div>
              </div>

              {/* Category selector pills */}
              <div className="flex gap-2 overflow-x-auto px-5 py-4 border-b border-border/80 scrollbar-none">
                {["all", "eat", "drink", "play"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSpotsCategory(cat as SpotCategory)}
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

              <div className="p-5 flex flex-col gap-8">
                {isLoadingSpots ? (
                  <p className="text-sm text-muted-foreground">
                    Finding nearby date spots...
                  </p>
                ) : spots.length === 0 ? (
                  <Card className="rounded-2xl border-border bg-card/45">
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      Add your dating location in onboarding to fetch real spots
                      near you.
                    </CardContent>
                  </Card>
                ) : spotsCategory === "all" ? (
                  <>
                    {featuredSpot && (
                      <section className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-lg">Featured nearby</h3>
                          <Badge className="rounded-full bg-primary/10 text-primary">
                            Spot partner
                          </Badge>
                        </div>
                        <SpotCard
                          canDate={canDate}
                          featured
                          spot={featuredSpot}
                        />
                      </section>
                    )}
                    {(["eat", "drink", "play"] as const).map((category) => {
                      const categorySpots =
                        spotsByCategory[category].length > 0
                          ? spotsByCategory[category]
                          : spots.filter(
                              (spot) => spot.placeId !== featuredSpot?.placeId
                            );

                      return (
                        <SpotSection
                          canDate={canDate}
                          category={category}
                          key={category}
                          onViewAll={() => setSpotsCategory(category)}
                          spots={categorySpots.slice(0, 6)}
                        />
                      );
                    })}
                  </>
                ) : (
                  <section className="flex flex-col gap-4">
                    <h3 className="font-bold text-lg text-foreground flex items-center justify-between">
                      <span className="capitalize">
                        {spotsCategory} spots near{" "}
                        {profile?.area || "your saved area"}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {spots.map((spot) => (
                        <SpotCard
                          key={spot.placeId}
                          spot={spot}
                          canDate={canDate}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}

          {/* PROFILE SUB-VIEW (Instagram Style) */}
          {activeTab === "profile" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-30 flex items-center justify-between">
                <h2 className="text-xl font-bold">My Profile</h2>
                <div className="flex items-center gap-2">
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
                  <Button
                    aria-label="Sign out"
                    className="rounded-full lg:hidden"
                    onClick={handleSignOut}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </div>
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
                        {circleMembers.length}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                        Friends
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-lg md:text-xl text-foreground">
                        {circleInvites.length}
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
                    {age ? (
                      <span className="text-muted-foreground font-semibold">
                        {age}
                      </span>
                    ) : null}
                    <Check className="size-4 text-primary fill-primary/10 rounded-full" />
                  </h3>
                  {profile?.occupation && (
                    <p className="text-xs font-semibold text-muted-foreground">
                      {profile.occupation}
                    </p>
                  )}
                  {profile?.bio && (
                    <p className="text-sm text-foreground/90 mt-1 max-w-xl">
                      {profile.bio}
                    </p>
                  )}

                  {/* Private Details */}
                  {spouseInvite && (
                    <p className="text-xs text-muted-foreground">
                      Spouse or partner invited:{" "}
                      <span className="font-semibold text-foreground">
                        @
                        {spouseInvite.name ||
                          spouseInvite.email?.split("@")[0] ||
                          spouseInvite.phone ||
                          "pending"}
                      </span>
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile?.lookingFor?.map((item) => (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold rounded-full px-2.5 py-0.5"
                        key={item}
                      >
                        {item}
                      </Badge>
                    ))}
                    {profile?.kids && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold rounded-full px-2.5 py-0.5"
                      >
                        {profile.kids}
                      </Badge>
                    )}
                    {profile?.wantsKids && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold rounded-full px-2.5 py-0.5"
                      >
                        {profile.wantsKids}
                      </Badge>
                    )}
                  </div>
                </div>
                {profilePhotos.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pt-2">
                    {profilePhotos.slice(0, 6).map((photo, index) => (
                      <div
                        className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted/20"
                        key={`${photo.url}-${index}`}
                      >
                        <img
                          alt={`Profile ${index + 1}`}
                          className="h-full w-full object-cover"
                          src={photo.url}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile widgets (desktop shows them in the right rail) */}
              <div className="flex flex-col gap-4 p-5 lg:hidden">
                <DashboardWidgets
                  circleMembers={circleMembers}
                  pendingCircleInvites={pendingCircleInvites}
                  readinessItems={readinessItems}
                  readinessReady={readinessReady}
                  requestsCount={summary?.requests.length ?? 0}
                  tier={tier}
                />
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
                  Recaps
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
                      Upload New Date Recap
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

                    <div className="grid gap-4 md:grid-cols-2">
                      {userRecaps.map((recap) => (
                        <div
                          className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition duration-200"
                          key={recap.id}
                        >
                          {recap.photos[0] && (
                            <div className="aspect-video w-full relative bg-muted/10">
                              <img
                                src={recap.photos[0]}
                                alt={recap.placeName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="p-4 flex flex-col gap-2">
                            <span className="font-bold text-xs text-primary">
                              {recap.placeName}
                            </span>
                            <p className="text-xs text-foreground/90 font-medium truncate">
                              {recap.caption}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 border-t pt-2">
                              <span>With {recap.personName}</span>
                              <span>
                                {new Date(recap.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {userRecaps.length === 0 && (
                        <p className="text-sm text-muted-foreground italic col-span-2 text-center py-8">
                          No date recaps uploaded yet. Go on dates to post
                          recaps.
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
        <aside className="hidden lg:flex lg:col-span-3 p-5 flex-col gap-6 sticky top-0 h-screen overflow-y-auto">
          <DashboardWidgets
            circleMembers={circleMembers}
            pendingCircleInvites={pendingCircleInvites}
            readinessItems={readinessItems}
            readinessReady={readinessReady}
            requestsCount={summary?.requests.length ?? 0}
            tier={tier}
          />
        </aside>

        {/* MOBILE BOTTOM TAB BAR */}
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-background/90 backdrop-blur-md lg:hidden">
          <div className="grid grid-cols-5">
            {(
              [
                { icon: Home, label: "Feed", tab: "feed" },
                { icon: MapPin, label: "Spots", tab: "spots" },
                { icon: Heart, label: "Dates", tab: "matches" },
                { icon: MessageCircle, label: "Chats", tab: "chats" },
                { icon: User, label: "Profile", tab: "profile" },
              ] as const
            ).map((item) => (
              <button
                aria-label={item.label}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition ${
                  activeTab === item.tab
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                key={item.tab}
                onClick={() => setDashboardTab(item.tab)}
                type="button"
              >
                <span className="relative">
                  <item.icon className="size-5" />
                  {item.tab === "matches" && unreadRequestCount > 0 && (
                    <span className="-right-2 -top-1 absolute flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                      {unreadRequestCount}
                    </span>
                  )}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

interface CircleInvite {
  email?: string;
  name?: string;
  phone?: string;
  status?: string;
}

function DashboardWidgets({
  circleMembers,
  pendingCircleInvites,
  readinessItems,
  readinessReady,
  requestsCount,
  tier,
}: {
  circleMembers: CircleInvite[];
  pendingCircleInvites: CircleInvite[];
  readinessItems: { checked: boolean; hash: string; label: string }[];
  readinessReady: boolean;
  requestsCount: number;
  tier: string;
}) {
  const dailyLimit = tier === "social" ? 2 : tier === "mingle" ? 8 : 24;

  return (
    <>
      {/* Verification Checklist */}
      {!readinessReady && (
        <Card className="rounded-2xl border-border bg-card/45 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" />
              Dating Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Status:</span>
              <Badge className="rounded-full bg-red-500/10 text-[10px] font-bold text-red-500">
                Action Required
              </Badge>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border/40 pt-2">
              {readinessItems.map((item) => (
                <ChecklistItem
                  checked={item.checked}
                  hash={item.hash}
                  key={item.label}
                  label={item.label}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              {requestsCount} / {dailyLimit}
            </span>
          </div>
          <Progress
            value={(requestsCount / dailyLimit) * 100}
            className="h-2 rounded-full"
          />
        </CardContent>
      </Card>

      {/* Dating Circle */}
      <Card className="rounded-2xl border-border bg-card/45 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
            <UserPlus className="size-4 text-primary" />
            Dating Circle
          </CardTitle>
          <CardDescription className="text-[10px]">
            Friends join once they finish setting up their account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b pb-2 mb-1">
            <span>Members</span>
            <span>({circleMembers.length})</span>
          </div>
          {circleMembers.length > 0 ? (
            <div className="flex flex-col gap-2">
              {circleMembers.map((friend, i) => (
                <div
                  className="flex items-center justify-between gap-2"
                  key={friend.email ?? friend.phone ?? i}
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold truncate max-w-28 text-foreground/90">
                      {friend.name ||
                        friend.email?.split("@")[0] ||
                        friend.phone ||
                        "Circle Friend"}
                    </span>
                  </div>
                  <Badge className="text-[8px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-600">
                    In circle
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No one is in your circle yet.
            </p>
          )}
          {pendingCircleInvites.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b pb-2 mb-1 mt-2">
                <span>Invites</span>
                <span>({pendingCircleInvites.length})</span>
              </div>
              <div className="flex flex-col gap-2">
                {pendingCircleInvites.map((friend, i) => (
                  <div
                    className="flex items-center justify-between gap-2"
                    key={friend.email ?? friend.phone ?? i}
                  >
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold truncate max-w-28 text-muted-foreground">
                        {friend.name ||
                          friend.email?.split("@")[0] ||
                          friend.phone ||
                          "Invited Friend"}
                      </span>
                    </div>
                    <Badge
                      className="text-[8px] font-bold uppercase rounded-full"
                      variant="secondary"
                    >
                      {friend.status === "sent" ? "Invited" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function ChecklistItem({
  label,
  checked,
  hash,
}: {
  label: string;
  checked: boolean;
  hash: string;
}) {
  return (
    <Link
      className="flex items-center justify-between rounded-full px-2 py-1 text-[11px] transition hover:bg-muted"
      hash={hash}
      to="/onboarding"
    >
      <span className={checked ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        aria-label={checked ? "Complete" : "Incomplete"}
        className={`h-2.5 w-2.5 rounded-full ${
          checked ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
    </Link>
  );
}

function SpotSection({
  category,
  spots,
  canDate,
  onViewAll,
}: {
  category: Exclude<SpotCategory, "all">;
  spots: DatePlace[];
  canDate: boolean;
  onViewAll: () => void;
}) {
  if (spots.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-lg capitalize">{category}</h3>
        <Button
          className="rounded-full px-3 text-xs"
          onClick={onViewAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          View all
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1">
        {spots.map((spot) => (
          <div className="w-72 shrink-0" key={spot.placeId}>
            <SpotCard canDate={canDate} spot={spot} />
          </div>
        ))}
      </div>
    </section>
  );
}

const formatPlaceType = (value: string) =>
  value
    .split("_")
    .join(" ")
    .replaceAll(/\b\w/g, (letter) => letter.toUpperCase());

const formatPriceLevel = (value?: string) => {
  if (!value) return null;

  const prices: Record<string, string> = {
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  };

  return prices[value] ?? null;
};

function SpotCard({
  spot,
  canDate,
  featured = false,
}: {
  spot: DatePlace;
  canDate: boolean;
  featured?: boolean;
}) {
  const price = formatPriceLevel(spot.priceLevel);
  const photoSrc = spot.photoUrl?.startsWith("/")
    ? getApiUrl(spot.photoUrl)
    : spot.photoUrl;

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition duration-200 hover:border-primary/35 hover:shadow-md ${
        featured ? "md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" : ""
      }`}
    >
      <div
        className={`relative bg-muted/20 ${
          featured ? "min-h-56 md:min-h-full" : "aspect-[4/3]"
        }`}
      >
        {photoSrc ? (
          <img
            alt={spot.name}
            className="h-full w-full object-cover"
            src={photoSrc}
          />
        ) : (
          <div className="flex h-full min-h-40 items-center justify-center text-primary">
            <MapPin className="size-8" />
          </div>
        )}
        {spot.rating && (
          <Badge className="absolute right-3 top-3 rounded-full bg-background/90 font-bold text-[10px] text-foreground shadow-sm">
            <Star className="size-3 fill-yellow-500 text-yellow-500" />
            {spot.rating}
            {spot.userRatingCount ? (
              <span className="text-muted-foreground">
                ({spot.userRatingCount})
              </span>
            ) : null}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-4 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-bold text-sm text-foreground leading-snug">
              {spot.name}
            </h4>
            {typeof spot.openNow === "boolean" && (
              <Badge
                className={`shrink-0 rounded-full text-[10px] ${
                  spot.openNow
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                }`}
                variant="secondary"
              >
                <Clock className="size-3" />
                {spot.openNow ? "Open" : "Closed"}
              </Badge>
            )}
          </div>
          {spot.address && (
            <p className="text-[10px] text-muted-foreground">{spot.address}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {price && (
              <Badge
                className="rounded-full px-2 py-0 text-[9px] font-semibold"
                variant="secondary"
              >
                {price}
              </Badge>
            )}
            {spot.types.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                className="text-[9px] font-semibold rounded-full px-2 py-0"
                variant="secondary"
              >
                {formatPlaceType(tag)}
              </Badge>
            ))}
          </div>
          {spot.attributions?.length ? (
            <p className="text-[9px] text-muted-foreground">
              Photo: {spot.attributions.join(", ")}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          {canDate ? (
            <Link
              className={buttonVariants({
                className: "w-full rounded-full text-xs font-bold h-9",
                size: "sm",
              })}
              search={{ placeId: spot.placeId, placeName: spot.name }}
              to="/date/new"
            >
              <MapPin className="mr-1.5 size-4" />
              Plan Date Here
            </Link>
          ) : (
            <Link
              className={buttonVariants({
                className: "w-full rounded-full text-xs font-bold h-9",
                size: "sm",
              })}
              to="/onboarding"
            >
              <MapPin className="mr-1.5 size-4" />
              Finish Profile
            </Link>
          )}
          <div className="flex gap-2">
            {spot.googleMapsUri && (
              <a
                className={buttonVariants({
                  className: "flex-1 rounded-full text-xs font-semibold h-8",
                  size: "sm",
                  variant: "outline",
                })}
                href={spot.googleMapsUri}
                rel="noopener"
                target="_blank"
              >
                Maps
                <ExternalLink className="size-3.5" />
              </a>
            )}
            {spot.websiteUri && (
              <a
                className={buttonVariants({
                  className: "flex-1 rounded-full text-xs font-semibold h-8",
                  size: "sm",
                  variant: "outline",
                })}
                href={spot.websiteUri}
                rel="noopener"
                target="_blank"
              >
                Site
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
