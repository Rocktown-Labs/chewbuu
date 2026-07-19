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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import { Input } from "@chewbuu/ui/components/input";
import { Progress } from "@chewbuu/ui/components/progress";
import { Textarea } from "@chewbuu/ui/components/textarea";
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  CalendarHeart,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  ExternalLink,
  Heart,
  Home,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Star,
  User,
  UserPlus,
  Video,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

type DashboardTab =
  | "calendar"
  | "chats"
  | "feed"
  | "matches"
  | "notifications"
  | "profile"
  | "spots";
type SpotCategory = "all" | "eat" | "drink" | "play";
type DateHistoryMatchStatus =
  | "accepted"
  | "declined"
  | "friended"
  | "saved"
  | "suggested";

interface DateHistoryMatch {
  compatibility: number;
  displayName: string;
  id: string;
  note: string;
  photoUrl?: string;
  status: DateHistoryMatchStatus;
  tags: string[];
}

interface DateHistoryItem {
  acceptedMatchId: string;
  chatSummary: string[];
  content: {
    label: string;
    status: string;
  }[];
  id: string;
  matches: DateHistoryMatch[];
  places: DatePlace[];
  requesterView: boolean;
  scheduledAt: string;
  searchArea: string;
  status: string;
  timeline: {
    label: string;
    tone: "done" | "live" | "muted";
    value: string;
  }[];
  title: string;
  what: string[];
}

export const Route = createFileRoute("/_auth/me")({
  component: RouteComponent,
});

interface MePageProps {
  initialChatId?: string;
  initialDateId?: string;
  initialSpotsCategory?: SpotCategory;
  initialTab?: DashboardTab;
}

type DashboardChatsComponent = ComponentType<{ activeChannelId?: string }>;
type ProfileMode = "edit" | "menu" | "profile" | "settings";
type ProfileStatTarget = "circles" | "friends" | "recaps";
type ProfileMediaItem = {
  kind: "intro_video" | "photo" | "profile_photo";
  label: string;
  url: string;
};

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

const demoDateHistory: DateHistoryItem = {
  acceptedMatchId: "demo-match-maya",
  chatSummary: [
    "Maya sent an intro and picked the booth by the window.",
    "You confirmed 7:30 PM and shared the second spot.",
    "After the date, Maya was added to Friends, so future messages move to Chats.",
  ],
  content: [
    { label: "Food photo", status: "Saved to recap draft" },
    { label: "Outfit check", status: "Private" },
    { label: "Recap video", status: "Waiting for review" },
  ],
  id: "demo-date-123456",
  matches: [
    {
      compatibility: 94,
      displayName: "Maya",
      id: "demo-match-maya",
      note: "Accepted the plan, exchanged videos, and became a friend after the date.",
      photoUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=70",
      status: "friended",
      tags: ["Live music", "Tacos", "Low-pressure"],
    },
    {
      compatibility: 88,
      displayName: "Jordan",
      id: "demo-match-jordan",
      note: "Saved for later. Date-room history stays attached to this request.",
      photoUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=70",
      status: "saved",
      tags: ["Pool", "Sports", "Coffee"],
    },
    {
      compatibility: 83,
      displayName: "Riley",
      id: "demo-match-riley",
      note: "Declined by requester. This person does not move to friend chat.",
      photoUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=70",
      status: "declined",
      tags: ["Comedy", "Dessert", "Group hangs"],
    },
  ],
  places: [
    {
      address: "East Nashville",
      name: "The Golden Booth",
      placeId: "demo-place-golden-booth",
      rating: "4.7",
      types: ["restaurant", "bar", "date_fit"],
    },
    {
      address: "Main Street",
      name: "Cue & Co.",
      placeId: "demo-place-cue",
      rating: "4.6",
      types: ["pool", "play", "combo"],
    },
    {
      address: "Downtown",
      name: "Third Place Coffee",
      placeId: "demo-place-third",
      rating: "4.8",
      types: ["cafe", "talk", "quiet"],
    },
  ],
  requesterView: true,
  scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
  searchArea: "Nashville, TN",
  status: "Review due",
  timeline: [
    { label: "Request", tone: "done", value: "3 spots selected" },
    { label: "Matcher", tone: "done", value: "40 candidates reviewed" },
    { label: "Choice", tone: "done", value: "Maya accepted" },
    { label: "Date", tone: "live", value: "Review + recap open" },
  ],
  title: "Eat, Play, Talk date",
  what: ["eat", "play", "talk"],
};

function RouteComponent() {
  return <MePage />;
}

export function MePage({
  initialChatId,
  initialDateId,
  initialSpotsCategory = "all",
  initialTab = "feed",
}: MePageProps) {
  const { session } = useRouteContext({ from: "/_auth" });
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [spotsCategory, setSpotsCategory] =
    useState<SpotCategory>(initialSpotsCategory);
  const [profileMode, setProfileMode] = useState<ProfileMode>("profile");
  const [profileStatTarget, setProfileStatTarget] =
    useState<ProfileStatTarget | null>(null);
  const [profilePhotoActionsOpen, setProfilePhotoActionsOpen] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<ProfileMediaItem | null>(null);

  const [summary, setSummary] = useState<DatingSummary | null>(null);
  const [profile, setProfile] = useState<DatingProfilePayload | null>(null);
  const [spots, setSpots] = useState<DatePlace[]>([]);
  const [spotsQuery, setSpotsQuery] = useState("");
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [readRequestIds, setReadRequestIds] = useState<string[]>([]);
  const [selectedDateHistoryId, setSelectedDateHistoryId] = useState<
    null | string
  >(initialDateId ?? null);
  const [dashboardChatsComponent, setDashboardChatsComponent] =
    useState<DashboardChatsComponent | null>(null);

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

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSpotsCategory(initialSpotsCategory);
  }, [initialSpotsCategory]);

  useEffect(() => {
    setSelectedDateHistoryId(initialDateId ?? null);
  }, [initialDateId]);

  useEffect(() => {
    if (activeTab !== "chats" || dashboardChatsComponent) return;

    let active = true;

    const loadChats = async () => {
      const module = await import("@/features/stream/dashboard-chats");
      if (active) {
        setDashboardChatsComponent(() => module.DashboardChats);
      }
    };

    void loadChats();

    return () => {
      active = false;
    };
  }, [activeTab, dashboardChatsComponent]);

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
  const profileMediaItems: ProfileMediaItem[] = [
    ...(introVideo
      ? [
          {
            kind: "intro_video" as const,
            label: "Verified intro",
            url: introVideo,
          },
        ]
      : []),
    ...(profilePhoto
      ? [
          {
            kind: "profile_photo" as const,
            label: "Profile photo",
            url: profilePhoto,
          },
        ]
      : []),
    ...extraPhotos.map((photo, index) => ({
      kind: "photo" as const,
      label: `Photo ${index + 1}`,
      url: photo.url,
    })),
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
  const circleGroups = [
    {
      id: "close-friends",
      members: circleMembers,
      name: "Close Friends",
      pending: pendingCircleInvites,
    },
  ];
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
  const selectedDateHistory =
    selectedDateHistoryId === demoDateHistory.id ? demoDateHistory : null;
  const unreadRequestCount = pendingRequests.filter(
    (request) => !readRequestIds.includes(request.id)
  ).length;
  const calendarBadgeCount = pendingRequests.length;
  const chatBadgeCount = pendingRequests.length;
  const notificationBadgeCount =
    unreadRequestCount + (summary?.readiness.pendingReviews ?? 0);
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

  const routeForTab = (tab: DashboardTab) => {
    if (tab === "calendar") return "/me/calendar";
    if (tab === "chats")
      return initialChatId ? `/me/chats/${initialChatId}` : "/me/chats";
    if (tab === "matches") return "/me/dates";
    if (tab === "notifications") return "/me/notifications";
    if (tab === "profile") return "/me/profile";
    if (tab === "spots") return `/me/spots/${spotsCategory}`;
    return "/me";
  };

  const pushMePath = (path: string) => {
    window.history.pushState(null, "", path);
  };

  const setSpotCategory = (category: SpotCategory) => {
    setSpotsCategory(category);
    if (activeTab === "spots") {
      pushMePath(`/me/spots/${category}`);
    }
  };

  const setDashboardTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    pushMePath(routeForTab(tab));
    if (tab !== "profile") {
      setProfileStatTarget(null);
    }

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

  const openProfileMore = () => {
    setActiveTab("profile");
    setProfileMode("menu");
    setProfileStatTarget(null);
    pushMePath("/me/profile");
  };

  const openProfileMode = (mode: ProfileMode) => {
    setActiveTab("profile");
    setProfileMode(mode);
    setProfileStatTarget(null);
    pushMePath("/me/profile");
  };

  const openDateHistory = (dateId: string) => {
    setSelectedDateHistoryId(dateId);
    pushMePath(`/me/dates/${dateId}`);
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

  const ChatView = dashboardChatsComponent;

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
                {chatBadgeCount > 0 && (
                  <Badge className="ml-auto rounded-full px-2 py-0 text-[10px]">
                    {chatBadgeCount}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("calendar")}
                className={`flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === "calendar"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <CalendarCheck className="size-5" />
                <span>Calendar</span>
                {calendarBadgeCount > 0 && (
                  <Badge className="ml-auto rounded-full px-2 py-0 text-[10px]">
                    {calendarBadgeCount}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("notifications")}
                className={`flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === "notifications"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Bell className="size-5" />
                <span>Notifications</span>
                {notificationBadgeCount > 0 && (
                  <Badge className="ml-auto rounded-full px-2 py-0 text-[10px]">
                    {notificationBadgeCount}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => openProfileMode("profile")}
                className={`flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <User className="size-5" />
                <span>My Profile</span>
              </button>
              <button
                type="button"
                onClick={() => openProfileMode("edit")}
                className="flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
              >
                <ClipboardList className="size-5" />
                <span>Edit Profile</span>
              </button>
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
                      onClick={() => {
                        setDashboardTab("matches");
                        setSelectedDateHistoryId(request.id);
                        pushMePath(`/me/dates/${request.id}`);
                      }}
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
                {selectedDateHistory ? (
                  <div className="flex items-start gap-3">
                    <Button
                      aria-label="Back to dates"
                      className="mt-0.5 rounded-full"
                      onClick={() => {
                        setSelectedDateHistoryId(null);
                        pushMePath("/me/dates");
                      }}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                      <h2 className="text-xl font-bold">
                        {selectedDateHistory.title}
                      </h2>
                      <p className="mt-1 text-muted-foreground text-xs">
                        Date request #
                        {selectedDateHistory.id.replace("demo-date-", "")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold">Dates & Requests</h2>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Request history, match options, date rooms, reviews, and
                      recap content live here.
                    </p>
                  </>
                )}
              </div>
              <div className="grid gap-4 p-5">
                {selectedDateHistory ? (
                  <DateHistoryDetail
                    date={selectedDateHistory}
                    onShowChats={() => setDashboardTab("chats")}
                  />
                ) : (
                  <>
                    <DateHistoryNotification
                      date={demoDateHistory}
                      onOpen={() => openDateHistory(demoDateHistory.id)}
                    />
                    {pendingRequests.length === 0 ? (
                      <Card className="rounded-2xl border-border bg-card/45">
                        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                          <Heart className="size-8 text-primary" />
                          <CardTitle className="text-base">
                            No active date requests yet
                          </CardTitle>
                          <CardDescription className="max-w-sm">
                            Start with a date request. Chewbuu will create a
                            match room for each person found, then move the
                            request forward once you choose, friend, or decline
                            them.
                          </CardDescription>
                          <Link
                            to={canDate ? "/date/new" : "/onboarding"}
                            className={buttonVariants({
                              className:
                                "mt-2 rounded-full text-xs font-semibold",
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
                              {new Date(request.scheduledAt).toLocaleString()}{" "}
                              in {request.searchArea}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2">
                              {request.places?.length ? (
                                request.places.map((place) => (
                                  <Badge
                                    key={place.placeId}
                                    variant="secondary"
                                  >
                                    {place.name}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="secondary">
                                  Places pending
                                </Badge>
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
                  </>
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
              {ChatView ? (
                <ChatView activeChannelId={initialChatId} />
              ) : (
                <div className="p-5">
                  <Card className="rounded-2xl border-border bg-card/45">
                    <CardHeader>
                      <CardTitle className="text-base">Opening chats</CardTitle>
                      <CardDescription>
                        Loading friend DMs and date-request match rooms.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              )}
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
                    onClick={() => setSpotCategory(cat as SpotCategory)}
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
                          onViewAll={() => setSpotCategory(category)}
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

          {activeTab === "calendar" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-30">
                <h2 className="text-xl font-bold">Calendar</h2>
                <p className="mt-1 text-muted-foreground text-xs">
                  Booked date requests and confirmed plans show up here.
                </p>
              </div>
              <div className="grid gap-4 p-5">
                {[demoDateHistory, ...pendingRequests].map((request) => {
                  const requestId =
                    "id" in request ? request.id : demoDateHistory.id;
                  const requestDate = new Date(request.scheduledAt);
                  const places = request.places ?? [];

                  return (
                    <Card
                      className="rounded-2xl border-border bg-card/45"
                      key={requestId}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">
                              {request.what.map(formatLabel).join(", ")} date
                            </CardTitle>
                            <CardDescription>
                              {requestDate.toLocaleDateString()} at{" "}
                              {requestDate.toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </CardDescription>
                          </div>
                          <Badge className="rounded-full capitalize">
                            {request.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                          {request.searchArea}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {places.slice(0, 3).map((place) => (
                            <Badge
                              className="rounded-full"
                              key={place.placeId}
                              variant="secondary"
                            >
                              {place.name}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          className="w-fit rounded-full"
                          onClick={() => openDateHistory(requestId)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          View date
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-30">
                <h2 className="text-xl font-bold">Notifications</h2>
                <p className="mt-1 text-muted-foreground text-xs">
                  New date requests, match rooms, reviews, and safety updates.
                </p>
              </div>
              <div className="grid gap-3 p-5">
                {pendingRequests.map((request) => (
                  <button
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card/45 p-4 text-left transition hover:border-primary/40"
                    key={request.id}
                    onClick={() => {
                      setDashboardTab("matches");
                      pushMePath(`/me/dates/${request.id}`);
                    }}
                    type="button"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CalendarHeart className="size-4" />
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="font-bold text-sm">
                        Date request is matching
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {request.what.map(formatLabel).join(", ")} around{" "}
                        {request.searchArea}
                      </span>
                    </span>
                    {!readRequestIds.includes(request.id) && (
                      <span className="ml-auto mt-1 size-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
                {(summary?.readiness.pendingReviews ?? 0) > 0 && (
                  <Card className="rounded-2xl border-primary/30 bg-primary/10">
                    <CardContent className="flex items-start gap-3 p-4">
                      <Star className="mt-0.5 size-4 text-primary" />
                      <div>
                        <p className="font-bold text-sm">Review due</p>
                        <p className="text-xs text-muted-foreground">
                          Finish your date review before booking again.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {notificationBadgeCount === 0 && (
                  <Card className="rounded-2xl border-border bg-card/45">
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                      No new notifications.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* PROFILE SUB-VIEW (Instagram Style) */}
          {activeTab === "profile" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-30 flex items-center justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold">
                    {profileMode === "settings"
                      ? "Settings"
                      : profileMode === "edit"
                        ? "Edit Profile"
                        : profileMode === "menu"
                          ? "More"
                          : "My Profile"}
                  </h2>
                  {profileMode === "profile" && (
                    <MobileDailyLimit
                      requestsCount={summary?.requests.length ?? 0}
                      tier={tier}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-full text-xs font-semibold h-8"
                    onClick={() =>
                      setProfileMode(
                        profileMode === "edit" ? "profile" : "edit"
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {profileMode === "edit" ? "View Profile" : "Edit Profile"}
                  </Button>
                  <Button
                    aria-label="Sign out"
                    className="rounded-full"
                    onClick={openProfileMore}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Menu className="size-4" />
                  </Button>
                </div>
              </div>

              {profileMode === "menu" && (
                <ProfileMoreMenu
                  onEdit={() => setProfileMode("edit")}
                  onSettings={() => setProfileMode("settings")}
                  onSignOut={handleSignOut}
                  onViewProfile={() => setProfileMode("profile")}
                  tier={tier}
                />
              )}

              {profileMode === "settings" && (
                <ProfileSettingsPanel profile={profile} tier={tier} />
              )}

              {profileMode === "edit" && (
                <ProfileEditPanel
                  profile={profile}
                  setProfileMode={setProfileMode}
                  tier={tier}
                />
              )}

              {profileMode === "profile" && (
                <>
                  {/* Instagram Header */}
                  <div className="p-5 flex flex-col gap-5 border-b border-border/80">
                    <div className="flex items-center gap-6 md:gap-10">
                      <button
                        aria-label="Profile photo actions"
                        className="rounded-full"
                        onClick={() => setProfilePhotoActionsOpen(true)}
                        type="button"
                      >
                        <Avatar className="size-20 md:size-24 border-2 border-primary/20 shadow-md">
                          {profilePhoto && <AvatarImage src={profilePhoto} />}
                          <AvatarFallback className="font-bold text-lg uppercase bg-primary/10 text-primary">
                            {displayName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                      <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                        <button
                          className="flex flex-col rounded-xl px-2 py-1 transition hover:bg-card/60"
                          onClick={() => setProfileStatTarget("recaps")}
                          type="button"
                        >
                          <span className="font-extrabold text-lg md:text-xl text-foreground">
                            {
                              allRecaps.filter(
                                (r) => r.userName === displayName
                              ).length
                            }
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                            Recaps
                          </span>
                        </button>
                        <button
                          className="flex flex-col border-x border-border/80 px-2 py-1 transition hover:bg-card/60"
                          onClick={() => setProfileStatTarget("friends")}
                          type="button"
                        >
                          <span className="font-extrabold text-lg md:text-xl text-foreground flex items-center justify-center gap-0.5">
                            {circleMembers.length}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                            Friends
                          </span>
                        </button>
                        <button
                          className="flex flex-col rounded-xl px-2 py-1 transition hover:bg-card/60"
                          onClick={() => setProfileStatTarget("circles")}
                          type="button"
                        >
                          <span className="font-extrabold text-lg md:text-xl text-foreground">
                            {circleGroups.length}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                            Circles
                          </span>
                        </button>
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
                            className="rounded-full bg-primary px-2.5 py-0.5 font-bold text-[10px] text-primary-foreground"
                            key={item}
                          >
                            {item}
                          </Badge>
                        ))}
                        {profile?.kids && (
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-primary px-2.5 py-0.5 font-bold text-[10px] text-primary-foreground"
                          >
                            {profile.kids}
                          </Badge>
                        )}
                        {profile?.wantsKids && (
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-primary px-2.5 py-0.5 font-bold text-[10px] text-primary-foreground"
                          >
                            {profile.wantsKids}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ProfileMediaRail
                      media={profileMediaItems}
                      onOpen={setMediaViewer}
                    />
                    <ProfileStatPanel
                      circleGroups={circleGroups}
                      recapsCount={
                        allRecaps.filter((r) => r.userName === displayName)
                          .length
                      }
                      target={profileStatTarget}
                    />
                  </div>

                  {/* Profile Recaps */}
                  <div className="flex border-b border-border/80">
                    <button
                      type="button"
                      className="flex-1 border-primary border-b-2 py-3 font-bold text-primary text-xs uppercase tracking-wider transition duration-200"
                    >
                      Recaps
                    </button>
                  </div>

                  {/* Profile Sub-tab Content */}
                  <div className="p-5">
                    <div className="flex flex-col gap-6">
                      <Link
                        className={buttonVariants({
                          className:
                            "w-full rounded-full border border-dashed border-primary/45 bg-primary/5 font-bold text-primary hover:bg-primary/10",
                        })}
                        to={canDate ? "/date/new" : "/onboarding"}
                      >
                        <CalendarHeart className="size-4" />
                        Book a Date to Capture a Recap
                      </Link>

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
                                  {new Date(
                                    recap.createdAt
                                  ).toLocaleDateString()}
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
                  </div>
                </>
              )}
              <Dialog
                onOpenChange={(open) => setProfilePhotoActionsOpen(open)}
                open={profilePhotoActionsOpen}
              >
                <DialogContent className="rounded-2xl bg-card">
                  <DialogHeader>
                    <DialogTitle>Profile media</DialogTitle>
                    <DialogDescription>
                      Choose how you want to open your profile media.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-2">
                    <Button
                      className="rounded-full justify-start"
                      disabled={!profilePhoto}
                      onClick={() => {
                        if (profilePhoto) {
                          setMediaViewer({
                            kind: "profile_photo",
                            label: "Profile photo",
                            url: profilePhoto,
                          });
                          setProfilePhotoActionsOpen(false);
                        }
                      }}
                      type="button"
                      variant="outline"
                    >
                      <Eye className="size-4" />
                      View image
                    </Button>
                    <Button
                      className="rounded-full justify-start"
                      disabled={!introVideo}
                      onClick={() => {
                        if (introVideo) {
                          setMediaViewer({
                            kind: "intro_video",
                            label: "Verified intro",
                            url: introVideo,
                          });
                          setProfilePhotoActionsOpen(false);
                        }
                      }}
                      type="button"
                    >
                      <Play className="size-4" />
                      Play intro
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog
                onOpenChange={(open) => !open && setMediaViewer(null)}
                open={!!mediaViewer}
              >
                <DialogContent className="rounded-2xl bg-card p-3 sm:max-w-lg">
                  <DialogHeader className="px-1">
                    <DialogTitle>{mediaViewer?.label}</DialogTitle>
                    <DialogDescription>
                      {mediaViewer?.kind === "intro_video"
                        ? "Verified intro video"
                        : "Profile photo"}
                    </DialogDescription>
                  </DialogHeader>
                  {mediaViewer?.kind === "intro_video" ? (
                    <video
                      className="aspect-video w-full rounded-xl bg-black object-contain"
                      controls
                      src={mediaViewer.url}
                    >
                      <track kind="captions" />
                    </video>
                  ) : mediaViewer ? (
                    <img
                      alt=""
                      className="max-h-[70vh] w-full rounded-xl object-contain"
                      src={mediaViewer.url}
                    />
                  ) : null}
                </DialogContent>
              </Dialog>
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

        <Link
          aria-label={canDate ? "Plan a date" : "Finish profile"}
          className={buttonVariants({
            className:
              "fixed right-4 bottom-24 z-40 rounded-full px-4 shadow-lg shadow-primary/20 lg:hidden",
            size: "sm",
          })}
          to={canDate ? "/date/new" : "/onboarding"}
        >
          <CalendarHeart className="size-4" />
          {canDate ? "Plan" : "Finish"}
        </Link>

        {/* MOBILE BOTTOM TAB BAR */}
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-background/90 backdrop-blur-md lg:hidden">
          <div className="grid grid-cols-6">
            {(
              [
                { icon: Home, label: "Feed", tab: "feed" },
                { icon: MapPin, label: "Spots", tab: "spots" },
                { icon: Heart, label: "Dates", tab: "matches" },
                { icon: MessageCircle, label: "Chats", tab: "chats" },
                { icon: CalendarCheck, label: "Calendar", tab: "calendar" },
                { icon: MoreHorizontal, label: "More", tab: "profile" },
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
                onClick={() =>
                  item.tab === "profile"
                    ? openProfileMore()
                    : setDashboardTab(item.tab)
                }
                type="button"
              >
                <span className="relative">
                  <item.icon className="size-5" />
                  {item.tab === "matches" && unreadRequestCount > 0 && (
                    <span className="-right-2 -top-1 absolute flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                      {unreadRequestCount}
                    </span>
                  )}
                  {item.tab === "chats" && chatBadgeCount > 0 && (
                    <span className="-right-2 -top-1 absolute flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                      {chatBadgeCount}
                    </span>
                  )}
                  {item.tab === "calendar" && calendarBadgeCount > 0 && (
                    <span className="-right-2 -top-1 absolute flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                      {calendarBadgeCount}
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

function MobileDailyLimit({
  requestsCount,
  tier,
}: {
  requestsCount: number;
  tier: string;
}) {
  const dailyLimit = tier === "social" ? 2 : tier === "mingle" ? 8 : 24;

  return (
    <div className="mt-2 flex min-w-44 items-center gap-2 lg:hidden">
      <span className="text-muted-foreground text-[10px]">
        {requestsCount}/{dailyLimit} booked
      </span>
      <Progress
        className="h-1.5 max-w-28 flex-1 rounded-full"
        value={(requestsCount / dailyLimit) * 100}
      />
      <Badge className="rounded-full text-[9px] uppercase">{tier}</Badge>
    </div>
  );
}

function ProfileMoreMenu({
  onEdit,
  onSettings,
  onSignOut,
  onViewProfile,
  tier,
}: {
  onEdit: () => void;
  onSettings: () => void;
  onSignOut: () => void;
  onViewProfile: () => void;
  tier: string;
}) {
  return (
    <div className="grid gap-3 p-5">
      <Card className="rounded-2xl border-border bg-card/45">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>
            View your public profile or update what people see.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button
            className="rounded-full justify-start"
            onClick={onViewProfile}
            type="button"
            variant="outline"
          >
            <Eye className="size-4" />
            View profile
          </Button>
          <Button
            className="rounded-full justify-start"
            onClick={onEdit}
            type="button"
            variant="outline"
          >
            <ClipboardList className="size-4" />
            Edit profile
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border bg-card/45">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4 text-primary" />
            Settings
          </CardTitle>
          <CardDescription>
            Notification preferences, interests, and onboarding details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button
            className="rounded-full justify-start"
            onClick={onSettings}
            type="button"
          >
            <Settings className="size-4" />
            View settings
          </Button>
          <Badge className="w-fit rounded-full text-[10px] uppercase">
            {tier} member
          </Badge>
        </CardContent>
      </Card>

      <Button
        className="rounded-full justify-start"
        onClick={onSignOut}
        type="button"
        variant="outline"
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}

function ProfileSettingsPanel({
  profile,
  tier,
}: {
  profile: DatingProfilePayload | null;
  tier: string;
}) {
  const interestRows = [
    ["Looking for", profile?.lookingFor ?? []],
    ["Interests", profile?.interests ?? []],
    ["Favorite things", profile?.favoriteThings ?? []],
    ["Dating modes", profile?.datingModes ?? []],
  ] as const;

  return (
    <div className="grid gap-4 p-5">
      <Card className="rounded-2xl border-border bg-card/45">
        <CardHeader>
          <CardTitle className="text-base">Notification Preferences</CardTitle>
          <CardDescription>
            These are preview controls until account settings persistence lands.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {["Date requests", "Chat messages", "Calendar reminders"].map(
            (label) => (
              <label
                className="flex items-center justify-between rounded-2xl border border-border bg-background/40 px-3 py-2 text-sm"
                key={label}
              >
                <span>{label}</span>
                <input
                  className="accent-primary"
                  defaultChecked
                  type="checkbox"
                />
              </label>
            )
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border bg-card/45">
        <CardHeader>
          <CardTitle className="text-base">Onboarding Details</CardTitle>
          <CardDescription className="capitalize">
            {tier} membership
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {interestRows.map(([label, values]) => (
            <div className="grid gap-2" key={label}>
              <p className="font-semibold text-sm">{label}</p>
              <div className="flex flex-wrap gap-2">
                {values.length > 0 ? (
                  values.map((value) => (
                    <Badge
                      className="rounded-full bg-primary px-2.5 text-[10px] text-primary-foreground"
                      key={value}
                    >
                      {formatLabel(value)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Nothing selected yet.
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileEditPanel({
  profile,
  setProfileMode,
  tier,
}: {
  profile: DatingProfilePayload | null;
  setProfileMode: (mode: ProfileMode) => void;
  tier: string;
}) {
  const shownBadges = [
    ...(profile?.lookingFor ?? []).slice(0, 4),
    profile?.kids,
    profile?.wantsKids,
  ].filter(Boolean);

  return (
    <div className="grid gap-4 p-5">
      <Card className="rounded-2xl border-border bg-card/45">
        <CardHeader>
          <CardTitle className="text-base">Public Profile</CardTitle>
          <CardDescription>
            Profile editing is being split out from onboarding. For now this
            shows the fields that will become editable here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Input
            className="rounded-full"
            defaultValue={profile?.occupation ?? ""}
            placeholder="Occupation"
          />
          <Textarea
            className="min-h-24 rounded-2xl"
            defaultValue={profile?.bio ?? ""}
            placeholder="Bio"
          />
          <div className="grid gap-2">
            <p className="font-semibold text-sm">Visible badges</p>
            <div className="flex flex-wrap gap-2">
              {shownBadges.map((badge) => (
                <Badge
                  className="rounded-full bg-primary px-2.5 text-[10px] text-primary-foreground"
                  key={badge}
                >
                  {formatLabel(String(badge))}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Badge visibility should stay limited so profiles do not become a
              wall of labels.
            </p>
          </div>
          <Badge className="w-fit rounded-full text-[10px] uppercase">
            {tier} member
          </Badge>
          <Button
            className="w-fit rounded-full"
            onClick={() => setProfileMode("profile")}
            type="button"
          >
            Done
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileMediaRail({
  media,
  onOpen,
}: {
  media: ProfileMediaItem[];
  onOpen: (item: ProfileMediaItem) => void;
}) {
  if (media.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pt-2">
      {media.map((item) => (
        <button
          className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted/20"
          key={`${item.kind}-${item.url}`}
          onClick={() => onOpen(item)}
          type="button"
        >
          {item.kind === "intro_video" ? (
            <>
              <video className="h-full w-full object-cover" src={item.url}>
                <track kind="captions" />
              </video>
              <span className="absolute inset-0 grid place-items-center bg-black/25 text-white">
                <Play className="size-6" />
              </span>
            </>
          ) : (
            <img alt="" className="h-full w-full object-cover" src={item.url} />
          )}
          <span className="absolute right-2 bottom-2 rounded-full bg-background/90 px-2 py-0.5 font-bold text-[9px] text-foreground">
            {item.kind === "intro_video" ? "Intro" : "Photo"}
          </span>
        </button>
      ))}
    </div>
  );
}

function ProfileStatPanel({
  circleGroups,
  recapsCount,
  target,
}: {
  circleGroups: {
    id: string;
    members: CircleInvite[];
    name: string;
    pending: CircleInvite[];
  }[];
  recapsCount: number;
  target: ProfileStatTarget | null;
}) {
  if (!target) return null;

  if (target === "recaps") {
    return (
      <Card className="rounded-2xl border-border bg-card/45">
        <CardContent className="p-4 text-sm">
          {recapsCount} recap{recapsCount === 1 ? "" : "s"} captured from dates.
        </CardContent>
      </Card>
    );
  }

  if (target === "friends") {
    const friends = circleGroups.flatMap((circle) => circle.members);

    return (
      <Card className="rounded-2xl border-border bg-card/45">
        <CardContent className="grid gap-2 p-4">
          {friends.length > 0 ? (
            friends.map((friend, index) => (
              <p
                className="text-sm"
                key={friend.email ?? friend.phone ?? index}
              >
                {friend.name ||
                  friend.email?.split("@")[0] ||
                  friend.phone ||
                  "Friend"}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              No friends have joined yet.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border bg-card/45">
      <CardContent className="grid gap-3 p-4">
        {circleGroups.map((circle) => (
          <div
            className="rounded-2xl border border-border bg-background/45 p-3"
            key={circle.id}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-sm">{circle.name}</p>
              <Badge className="rounded-full text-[9px]">
                {circle.members.length} members
              </Badge>
            </div>
            <p className="mt-2 text-muted-foreground text-xs">
              Circle group chats should be created automatically once the circle
              membership model is synced to Stream.
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
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

function DateHistoryNotification({
  date,
  onOpen,
}: {
  date: DateHistoryItem;
  onOpen: () => void;
}) {
  const acceptedMatch = date.matches.find(
    (match) => match.id === date.acceptedMatchId
  );

  return (
    <button
      className="flex w-full items-start gap-3 rounded-lg border border-primary/25 bg-primary/10 p-4 text-left transition hover:border-primary/50 hover:bg-primary/15"
      onClick={onOpen}
      type="button"
    >
      <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <CalendarHeart className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-sm">{date.title}</span>
          <Badge className="rounded-full bg-background/80 text-[10px] text-foreground">
            {date.status}
          </Badge>
        </span>
        <span className="text-xs text-muted-foreground">
          {date.searchArea} · {new Date(date.scheduledAt).toLocaleString()}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {date.what.map((item) => (
            <Badge className="rounded-full text-[10px]" key={item}>
              {formatLabel(item)}
            </Badge>
          ))}
          {acceptedMatch ? (
            <Badge className="rounded-full text-[10px]" variant="secondary">
              Kept {acceptedMatch.displayName}
            </Badge>
          ) : null}
        </span>
      </span>
      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function DateHistoryDetail({
  date,
  onShowChats,
}: {
  date: DateHistoryItem;
  onShowChats: () => void;
}) {
  const acceptedMatch = date.matches.find(
    (match) => match.id === date.acceptedMatchId
  );
  const availableMatches = date.matches.filter(
    (match) => match.status !== "declined"
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-lg border-border bg-card/45">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{date.title}</CardTitle>
              <CardDescription>
                {date.searchArea} ·{" "}
                {new Date(date.scheduledAt).toLocaleString()}
              </CardDescription>
            </div>
            <Badge className="rounded-full bg-amber-500/10 text-amber-600">
              {date.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          {date.timeline.map((item) => (
            <div
              className="flex flex-col gap-1 rounded-lg border border-border bg-background/50 p-3"
              key={item.label}
            >
              <span
                className={`size-2 rounded-full ${
                  item.tone === "done"
                    ? "bg-emerald-500"
                    : item.tone === "live"
                      ? "bg-amber-500"
                      : "bg-muted-foreground"
                }`}
              />
              <span className="text-xs font-bold">{item.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {item.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-lg border-border bg-card/45">
        <CardHeader>
          <CardTitle className="text-base">Match options</CardTitle>
          <CardDescription>
            Requesters can come back to every option that was not rejected.
            Friended matches move future conversation into Chats.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {date.matches.map((match) => (
            <DateHistoryMatchRow
              isAccepted={match.id === date.acceptedMatchId}
              key={match.id}
              match={match}
              onShowChats={onShowChats}
            />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-base">Actual date</CardTitle>
            <CardDescription>
              Places, reviews, content, and the accepted match stay attached to
              this date.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {acceptedMatch ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
                <Avatar className="size-12 border border-border">
                  {acceptedMatch.photoUrl && (
                    <AvatarImage src={acceptedMatch.photoUrl} />
                  )}
                  <AvatarFallback>
                    {acceptedMatch.displayName.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-sm">
                    Date with {acceptedMatch.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatically friended after the completed date.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              {date.places.map((place) => (
                <div
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/50 p-3"
                  key={place.placeId}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-bold text-xs">{place.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {place.address}
                      </p>
                    </div>
                  </div>
                  {place.rating ? (
                    <Badge className="rounded-full text-[10px]">
                      <Star className="size-3 fill-yellow-500 text-yellow-500" />
                      {place.rating}
                    </Badge>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                className={buttonVariants({
                  className: "rounded-full text-xs font-semibold",
                  size: "sm",
                })}
                params={{ requestid: date.id }}
                to="/reviews/$requestid"
              >
                <Star className="size-4" />
                Open review UI
              </Link>
              <Button
                className="rounded-full text-xs"
                size="sm"
                variant="outline"
              >
                <Plus className="size-4" />
                Add recap
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-base">Date-room history</CardTitle>
            <CardDescription>
              Match-room messages stay with the date unless someone becomes a
              friend.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {date.chatSummary.map((item) => (
                <div
                  className="rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
            <Button
              className="rounded-full text-xs"
              onClick={onShowChats}
              size="sm"
              type="button"
              variant="outline"
            >
              <MessageCircle className="size-4" />
              Open friend chats
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border-border bg-card/45">
        <CardHeader>
          <CardTitle className="text-base">Content & recap</CardTitle>
          <CardDescription>
            Optional date content can become private memories, public recaps, or
            reward signals.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          {date.content.map((item) => (
            <div
              className="rounded-lg border border-border bg-background/50 p-3"
              key={item.label}
            >
              <p className="text-xs font-bold">{item.label}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {item.status}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {availableMatches.length > 1 ? (
        <p className="text-xs text-muted-foreground">
          {availableMatches.length} non-rejected match room
          {availableMatches.length === 1 ? "" : "s"} remain attached to this
          date for sender history.
        </p>
      ) : null}
    </div>
  );
}

function DateHistoryMatchRow({
  isAccepted,
  match,
  onShowChats,
}: {
  isAccepted: boolean;
  match: DateHistoryMatch;
  onShowChats: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/50 p-3 sm:flex-row sm:items-center">
      <Avatar className="size-12 border border-border">
        {match.photoUrl && <AvatarImage src={match.photoUrl} />}
        <AvatarFallback>{match.displayName.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-sm">{match.displayName}</p>
          <Badge className="rounded-full text-[10px]" variant="secondary">
            {match.compatibility}% match
          </Badge>
          <MatchStatusBadge status={match.status} />
          {isAccepted ? (
            <Badge className="rounded-full bg-primary/10 text-[10px] text-primary">
              Chosen
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{match.note}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {match.tags.map((tag) => (
            <Badge className="rounded-full text-[9px]" key={tag}>
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      {match.status === "friended" ? (
        <Button
          className="rounded-full text-xs"
          onClick={onShowChats}
          size="sm"
          type="button"
        >
          <MessageCircle className="size-4" />
          Chat
        </Button>
      ) : match.status === "declined" ? (
        <Button
          className="rounded-full text-xs"
          disabled
          size="sm"
          variant="ghost"
        >
          Declined
        </Button>
      ) : (
        <Button
          className="rounded-full text-xs"
          disabled
          size="sm"
          variant="outline"
        >
          Date room
        </Button>
      )}
    </div>
  );
}

function MatchStatusBadge({ status }: { status: DateHistoryMatchStatus }) {
  const label = {
    accepted: "Accepted",
    declined: "Rejected",
    friended: "Friend",
    saved: "Saved",
    suggested: "Suggested",
  }[status];
  const className =
    status === "declined"
      ? "bg-muted text-muted-foreground"
      : status === "friended" || status === "accepted"
        ? "bg-emerald-500/10 text-emerald-600"
        : "bg-amber-500/10 text-amber-600";

  return (
    <Badge
      className={`rounded-full text-[10px] ${className}`}
      variant="secondary"
    >
      {label}
    </Badge>
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
