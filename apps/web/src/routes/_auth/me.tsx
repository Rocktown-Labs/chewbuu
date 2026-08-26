import { api as blocksApi } from "@chewbuu/aws-blocks";
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
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@chewbuu/ui/components/field";
import { Input } from "@chewbuu/ui/components/input";
import {
  MiniCalendar,
  MiniCalendarDay,
  MiniCalendarDays,
  MiniCalendarNavigation,
} from "@chewbuu/ui/components/mini-calendar";
import { Progress } from "@chewbuu/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@chewbuu/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@chewbuu/ui/components/sheet";
import { Switch } from "@chewbuu/ui/components/switch";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { cn } from "@chewbuu/ui/lib/utils";
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Calendar as CalendarIcon,
  CalendarCheck,
  CalendarHeart,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  Compass,
  ExternalLink,
  Heart,
  Home,
  Link2,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquare,
  PanelLeft,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  UserPlus,
  Users,
  Utensils,
  X,
} from "lucide-react";
import type { ComponentType, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AnalyticsDrawer } from "@/components/analytics/analytics-drawer";
import { PasskeysCard } from "@/components/auth/passkey";
import { DateRecapFeed } from "@/components/feed/date-recap-feed";
import { NavigationBlocker } from "@/components/navigation-blocker";
import {
  HorizontalStepper,
  type StepItem,
  type StepKey,
} from "@/components/ui/horizontal-stepper";
import type { ChatPerson } from "@/features/chat/chat-types";
import { DateConfirmScreen } from "@/features/chat/date-confirm";
import { DateWizard } from "@/features/date-wizard/date-wizard";
import { authClient } from "@/lib/auth-client";
import {
  datingApi,
  dateMediaApi,
  getApiUrl,
  type DatePlace,
  type DatingMedia,
  type DatingProfilePayload,
  type DatingSummary,
  type PendingReview,
} from "@/lib/dating-api";
import { syncDatingSummaryToDb, syncPlacesToDb } from "@/lib/db";
import {
  getLocationWeatherFromCityName,
  getLocationWeatherFromCoords,
} from "@/lib/location-weather";
import { useUsernameChecker } from "@/lib/use-username-checker";

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
  | "archived"
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
  requester: {
    avatar?: string;
    bio: string;
    compatibility?: number;
    name: string;
    tags: string[];
  };
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

const meSearchSchema = z.object({
  dateId: z.string().optional(),
  filter: z.enum(["all", "received", "sent", "active"]).optional(),
  step: z.enum(["request", "matcher", "choice", "date"]).optional(),
  tab: z
    .enum([
      "calendar",
      "chats",
      "feed",
      "matches",
      "notifications",
      "profile",
      "spots",
    ])
    .optional(),
});

export const Route = createFileRoute("/_auth/me")({
  component: RouteComponent,
  validateSearch: (search) => meSearchSchema.parse(search),
});

interface MePageProps {
  initialChatId?: string;
  initialDateId?: string;
  initialFilter?: "all" | "received" | "sent" | "active";
  initialSpotsCategory?: SpotCategory;
  initialStep?: "request" | "matcher" | "choice" | "date";
  initialTab?: DashboardTab;
}

type DashboardChatsComponent = ComponentType<{
  activeChannelId?: string;
  onGoToMatches?: () => void;
  onOpenDate?: (dateId: string) => void;
}>;
type ProfileMode = "edit" | "menu" | "profile" | "settings";
type ProfileStatTarget = "circles" | "friends" | "recaps" | "reviews";
type ProfileMediaItem = {
  kind: "intro_video" | "photo" | "profile_photo";
  label: string;
  url: string;
};

const sexOptions = [
  "Female",
  "Male",
  "Nonbinary",
  "Trans Woman",
  "Trans Man",
  "Prefer Not to Say",
] as const;
const sexualityOptions = [
  "Straight",
  "Gay",
  "Lesbian",
  "Bisexual",
  "Pansexual",
  "Queer",
  "Questioning",
  "Prefer Not to Say",
] as const;
const maritalStatusOptions = [
  "Single",
  "Dating",
  "Engaged",
  "Married",
  "Separated",
  "Divorced",
  "Widowed",
  "Prefer Not to Say",
] as const;
const politicsOptions = [
  "Liberal",
  "Moderate",
  "Conservative",
  "Independent",
  "Apolitical",
  "Other",
  "Prefer Not to Say",
] as const;
const religionOptions = [
  "Christian",
  "Muslim",
  "Jewish",
  "Hindu",
  "Buddhist",
  "Spiritual",
  "Agnostic",
  "Atheist",
  "Other",
  "Prefer Not to Say",
] as const;
const kidsOptions = ["Have Kids", "Do Not Have Kids", "Prefer Not to Say"];
const wantsKidsOptions = [
  "Want Kids",
  "Open to Kids",
  "Do Not Want Kids",
  "Not Sure",
  "Prefer Not to Say",
] as const;
const interestedInOptions = ["women", "men", "couples", "friends", "groups"];
const lookingForOptions = [
  "A relationship",
  "Intentional dating",
  "Casual dates",
  "New friends",
  "Double dates",
  "Group hangs",
  "Not sure yet",
] as const;
const dateRequestCategoryOptions = ["eat", "drink", "play"] as const;
const profileVisibleChipsKey = "__profile_visible_chips";
const sanitizeDateRequestCategories = (values: string[] = []) =>
  values.filter((value) =>
    dateRequestCategoryOptions.some((option) => option === value)
  );
const profileChipValue = (group: string, value: string) => `${group}:${value}`;
const profileChipLabel = (chip: string) => chip.split(":").at(1) ?? chip;
const settingsInterestCategories = [
  {
    label: "Eat",
    suggestions: [
      "Chicken",
      "Tacos",
      "Sushi",
      "Brunch",
      "Barbecue",
      "Pasta",
      "Dessert",
    ],
  },
  {
    label: "Drink",
    suggestions: [
      "Whiskey",
      "Coffee",
      "Wine",
      "Mocktails",
      "Craft beer",
      "Margaritas",
      "Boba",
    ],
  },
  {
    label: "Play",
    suggestions: [
      "Pool",
      "Live music",
      "Comedy",
      "Bowling",
      "Karaoke",
      "Arcade",
      "Trivia",
    ],
  },
  {
    label: "Move",
    suggestions: [
      "Working out",
      "Hiking",
      "Basketball",
      "Yoga",
      "Running",
      "Dancing",
      "Cycling",
    ],
  },
  {
    label: "Watch",
    suggestions: [
      "Movies",
      "TV shows",
      "Comedy",
      "Drama",
      "Thriller",
      "Action",
      "Sci-Fi",
      "Horror",
      "Documentary",
      "Anime",
      "Wrestling",
      "Theater",
    ],
  },
  {
    label: "Talk",
    suggestions: [
      "Books",
      "Travel",
      "Music",
      "Business",
      "Faith",
      "Family",
      "Art",
      "Tech",
      "Politics",
      "Philosophy",
    ],
  },
] as const;

const getProfileInterestKeys = (details: Record<string, string[]>) =>
  settingsInterestCategories
    .filter((category) =>
      Object.entries(details).some(
        ([key, values]) =>
          values.length > 0 &&
          (key === category.label || key.startsWith(`${category.label}_`)) &&
          !key.endsWith("_places") &&
          key !== "Watch_media"
      )
    )
    .map((category) => category.label);

const getProfileFavoriteThings = (details: Record<string, string[]>) =>
  Array.from(
    new Set(
      Object.entries(details)
        .filter(
          ([key, values]) =>
            values.length > 0 &&
            !key.endsWith("_places") &&
            key !== profileVisibleChipsKey &&
            key !== "Watch_media"
        )
        .flatMap(([, values]) => values)
    )
  );

const formatLabel = (value: string) =>
  value
    .split("_")
    .join(" ")
    .replaceAll(/\b\w/g, (letter) => letter.toUpperCase());

const getDateIntentTitle = (what: string[]) =>
  what.length > 0 ? `${what.map(formatLabel).join(", ")} date` : "Date";

const getCalendarDateTitle = (request: {
  places?: { name?: string }[];
  theirName?: string;
  what?: string[];
}) => {
  const placeNames = request.places
    ?.map((place) => place.name)
    .filter(Boolean)
    .slice(0, 2);
  const activity = placeNames?.length
    ? placeNames.join(" and ")
    : getDateIntentTitle(request.what ?? []);
  return request.theirName ? `${activity} with ${request.theirName}` : activity;
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

const getAcceptedMatchForRequest = (
  request: DatingSummary["requests"][number]
) =>
  request.matches?.find(
    (match) => match.status === "accepted" || match.status === "friended"
  ) ?? null;

const requestToHistory = (
  request: DatingSummary["requests"][number]
): DateHistoryItem => ({
  acceptedMatchId: getAcceptedMatchForRequest(request)?.id ?? "",
  chatSummary: [
    "Open the date room to exchange verified video replies.",
    "Choose a match or continue the conversation from the live request.",
  ],
  content: [
    { label: "Date request", status: formatStatus(request.status) },
    { label: "Places", status: `${request.places.length} selected` },
  ],
  id: request.id,
  matches: (request.matches ?? []).map((match) => ({
    compatibility: match.compatibility,
    displayName: match.displayName,
    id: match.id,
    note: match.profileSummary,
    photoUrl: match.profilePhotoUrl ?? undefined,
    status: match.status as DateHistoryMatchStatus,
    tags: [],
  })),
  places: request.places,
  requesterView: true,
  requester: {
    bio: "Your date request",
    name: "You",
    tags: [],
  },
  scheduledAt: request.scheduledAt,
  searchArea: request.searchArea,
  status: request.status,
  timeline: [
    {
      label: "Request",
      tone: "done",
      value: `${request.places.length} spots selected`,
    },
    {
      label: "Matches",
      tone: "live",
      value: `${request.matches?.length ?? 0} found`,
    },
  ],
  title: getDateIntentTitle(request.what),
  what: request.what,
});

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const formatStatus = (status: string) => {
  if (status === "places_selected") return "Matching";
  if (status === "review_due" || status === "Review due") return "Review Due";
  return status
    .split("_")
    .join(" ")
    .replaceAll(/\b\w/g, (letter) => letter.toUpperCase());
};

const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();

  // Total days in the month
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Padding from previous month
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i -= 1) {
    days.push({
      date: new Date(year, month - 1, prevMonthTotalDays - i),
      isCurrentMonth: false,
    });
  }

  // Days of current month
  for (let i = 1; i <= totalDays; i += 1) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Padding from next month
  const remaining = days.length % 7;
  if (remaining > 0) {
    const nextDaysNeeded = 7 - remaining;
    for (let i = 1; i <= nextDaysNeeded; i += 1) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
  }

  // Ensure exactly 42 days (6 weeks) for layout consistency
  while (days.length < 42) {
    const lastDay = days.at(-1);
    if (lastDay) {
      const nextDate = new Date(lastDay.date);
      nextDate.setDate(nextDate.getDate() + 1);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
      });
    }
  }

  return days;
};

function RouteComponent() {
  const search = Route.useSearch();
  return (
    <MePage
      initialDateId={search.dateId}
      initialFilter={search.filter}
      initialStep={search.step}
      initialTab={search.tab ?? "feed"}
    />
  );
}

function HomeDashboardView({
  canDate,
  onOpenPlanDateDrawer,
  onOpenAnalytics,
  onNavigateTab,
  profileArea,
  weatherText,
}: {
  canDate: boolean;
  onOpenPlanDateDrawer: () => void;
  onOpenAnalytics: () => void;
  onNavigateTab: (tab: DashboardTab) => void;
  profileArea?: string;
  weatherText?: string;
}) {
  void canDate;
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    Date | undefined
  >(new Date());

  const formattedSelectedDate = useMemo(() => {
    if (!selectedCalendarDate) return "Today";
    return selectedCalendarDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [selectedCalendarDate]);

  const hasEventOnSelectedDate = false;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-extrabold text-2xl tracking-tight text-foreground">
            Home Dashboard 👋
          </h2>
          <p className="text-xs text-muted-foreground">
            View confirmed venue bookings on your schedule, check weather, and
            track streaks.
          </p>
        </div>

        {/* Live Weather Forecast Badge */}
        <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-amber-600 shadow-2xs w-fit">
          <span className="font-extrabold text-xs">
            {weatherText || "Weather unavailable until a location is set."}
          </span>
        </div>
      </div>

      {/* Kibo UI Mini-Calendar Integration */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
            Mini-Calendar Schedule
          </span>
          <Badge className="rounded-full bg-primary/10 text-primary font-bold text-xs border-0">
            Selected: {formattedSelectedDate}
          </Badge>
        </div>

        {/* Kibo UI MiniCalendar Component */}
        <MiniCalendar
          className="w-full justify-between rounded-xl border border-border/80 bg-background/80 p-2"
          days={7}
          onValueChange={setSelectedCalendarDate}
          value={selectedCalendarDate}
        >
          <MiniCalendarNavigation direction="prev" />
          <MiniCalendarDays className="flex-1 justify-around">
            {(date) => <MiniCalendarDay date={date} key={date.toISOString()} />}
          </MiniCalendarDays>
          <MiniCalendarNavigation direction="next" />
        </MiniCalendar>
      </div>

      {/* Selected Day Event Overview */}
      <div className="flex flex-col gap-4">
        <h3 className="font-extrabold text-base tracking-tight text-foreground flex items-center gap-2">
          <CalendarHeart className="size-4 text-primary" />
          Confirmed Bookings for {formattedSelectedDate}
        </h3>

        {hasEventOnSelectedDate ? (
          <Card className="rounded-2xl border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative size-12 shrink-0 rounded-full overflow-hidden border-2 border-primary">
                    <img
                      alt="Date partner"
                      className="size-full object-cover"
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                    />
                  </div>
                  <div>
                    <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 font-bold text-[10px] border-0 mb-1">
                      Confirmed Date · 7:30 PM
                    </Badge>
                    <h4 className="font-extrabold text-base">
                      Date with Maya Lin
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Eat + Drink · Dutch Split · {profileArea || "Searcy, AR"}
                    </p>
                  </div>
                </div>

                <Button
                  className="rounded-full font-bold text-xs shrink-0"
                  size="sm"
                  type="button"
                >
                  View Details
                </Button>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 rounded-xl border border-border/80 bg-background/60 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                    1
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate">
                      Stop 1: Barista Parlor
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Coffee & Pastries · 12 South
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-full bg-sky-500/10 text-sky-500 font-bold text-xs">
                    2
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate">
                      Stop 2: The Basement East
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Live Music Venue · East Nashville
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="rounded-2xl border-border/80 bg-card/45 p-6 text-center shadow-2xs">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <CalendarHeart className="size-6" />
            </div>
            <h4 className="font-extrabold text-base">
              No dates booked for {formattedSelectedDate}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Requests move to this calendar once confirmed. Queue up a new date
              request to find a match.
            </p>
            <Button
              className="mt-4 rounded-full font-bold text-xs mx-auto"
              onClick={onOpenPlanDateDrawer}
              size="sm"
              type="button"
            >
              <Plus className="mr-1 size-4" />
              Plan Date for {formattedSelectedDate}
            </Button>
          </Card>
        )}
      </div>

      {/* Dynamic Interactive Hero Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Date Streak -> Analytics Drawer */}
        <button
          aria-label="View date streak analytics and badges"
          className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-4 text-left shadow-sm transition hover:border-amber-500/60 hover:shadow-md"
          onClick={onOpenAnalytics}
          type="button"
        >
          <Badge className="w-fit rounded-full border-0 bg-amber-500/20 font-extrabold text-[10px] text-amber-600">
            🔥 3 In a Row
          </Badge>

          <div className="mt-5">
            <span className="font-extrabold text-[10px] uppercase text-muted-foreground">
              Streak Analytics
            </span>
            <h4 className="font-extrabold text-lg leading-snug text-foreground">
              3 Date Streak
            </h4>
            <p className="mt-1 flex items-center text-[11px] font-bold text-amber-600 group-hover:underline">
              View Badges & Stats <ChevronRight className="ml-0.5 size-3.5" />
            </p>
          </div>
        </button>

        {/* Card 2: This Month Bookings -> Calendar Tab */}
        <button
          aria-label="Open monthly calendar schedule"
          className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-lg border border-primary/30 bg-gradient-to-br from-primary/15 via-sky-500/10 to-transparent p-4 text-left shadow-sm transition hover:border-primary/60 hover:shadow-md"
          onClick={() => onNavigateTab("calendar")}
          type="button"
        >
          <Badge className="w-fit rounded-full border-0 bg-primary/20 font-extrabold text-[10px] text-primary">
            📅 4 Booked
          </Badge>

          <div className="mt-5">
            <span className="font-extrabold text-[10px] uppercase text-muted-foreground">
              Monthly Schedule
            </span>
            <h4 className="font-extrabold text-lg leading-snug text-foreground">
              4 Confirmed
            </h4>
            <p className="mt-1 flex items-center text-[11px] font-bold text-primary group-hover:underline">
              Open Calendar <ChevronRight className="ml-0.5 size-3.5" />
            </p>
          </div>
        </button>

        {/* Card 3: Favorite Spots -> Spots Tab */}
        <button
          aria-label="Explore local favorite spots"
          className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent p-4 text-left shadow-sm transition hover:border-emerald-500/60 hover:shadow-md"
          onClick={() => onNavigateTab("spots")}
          type="button"
        >
          <Badge className="w-fit rounded-full border-0 bg-emerald-500/20 font-extrabold text-[10px] text-emerald-600">
            ⭐ 12 Saved
          </Badge>

          <div className="mt-5">
            <span className="font-extrabold text-[10px] uppercase text-muted-foreground">
              Local Venues
            </span>
            <h4 className="font-extrabold text-lg leading-snug text-foreground">
              12 Fav Spots
            </h4>
            <p className="mt-1 flex items-center text-[11px] font-bold text-emerald-600 group-hover:underline">
              Explore Local Spots <ChevronRight className="ml-0.5 size-3.5" />
            </p>
          </div>
        </button>

        {/* Card 4: Recaps Posted -> Profile Tab */}
        <button
          aria-label="View published recaps on profile"
          className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-lg border border-purple-500/30 bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent p-4 text-left shadow-sm transition hover:border-purple-500/60 hover:shadow-md"
          onClick={() => onNavigateTab("profile")}
          type="button"
        >
          <Badge className="w-fit rounded-full border-0 bg-purple-500/20 font-extrabold text-[10px] text-purple-600">
            📸 5 Recaps
          </Badge>

          <div className="mt-5">
            <span className="font-extrabold text-[10px] uppercase text-muted-foreground">
              Food Recaps
            </span>
            <h4 className="font-extrabold text-lg leading-snug text-foreground">
              5 Published
            </h4>
            <p className="mt-1 flex items-center text-[11px] font-bold text-purple-600 group-hover:underline">
              My Profile Recaps <ChevronRight className="ml-0.5 size-3.5" />
            </p>
          </div>
        </button>
      </div>

      {/* Quick Date Action Queue Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
            <Compass className="size-5" />
          </div>
          <div>
            <Badge className="rounded-full bg-primary/20 text-primary font-bold text-[9px] border-0 mb-1">
              AI Recommendation
            </Badge>
            <h4 className="font-extrabold text-base">
              Dinner & Arcade Date Prompt
            </h4>
            <p className="text-xs text-muted-foreground max-w-md">
              High match potential this weekend! Queue up this date request in
              the Matcher to find partners.
            </p>
          </div>
        </div>

        <Button
          className="rounded-full font-bold text-xs shrink-0 self-start sm:self-center"
          onClick={onOpenPlanDateDrawer}
          type="button"
        >
          Queue in Matcher
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}

function ConnectedAccountsCard() {
  const [accounts, setAccounts] = useState<
    { id: string; providerId: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const result = await authClient.listAccounts();
      if (result.error) {
        throw new Error(result.error.message || "Could not load sign-ins.");
      }
      setAccounts(
        (result.data ?? []).map((account) => ({
          id: account.id,
          providerId: account.providerId,
        }))
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load sign-ins."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const googleIsLinked = accounts.some(
    (account) => account.providerId === "google"
  );

  const handleLinkGoogle = async () => {
    setIsLinking(true);
    try {
      const result = await authClient.linkSocial({
        callbackURL: "/me/profile",
        provider: "google",
      });
      if (result.error) {
        throw new Error(result.error.message || "Could not link Google.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not link Google."
      );
      setIsLinking(false);
    }
  };

  return (
    <Card className="rounded-3xl border-border bg-card/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-bold text-sm">
          <Link2 aria-hidden="true" className="size-4 text-primary" />
          Connected sign-ins
        </CardTitle>
        <CardDescription className="text-xs">
          Keep your email and Google sign-in together on one Chewbuu account.
          Linking does not change your Chewbuu email.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {isLoading ? (
            <Badge variant="secondary">Checking sign-ins...</Badge>
          ) : (
            accounts.map((account) => (
              <Badge
                className="rounded-full capitalize"
                key={account.id}
                variant="secondary"
              >
                {account.providerId === "credential"
                  ? "Email & password"
                  : account.providerId}
                <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                  Connected
                </span>
              </Badge>
            ))
          )}
        </div>
        <Button
          className="rounded-full"
          disabled={isLoading || isLinking || googleIsLinked}
          onClick={() => void handleLinkGoogle()}
          type="button"
          variant={googleIsLinked ? "outline" : "default"}
        >
          <Link2 aria-hidden="true" className="size-4" />
          {googleIsLinked
            ? "Google connected"
            : isLinking
              ? "Opening Google..."
              : "Link Google"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function MePage({
  initialChatId,
  initialDateId,
  initialFilter = "all",
  initialSpotsCategory = "all",
  initialStep = "request",
  initialTab = "feed",
}: MePageProps) {
  const { session } = useRouteContext({ from: "/_auth" });
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [dateFeedFilter, setDateFeedFilter] = useState<
    "all" | "received" | "sent" | "active"
  >(initialFilter);
  const [activeProfilePerson, setActiveProfilePerson] =
    useState<ChatPerson | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<{
    name: string;
    url?: string;
  } | null>(null);
  const [spotsCategory, setSpotsCategory] =
    useState<SpotCategory>(initialSpotsCategory);
  const [profileMode, setProfileMode] = useState<ProfileMode>("profile");
  const [profileStatTarget, setProfileStatTarget] =
    useState<ProfileStatTarget | null>(null);
  const [profilePhotoActionsOpen, setProfilePhotoActionsOpen] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<ProfileMediaItem | null>(null);
  const [isPlanDateDrawerOpen, setIsPlanDateDrawerOpen] = useState(false);
  const [presetPlaceForWizard, setPresetPlaceForWizard] = useState<
    DatePlace | undefined
  >();
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [userCity, setUserCity] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chewbuu_user_city");
      if (saved) return saved;
    }
    return "";
  });
  const [weatherText, setWeatherText] = useState("");

  useEffect(() => {
    let isMounted = true;
    const initLocation = async () => {
      const saved = localStorage.getItem("chewbuu_user_city");
      if (saved) {
        const result = await getLocationWeatherFromCityName(saved);
        if (isMounted) {
          setUserCity(result.city);
          setWeatherText(result.weatherText);
        }
        return;
      }

      if (typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const result = await getLocationWeatherFromCoords(
              latitude,
              longitude
            );
            if (isMounted) {
              setUserCity(result.city);
              setWeatherText(result.weatherText);
              localStorage.setItem("chewbuu_user_city", result.city);
            }
          },
          () => {
            if (isMounted) {
              toast.error("Could not determine your location.");
            }
          },
          { timeout: 5000 }
        );
      }
    };

    void initLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  const [summary, setSummary] = useState<DatingSummary | null>(null);
  const [profile, setProfile] = useState<DatingProfilePayload | null>(null);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [spots, setSpots] = useState<DatePlace[]>([]);
  const [spotsQuery, setSpotsQuery] = useState("");
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [readRequestIds, setReadRequestIds] = useState<string[]>([]);
  const [receivingDateRequests, setReceivingDateRequests] = useState(true);
  const [selectedDateHistoryId, setSelectedDateHistoryId] = useState<
    null | string
  >(initialDateId ?? null);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, activeTab]);

  useEffect(() => {
    if (
      initialDateId !== undefined &&
      initialDateId !== selectedDateHistoryId
    ) {
      setSelectedDateHistoryId(initialDateId);
    }
  }, [initialDateId, selectedDateHistoryId]);

  useEffect(() => {
    if (initialFilter && initialFilter !== dateFeedFilter) {
      setDateFeedFilter(initialFilter);
    }
  }, [initialFilter, dateFeedFilter]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    Date | undefined
  >();
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const calendarDays = useMemo(
    () => getDaysInMonth(currentMonth),
    [currentMonth]
  );
  const [userCollapsedSidebar, setUserCollapsedSidebar] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardChatsComponent, setDashboardChatsComponent] =
    useState<DashboardChatsComponent | null>(null);

  useEffect(() => {
    const handleToggleMobileMenu = () => {
      setMobileMenuOpen((prev) => !prev);
    };
    window.addEventListener(
      "chewbuu:toggle-mobile-menu",
      handleToggleMobileMenu
    );
    return () => {
      window.removeEventListener(
        "chewbuu:toggle-mobile-menu",
        handleToggleMobileMenu
      );
    };
  }, []);

  const isFullView = activeTab === "chats" || activeTab === "matches";
  const isSidebarCollapsed = isFullView || userCollapsedSidebar;
  const showRightSidebar = !isFullView;

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
        const [nextSummary, nextProfile, nextPendingReviews] =
          await Promise.all([
            datingApi.getSummary(),
            datingApi.getProfile(),
            datingApi.getPendingReviews(),
          ]);
        setSummary(nextSummary);
        syncDatingSummaryToDb(nextSummary);
        setProfile(nextProfile.profile);
        setPendingReviews(nextPendingReviews.reviews);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not load dashboard."
        );
      }
    };

    void load();

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
      const module = await import("@/features/chat/chats-home");
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
  const membershipTier =
    summary?.membershipTier ?? session.data?.user.membershipTier ?? "social";
  const tier = membershipTier;
  const canDate = summary?.readiness.canDate ?? false;
  const media = profile?.media ?? [];
  const profilePhoto = media.find((item) => item.kind === "profile_photo")?.url;
  const introVideo = media.find((item) => item.kind === "intro_video")?.url;
  const extraPhotos = media.filter((item) => item.kind === "photo");
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
    summary?.readiness.onboarded ||
    (profile?.username &&
      profile?.bio &&
      profile?.area &&
      profile?.birthday &&
      profile?.lookingFor?.length &&
      profile?.politics &&
      profile?.religion &&
      profile?.kids &&
      profile?.wantsKids)
  );
  const readinessItems = [
    {
      checked: profileComplete,
      hash: "basics",
      label: "Profile Details",
    },
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
  const pendingRequests = useMemo(() => summary?.requests ?? [], [summary]);
  const dateHistories = useMemo(
    () => pendingRequests.map(requestToHistory),
    [pendingRequests]
  );
  const selectedDateHistory = selectedDateHistoryId
    ? (dateHistories.find((date) => date.id === selectedDateHistoryId) ?? null)
    : null;
  const receivedDateHistories: DateHistoryItem[] = [];
  const sentDateHistories = dateHistories;
  const unreadRequestCount = pendingRequests.filter(
    (request) => !readRequestIds.includes(request.id)
  ).length;
  const calendarBadgeCount = pendingRequests.length;
  const chatBadgeCount = pendingRequests.length;
  const notificationBadgeCount =
    unreadRequestCount + (summary?.readiness.pendingReviews ?? 0);
  const profileReviewSignals = allRecaps.filter(
    (recap) => recap.userName === displayName
  );
  const profileReviewCount = profileReviewSignals.length;
  const profileMediaSignalCount = profileReviewSignals.filter(
    (recap) => recap.photos.length > 0
  ).length;
  const profileRating =
    profileReviewCount >= 2
      ? Math.min(5, 4.6 + profileMediaSignalCount * 0.1)
      : null;
  const anonymousReviewNotes =
    profileReviewCount >= 2
      ? [
          "Clear communicator and easy to plan with.",
          "Showed up on time and kept the date comfortable.",
        ]
      : [];
  const profileChipOptions = [
    ...(profile?.lookingFor ?? []).map((value) =>
      profileChipValue("looking_for", value)
    ),
    ...(profile?.kids ? [profileChipValue("kids", profile.kids)] : []),
    ...(profile?.wantsKids
      ? [profileChipValue("future_kids", profile.wantsKids)]
      : []),
  ];
  const savedVisibleProfileChips =
    profile?.interestDetails?.[profileVisibleChipsKey] ?? [];
  const visibleProfileChips =
    savedVisibleProfileChips.length > 0
      ? profileChipOptions.filter((chip) =>
          savedVisibleProfileChips.includes(chip)
        )
      : profileChipOptions;

  const confirmedDates = useMemo(() => {
    return pendingRequests.filter((req) => {
      const status = (req.status ?? "").toLowerCase();
      return (
        status === "accepted" ||
        status === "completed" ||
        status === "review_due" ||
        status === "review due" ||
        status === "active" ||
        status === "checked_in" ||
        status === "match_pending" ||
        status === "matched" ||
        status === "matching" ||
        status === "action needed"
      );
    });
  }, [pendingRequests]);

  const getDatesForDay = (date: Date) => {
    return confirmedDates.filter((req) => {
      const reqDate = new Date(req.scheduledAt);
      return (
        reqDate.getFullYear() === date.getFullYear() &&
        reqDate.getMonth() === date.getMonth() &&
        reqDate.getDate() === date.getDate()
      );
    });
  };

  const filteredDates = useMemo(() => {
    if (!selectedCalendarDate) {
      return confirmedDates.toSorted(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    }
    return confirmedDates
      .filter((request) => {
        const requestDate = new Date(request.scheduledAt);
        return (
          requestDate.getFullYear() === selectedCalendarDate.getFullYear() &&
          requestDate.getMonth() === selectedCalendarDate.getMonth() &&
          requestDate.getDate() === selectedCalendarDate.getDate()
        );
      })
      .toSorted(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
  }, [confirmedDates, selectedCalendarDate]);
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

  const setSpotCategory = (category: SpotCategory) => {
    setSpotsCategory(category);
    if (activeTab === "spots") {
      navigate({
        to: "/me",
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          category,
          tab: "spots",
        }),
        replace: true,
      } as Parameters<typeof navigate>[0]);
    }
  };

  const setDashboardTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    navigate({
      to: "/me",
      search: (prev: Record<string, unknown>) => ({ ...prev, tab }),
      replace: true,
    } as Parameters<typeof navigate>[0]);
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

  const openProfileMode = (mode: ProfileMode) => {
    setActiveTab("profile");
    setProfileMode(mode);
    setProfileStatTarget(null);
    navigate({
      to: "/me",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        tab: "profile",
      }),
      replace: true,
    } as Parameters<typeof navigate>[0]);
  };

  const openDateHistory = (dateId: string, step: StepKey = "request") => {
    setActiveTab("matches");
    setSelectedDateHistoryId(dateId);
    navigate({
      to: "/me",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        dateId,
        step,
        tab: "matches",
      }),
      replace: true,
    } as Parameters<typeof navigate>[0]);
  };

  const closeDateHistory = () => {
    setSelectedDateHistoryId(null);
    setActiveTab("matches");
    navigate({
      to: "/me",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        dateId: undefined,
        step: undefined,
        tab: "matches",
      }),
      replace: true,
    } as Parameters<typeof navigate>[0]);
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

  const handleCreateRecap = (e: FormEvent) => {
    e.preventDefault();
    if (!recapForm.placeName || !recapForm.placeAddress || !recapForm.caption) {
      toast.error("Select a real date place and add a caption.");
      return;
    }

    const newRecap: DateRecap = {
      id: `recap-${crypto.randomUUID()}`,
      userName: displayName,
      userAvatar: profilePhoto ?? "",
      placeName: recapForm.placeName,
      placeAddress: recapForm.placeAddress,
      photos: recapForm.photoUrl ? [recapForm.photoUrl] : [],
      caption: recapForm.caption,
      personName: recapForm.personName,
      createdAt: new Date().toISOString(),
    };

    const nextRecaps = [newRecap, ...userRecaps];
    setUserRecaps(nextRecaps);

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
        syncPlacesToDb(places, spotsCategory);
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
        <aside
          className={cn(
            "border-r border-border/80 p-4 hidden lg:flex flex-col justify-between sticky top-0 h-screen overflow-y-auto transition-all duration-200 shrink-0",
            isSidebarCollapsed
              ? "lg:col-span-1 w-20 items-center"
              : "lg:col-span-3"
          )}
        >
          <div className="flex flex-col gap-6 pt-2 w-full">
            {/* Header / Collapse Toggle */}
            <div
              className={cn(
                "flex items-center justify-between px-2",
                isSidebarCollapsed && "justify-center"
              )}
            >
              {!isSidebarCollapsed && (
                <span className="font-extrabold text-lg text-primary tracking-tight">
                  Chewbuu
                </span>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setUserCollapsedSidebar((prev) => !prev)}
                className="rounded-full text-muted-foreground hover:text-foreground"
                title={
                  isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"
                }
              >
                <PanelLeft className="size-4" />
              </Button>
            </div>

            {/* Menu Links */}
            <nav className="flex flex-col gap-1.5 w-full">
              <button
                type="button"
                onClick={() => setDashboardTab("feed")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer w-full select-none",
                  isSidebarCollapsed && "justify-center px-0",
                  activeTab === "feed"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Home"
              >
                <Home className="size-5 shrink-0" />
                {!isSidebarCollapsed && <span>Home</span>}
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("spots")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer w-full select-none",
                  isSidebarCollapsed && "justify-center px-0",
                  activeTab === "spots"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Spots"
              >
                <MapPin className="size-5 shrink-0" />
                {!isSidebarCollapsed && <span>Spots</span>}
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("matches")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer w-full select-none",
                  isSidebarCollapsed && "justify-center px-0",
                  activeTab === "matches"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Dates"
              >
                <Heart className="size-5 shrink-0" />
                {!isSidebarCollapsed && <span>Dates</span>}
                {!isSidebarCollapsed && unreadRequestCount > 0 && (
                  <Badge className="ml-auto rounded-full px-2 py-0 text-[10px]">
                    {unreadRequestCount}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("chats")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer w-full select-none",
                  isSidebarCollapsed && "justify-center px-0",
                  activeTab === "chats"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Chats"
              >
                <MessageCircle className="size-5 shrink-0" />
                {!isSidebarCollapsed && <span>Chats</span>}
                {!isSidebarCollapsed && chatBadgeCount > 0 && (
                  <Badge className="ml-auto rounded-full px-2 py-0 text-[10px]">
                    {chatBadgeCount}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("calendar")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer w-full select-none",
                  isSidebarCollapsed && "justify-center px-0",
                  activeTab === "calendar"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Calendar"
              >
                <CalendarCheck className="size-5 shrink-0" />
                {!isSidebarCollapsed && <span>Calendar</span>}
                {!isSidebarCollapsed && calendarBadgeCount > 0 && (
                  <Badge className="ml-auto rounded-full px-2 py-0 text-[10px]">
                    {calendarBadgeCount}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("notifications")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer w-full select-none",
                  isSidebarCollapsed && "justify-center px-0",
                  activeTab === "notifications"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Notifications"
              >
                <Bell className="size-5 shrink-0" />
                {!isSidebarCollapsed && <span>Notifications</span>}
                {!isSidebarCollapsed && notificationBadgeCount > 0 && (
                  <Badge className="ml-auto rounded-full px-2 py-0 text-[10px]">
                    {notificationBadgeCount}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => openProfileMode("profile")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer w-full select-none",
                  isSidebarCollapsed && "justify-center px-0",
                  activeTab === "profile"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="My Profile"
              >
                <User className="size-5 shrink-0" />
                {!isSidebarCollapsed && <span>My Profile</span>}
              </button>
              <button
                type="button"
                onClick={() => openProfileMode("edit")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-full text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 cursor-pointer w-full select-none",
                  isSidebarCollapsed && "justify-center px-0"
                )}
                title="Edit Profile"
              >
                <ClipboardList className="size-5 shrink-0" />
                {!isSidebarCollapsed && <span>Edit Profile</span>}
              </button>
            </nav>

            {/* Plan a Date Button */}
            <button
              className={cn(
                "w-full py-3 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition duration-200",
                isSidebarCollapsed ? "px-0" : "px-4",
                canDate
                  ? "bg-primary text-primary-foreground shadow-primary/15"
                  : "bg-secondary text-secondary-foreground"
              )}
              onClick={() => {
                if (canDate) {
                  setPresetPlaceForWizard(undefined);
                  setIsPlanDateDrawerOpen(true);
                } else {
                  navigate({ to: "/onboarding" });
                }
              }}
              title="Plan a Date"
              type="button"
            >
              <CalendarHeart className="size-5 shrink-0" />
              {!isSidebarCollapsed && <span>Plan a Date</span>}
            </button>
          </div>

          {!isSidebarCollapsed ? (
            <div className="flex w-full items-center justify-between rounded-2xl border bg-card/60 p-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar className="size-9 shrink-0 border border-border">
                  {profilePhoto && <AvatarImage src={profilePhoto} />}
                  <AvatarFallback className="bg-primary/10 font-bold text-primary text-xs uppercase">
                    {displayName.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col text-left">
                  <span className="max-w-24 truncate font-bold text-xs">
                    {displayName}
                  </span>
                  <Badge
                    className="mt-0.5 w-fit px-1 py-0 font-bold text-[9px] uppercase"
                    variant="secondary"
                  >
                    {membershipTier}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleSignOut}
                title="Sign out"
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : null}
        </aside>

        {/* MAIN MIDDLE COLUMN (FEED / SPOTS / MATCHES / CHATS / PROFILE) */}
        <main
          className={cn(
            "border-r border-border/80 min-h-screen pb-24 lg:pb-6 transition-all duration-200",
            showRightSidebar
              ? "lg:col-span-6"
              : isSidebarCollapsed
                ? "lg:col-span-11"
                : "lg:col-span-9"
          )}
        >
          {/* HOME DASHBOARD & CALENDAR SUB-VIEW */}
          {activeTab === "feed" && (
            <HomeDashboardView
              canDate={canDate}
              onNavigateTab={(tab) => setDashboardTab(tab)}
              onOpenAnalytics={() => setIsAnalyticsOpen(true)}
              onOpenPlanDateDrawer={() => {
                setPresetPlaceForWizard(undefined);
                setIsPlanDateDrawerOpen(true);
              }}
              profileArea={userCity || profile?.area}
              weatherText={weatherText}
            />
          )}

          {activeTab === "matches" && (
            <div className="flex flex-col">
              <div className="sticky top-0 z-30 border-b border-border/80 bg-background/90 px-4 py-4 backdrop-blur-md sm:px-5">
                {selectedDateHistory ? (
                  <div className="flex items-start gap-3">
                    <Button
                      aria-label="Back to dates"
                      className="mt-0.5 rounded-full"
                      onClick={() => closeDateHistory()}
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
                        Date request #{selectedDateHistory.id}
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
              <div className="grid gap-4 p-4 sm:p-5">
                {selectedDateHistory ? (
                  <DateHistoryDetail
                    date={selectedDateHistory}
                    initialStep={initialStep}
                    onShowChats={() => setDashboardTab("chats")}
                  />
                ) : (
                  <>
                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/35 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                      <div>
                        <h3 className="font-bold text-sm">
                          Receive date requests
                        </h3>
                        <p className="mt-0.5 text-muted-foreground text-xs">
                          Keep this on when you want incoming Eat, Drink, or
                          Play requests to show here.
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="text-muted-foreground text-xs">
                          {receivingDateRequests ? "Receiving" : "Paused"}
                        </span>
                        <Switch
                          aria-label="Toggle receiving date requests"
                          checked={receivingDateRequests}
                          onCheckedChange={setReceivingDateRequests}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-border/60 border-b pb-2">
                      {[
                        {
                          count:
                            receivedDateHistories.length +
                            sentDateHistories.length +
                            pendingRequests.length,
                          key: "all" as const,
                          label: "All",
                        },
                        {
                          count: receivedDateHistories.length,
                          key: "received" as const,
                          label: "Received",
                        },
                        {
                          count: sentDateHistories.length,
                          key: "sent" as const,
                          label: "Sent",
                        },
                        {
                          count: pendingRequests.length,
                          key: "active" as const,
                          label: "Active",
                        },
                      ].map((filterItem) => (
                        <button
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-xs transition",
                            dateFeedFilter === filterItem.key
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-muted/60 text-muted-foreground hover:bg-muted"
                          )}
                          key={filterItem.key}
                          onClick={() => setDateFeedFilter(filterItem.key)}
                          type="button"
                        >
                          <span>{filterItem.label}</span>
                          <Badge
                            className={cn(
                              "h-4 rounded-full px-1.5 text-[10px]",
                              dateFeedFilter === filterItem.key
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-background/80 text-muted-foreground"
                            )}
                          >
                            {filterItem.count}
                          </Badge>
                        </button>
                      ))}
                    </div>

                    {(dateFeedFilter === "all" ||
                      dateFeedFilter === "received") &&
                    receivedDateHistories.length > 0 ? (
                      <DateRequestSection
                        count={receivedDateHistories.length}
                        description="People who sent you a date request. Open one to review candidate rooms, profile context, and the plan."
                        title="Received"
                      >
                        {receivedDateHistories.map((date) => (
                          <DateHistoryNotification
                            date={date}
                            key={date.id}
                            onOpen={() => openDateHistory(date.id, "request")}
                            onOpenStep={(step) =>
                              openDateHistory(date.id, step)
                            }
                            onPlayVideo={() =>
                              setActiveVideoModal({
                                name: date.requester.name,
                              })
                            }
                            onViewProfile={() =>
                              setActiveProfilePerson({
                                avatar: date.requester.avatar ?? "",
                                compatibility: date.requester.compatibility,
                                id: date.id,
                                name: date.requester.name,
                                note: date.requester.bio,
                                tags: date.requester.tags,
                              })
                            }
                            userAvatar={profilePhoto}
                            userName={displayName}
                          />
                        ))}
                      </DateRequestSection>
                    ) : null}

                    {(dateFeedFilter === "all" || dateFeedFilter === "sent") &&
                    sentDateHistories.length > 0 ? (
                      <DateRequestSection
                        count={sentDateHistories.length}
                        description="Requests you started. These use a blue border so they are easy to separate from incoming requests."
                        title="Sent"
                      >
                        {sentDateHistories.map((date) => (
                          <DateHistoryNotification
                            date={date}
                            key={date.id}
                            onOpen={() => openDateHistory(date.id, "request")}
                            onOpenStep={(step) =>
                              openDateHistory(date.id, step)
                            }
                            onPlayVideo={() =>
                              setActiveVideoModal({
                                name: date.requester.name,
                              })
                            }
                            onViewProfile={() =>
                              setActiveProfilePerson({
                                avatar: date.requester.avatar ?? "",
                                compatibility: date.requester.compatibility,
                                id: date.id,
                                name: date.requester.name,
                                note: date.requester.bio,
                                tags: date.requester.tags,
                              })
                            }
                            userAvatar={profilePhoto}
                            userName={displayName}
                          />
                        ))}
                      </DateRequestSection>
                    ) : null}

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
                    ) : null}

                    {pendingRequests.length > 0 ? (
                      <DateRequestSection
                        count={pendingRequests.length}
                        description="Live requests from your account data."
                        title="Active"
                      >
                        {pendingRequests.map((request) => (
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
                        ))}
                      </DateRequestSection>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )}

          {/* CHATS SUB-VIEW (Stream) */}
          {activeTab === "chats" && (
            <div className="flex flex-col">
              {ChatView ? (
                <ChatView
                  activeChannelId={initialChatId}
                  onGoToMatches={() => setDashboardTab("matches")}
                  onOpenDate={(dateId: string) => openDateHistory(dateId)}
                />
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

          {/* SPOTS SUB-VIEW (DoorDash & Influencer Recaps Style) */}
          {activeTab === "spots" && (
            <div className="flex flex-col">
              <div className="border-b border-border/80 px-5 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Explore Local Spots</h2>
                  <button
                    className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary/20 cursor-pointer"
                    onClick={() => setIsLocationModalOpen(true)}
                    type="button"
                  >
                    <MapPin className="size-3.5" />
                    <span>{userCity}</span>
                    <span className="text-[10px] text-muted-foreground opacity-80">
                      (Change)
                    </span>
                  </button>
                </div>

                {/* Kibo UI Stories Bar */}

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
            <div className="flex flex-col h-full bg-background">
              {/* Calendar Header with Controls */}
              <div className="border-b border-border/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-background/90 backdrop-blur-md z-30">
                <div>
                  <h2 className="text-xl font-bold">Calendar</h2>
                  <p className="mt-1 text-muted-foreground text-xs font-medium">
                    Only confirmed dates show here. Block off your schedule.
                  </p>
                </div>

                {/* Navigation controls matching screenshot_1784484597.png */}
                <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
                  <div className="flex items-center bg-card border border-border rounded-lg shadow-sm p-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentMonth(new Date());
                        setSelectedCalendarDate(undefined);
                      }}
                      className="text-xs font-semibold px-3 h-8 rounded-md hover:bg-muted"
                    >
                      Today
                    </Button>
                    <div className="w-px h-4 bg-border/60" />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        const prev = new Date(currentMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setCurrentMonth(prev);
                      }}
                      className="size-8 rounded-md hover:bg-muted animate-none"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        const next = new Date(currentMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCurrentMonth(next);
                      }}
                      className="size-8 rounded-md hover:bg-muted animate-none"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>

                  {/* Current Month & Year Display */}
                  <span className="text-base font-bold text-foreground min-w-[120px] text-center">
                    {currentMonth.toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>

                  <div className="flex items-center gap-2 ml-auto md:ml-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-medium h-9 rounded-lg border-border bg-card flex items-center gap-1.5 shadow-sm"
                    >
                      Month
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon-sm"
                      className="size-9 rounded-lg shadow-sm"
                    >
                      <Plus className="size-4.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-6">
                {/* Full-width Month Grid Calendar */}
                <Card className="w-full bg-card/30 border-border rounded-2xl overflow-hidden shadow-lg">
                  {/* Day of Week Labels */}
                  <div className="grid grid-cols-7 bg-muted/30 border-b border-border/80 text-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (dayName) => (
                        <div key={dayName}>{dayName}</div>
                      )
                    )}
                  </div>

                  {/* Day Grid */}
                  <div className="grid grid-cols-7 border-l border-t border-border/30">
                    {calendarDays.map(({ date: dayDate, isCurrentMonth }) => {
                      const dayDates = getDatesForDay(dayDate);
                      const isToday = isSameDay(dayDate, new Date());
                      const isSelected =
                        selectedCalendarDate &&
                        isSameDay(dayDate, selectedCalendarDate);

                      return (
                        <button
                          type="button"
                          key={dayDate.toISOString()}
                          onClick={() => {
                            if (
                              selectedCalendarDate &&
                              isSameDay(selectedCalendarDate, dayDate)
                            ) {
                              setSelectedCalendarDate(undefined);
                            } else {
                              setSelectedCalendarDate(dayDate);
                            }
                          }}
                          className={cn(
                            "border-r border-b border-border/30 min-h-[110px] p-2 flex flex-col gap-1.5 transition duration-150 cursor-pointer select-none relative group text-left items-stretch justify-start w-full bg-transparent font-normal hover:bg-muted/10",
                            !isCurrentMonth && "bg-muted/10 opacity-40",
                            isSelected && "bg-primary/5 hover:bg-primary/10",
                            isCurrentMonth && !isSelected && "hover:bg-muted/20"
                          )}
                        >
                          {/* Day Number Header */}
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "text-xs font-bold flex items-center justify-center size-6 rounded-full transition duration-150",
                                isToday &&
                                  "bg-foreground text-background font-extrabold shadow-sm",
                                !isToday && isCurrentMonth && "text-foreground",
                                !isToday &&
                                  !isCurrentMonth &&
                                  "text-muted-foreground"
                              )}
                            >
                              {dayDate.getDate()}
                            </span>
                            {isSelected && (
                              <span className="size-1.5 rounded-full bg-primary" />
                            )}
                          </div>

                          {/* Event Banners / Pills */}
                          <div className="flex flex-col gap-1 mt-auto w-full overflow-hidden">
                            {dayDates.slice(0, 3).map((req) => {
                              const match = getAcceptedMatchForRequest(req);
                              const reqDate = new Date(req.scheduledAt);
                              const hour = reqDate.getHours();

                              // Meal Type Details
                              let mealType = "Dinner";
                              let mealColorClass =
                                "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 border-l-2 border-indigo-500";

                              if (hour < 11) {
                                mealType = "Breakfast";
                                mealColorClass =
                                  "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-l-2 border-amber-500";
                              } else if (hour < 16) {
                                mealType = "Lunch";
                                mealColorClass =
                                  "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-l-2 border-emerald-500";
                              }

                              return (
                                <div
                                  key={req.id}
                                  className={cn(
                                    "flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] font-bold leading-none truncate w-full shadow-sm",
                                    mealColorClass
                                  )}
                                >
                                  {match ? (
                                    <Avatar className="size-4 shrink-0 rounded-full border border-background">
                                      <AvatarImage
                                        src={match.profilePhotoUrl}
                                      />
                                      <AvatarFallback className="text-[5px]">
                                        {match.displayName?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <CalendarHeart className="size-3 text-current/80 shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {match
                                      ? getCalendarDateTitle({
                                          places: req.places,
                                          theirName: match.displayName,
                                          what: "what" in req ? req.what : [],
                                        })
                                      : `${getDateIntentTitle("what" in req ? req.what : [])} · ${mealType}`}
                                  </span>
                                </div>
                              );
                            })}
                            {dayDates.length > 3 && (
                              <div className="text-[9px] font-semibold text-muted-foreground text-center bg-muted/40 py-0.5 rounded">
                                + {dayDates.length - 3} more
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Filter and Date List Section */}
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h3 className="text-base font-bold text-foreground">
                      {selectedCalendarDate ? (
                        <span>
                          Dates on{" "}
                          <span className="text-primary">
                            {selectedCalendarDate.toLocaleDateString(
                              undefined,
                              {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </span>
                      ) : (
                        "Upcoming meetings"
                      )}
                    </h3>
                    {selectedCalendarDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCalendarDate(undefined)}
                        className="text-xs text-muted-foreground hover:text-foreground h-7 rounded-full px-3 hover:bg-muted"
                      >
                        Show All
                      </Button>
                    )}
                  </div>

                  {/* Redesigned Card List matching screenshot_1784485238.png */}
                  <div className="flex flex-col w-full divide-y divide-border/60">
                    {filteredDates.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No dates scheduled for this day.
                      </div>
                    ) : (
                      filteredDates.map((request) => {
                        const requestId = request.id;
                        const requestDate = new Date(request.scheduledAt);
                        const places = request.places ?? [];
                        const acceptedMatch =
                          getAcceptedMatchForRequest(request);

                        const formattedDate = requestDate.toLocaleDateString(
                          undefined,
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }
                        );
                        const formattedTime = requestDate.toLocaleTimeString(
                          [],
                          {
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        );

                        return (
                          <div
                            key={requestId}
                            className="py-4 flex items-center justify-between gap-4 group transition"
                          >
                            {/* Left part: Avatar & Info */}
                            <div className="flex items-center gap-4 min-w-0">
                              <Avatar className="size-12 rounded-full border border-border/80 shadow-sm shrink-0">
                                <AvatarImage
                                  src={acceptedMatch?.profilePhotoUrl}
                                />
                                <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                                  {acceptedMatch?.displayName?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>

                              <div className="min-w-0 flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-base text-foreground truncate">
                                    {getCalendarDateTitle({
                                      places,
                                      theirName: acceptedMatch?.displayName,
                                      what:
                                        "what" in request
                                          ? request.what
                                          : undefined,
                                    })}
                                  </h4>

                                  <Badge
                                    className={cn(
                                      "rounded-full text-[10px] font-medium border-0 px-2 py-0.5 capitalize shadow-sm shrink-0",
                                      request.status === "places_selected" &&
                                        "bg-muted text-muted-foreground",
                                      (request.status === "review_due" ||
                                        request.status === "Review due") &&
                                        "bg-destructive/10 text-destructive dark:bg-destructive/20",
                                      request.status === "accepted" &&
                                        "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    )}
                                  >
                                    {formatStatus(request.status)}
                                  </Badge>
                                </div>

                                {/* Calendar Row */}
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <CalendarIcon className="size-4 shrink-0 opacity-70" />
                                  <span>
                                    {formattedDate} at {formattedTime}
                                  </span>
                                </div>

                                {/* MapPin / Places Badges Row */}
                                {places.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    <MapPin className="size-4 shrink-0 opacity-70" />
                                    <div className="flex flex-wrap gap-1">
                                      {places.map((place) => (
                                        <Badge
                                          key={place.placeId}
                                          variant="secondary"
                                          className="text-[10px] px-2 py-0 h-5 font-medium rounded-md bg-muted/60"
                                        >
                                          {place.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right part: Action / Menu */}
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                className="rounded-full h-8 px-4 text-xs font-semibold"
                                onClick={() => openDateHistory(requestId)}
                                type="button"
                                variant="outline"
                              >
                                View details
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
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
                      openDateHistory(request.id);
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
                      <button
                        className="text-left"
                        onClick={() => {
                          const [review] = pendingReviews;
                          if (review) {
                            navigate({
                              to: "/reviews/$requestid",
                              params: { requestid: review.dateRequestId },
                            });
                          }
                        }}
                        type="button"
                      >
                        <p className="font-bold text-sm">Review due</p>
                        <p className="text-xs text-muted-foreground">
                          {pendingReviews[0]
                            ? `Finish your ${pendingReviews[0].searchArea} date review before booking again.`
                            : "Finish your date review before booking again."}
                        </p>
                      </button>
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
                  setProfile={setProfile}
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
                      <div className="flex-1 grid grid-cols-4 gap-2 text-center">
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
                          className="flex flex-col border-l border-border/80 px-2 py-1 transition hover:bg-card/60"
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
                          className="flex flex-col border-x border-border/80 px-2 py-1 transition hover:bg-card/60"
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
                        <button
                          className="flex flex-col rounded-xl px-2 py-1 transition hover:bg-card/60"
                          onClick={() => setProfileStatTarget("reviews")}
                          type="button"
                        >
                          <span className="flex items-center justify-center gap-1 font-extrabold text-lg text-foreground md:text-xl">
                            {profileRating === null ? (
                              <Badge className="rounded-full text-[10px]">
                                New
                              </Badge>
                            ) : (
                              <>
                                <Star className="size-4 fill-primary text-primary" />
                                {profileRating.toFixed(1)}
                              </>
                            )}
                          </span>
                          <span className="mt-0.5 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                            Reviews
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
                      {profile?.username ? (
                        <p className="font-semibold text-primary text-xs">
                          @{profile.username}
                        </p>
                      ) : (
                        <button
                          className="w-fit font-semibold text-primary text-xs underline-offset-4 hover:underline"
                          onClick={() => setProfileMode("edit")}
                          type="button"
                        >
                          Add username
                        </button>
                      )}
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
                        {profileReviewCount < 2 ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-primary px-2.5 py-0.5 font-bold text-[10px] text-primary-foreground"
                          >
                            New dater
                          </Badge>
                        ) : null}
                        {visibleProfileChips.map((chip) => (
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-primary px-2.5 py-0.5 font-bold text-[10px] text-primary-foreground"
                            key={chip}
                          >
                            {profileChipLabel(chip)}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {profile?.interestDetails
                          ? Object.entries(profile.interestDetails)
                              .filter(
                                ([category, values]) =>
                                  !category.endsWith("_places") &&
                                  category !== "Watch_media" &&
                                  values.length > 0
                              )
                              .slice(0, 3)
                              .map(([category, values]) => (
                                <span
                                  className="rounded-full bg-muted px-2.5 py-1"
                                  key={category}
                                >
                                  {category}: {values.slice(0, 2).join(", ")}
                                </span>
                              ))
                          : null}
                      </div>
                      {profile?.favoritePlaces &&
                      Object.values(profile.favoritePlaces).some(
                        (places) => places.length > 0
                      ) ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          {Object.entries(profile.favoritePlaces).flatMap(
                            ([category, places]) =>
                              places.slice(0, 3).map((place) => (
                                <span
                                  className="rounded-full bg-primary/10 px-2.5 py-1 text-primary"
                                  key={`${category}-${place.placeId}`}
                                >
                                  {place.name}
                                </span>
                              ))
                          )}
                        </div>
                      ) : null}
                    </div>
                    <ProfileMediaRail
                      media={profileMediaItems}
                      onOpen={setMediaViewer}
                    />
                    <ProfileStatPanel
                      anonymousReviewNotes={anonymousReviewNotes}
                      circleGroups={circleGroups}
                      profileRating={profileRating}
                      reviewCount={profileReviewCount}
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

                      <DateRecapFeed
                        emptyAction={
                          <Link
                            className={buttonVariants({
                              className:
                                "rounded-full font-bold shadow-sm shadow-primary/15",
                              size: "sm",
                            })}
                            to={canDate ? "/date/new" : "/onboarding"}
                          >
                            <CalendarHeart className="size-4" />
                            {canDate
                              ? "Book a Date to Capture a Recap"
                              : "Finish Profile Setup"}
                          </Link>
                        }
                        initialItems={userRecaps}
                      />
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
        <aside
          className={cn(
            "p-5 flex-col gap-6 sticky top-0 h-screen overflow-y-auto",
            showRightSidebar ? "hidden lg:flex lg:col-span-3" : "hidden"
          )}
        >
          <DashboardWidgets
            circleMembers={circleMembers}
            pendingCircleInvites={pendingCircleInvites}
            readinessItems={readinessItems}
            readinessReady={readinessReady}
            requestsCount={summary?.requests.length ?? 0}
            tier={tier}
          />
        </aside>

        {/* MOBILE SIDEBAR DRAWER OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden flex justify-start">
            <div className="w-4/5 max-w-xs bg-card border-r border-border h-full p-5 flex flex-col justify-between shadow-2xl">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-lg text-primary">
                    <img
                      src="/brand/chewbuu-logo-500.png"
                      alt="Chewbuu"
                      className="size-7 rounded-full border border-border"
                    />
                    Chewbuu Navigation
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-full"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <nav className="flex flex-col gap-2">
                  {[
                    { icon: Home, label: "Home", tab: "feed" },
                    { icon: MapPin, label: "Spots", tab: "spots" },
                    {
                      icon: Heart,
                      label: "Dates",
                      tab: "matches",
                      badge: unreadRequestCount,
                    },
                    {
                      icon: MessageCircle,
                      label: "Chats",
                      tab: "chats",
                      badge: chatBadgeCount,
                    },
                    {
                      icon: CalendarCheck,
                      label: "Calendar",
                      tab: "calendar",
                      badge: calendarBadgeCount,
                    },
                    {
                      icon: Bell,
                      label: "Notifications",
                      tab: "notifications",
                      badge: notificationBadgeCount,
                    },
                    { icon: User, label: "My Profile", tab: "profile" },
                  ].map((item) => (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => {
                        if (item.tab === "profile") {
                          openProfileMode("profile");
                        } else {
                          setDashboardTab(item.tab as any);
                        }
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-full text-sm font-bold transition cursor-pointer",
                        activeTab === item.tab
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="size-5" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 ? (
                        <Badge className="rounded-full px-2 py-0.5 text-[10px]">
                          {item.badge}
                        </Badge>
                      ) : null}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="pt-4 border-t border-border flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="w-full rounded-full gap-2 font-bold justify-start"
                  onClick={() => {
                    openProfileMode("edit");
                    setMobileMenuOpen(false);
                  }}
                >
                  <ClipboardList className="size-4" />
                  Edit Profile Settings
                </Button>
                <Button
                  variant="ghost"
                  className="w-full rounded-full gap-2 font-bold justify-start text-red-500 hover:text-red-600"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    authClient.signOut();
                  }}
                >
                  <LogOut className="size-4" />
                  Sign Out
                </Button>
              </div>
            </div>
            <button
              aria-label="Close mobile menu backdrop"
              className="flex-1 border-0 bg-transparent cursor-default"
              onClick={() => setMobileMenuOpen(false)}
              type="button"
            />
          </div>
        )}

        {/* MOBILE BOTTOM TAB BAR (Exact 5 Tabs: Feed, Spots, Dates, Chats, Calendar) */}
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-background/90 backdrop-blur-md lg:hidden">
          <div className="grid grid-cols-5">
            {(
              [
                { icon: Home, label: "Home", tab: "feed" },
                { icon: MapPin, label: "Spots", tab: "spots" },
                { icon: Heart, label: "Dates", tab: "matches" },
                { icon: MessageCircle, label: "Chats", tab: "chats" },
                { icon: CalendarCheck, label: "Calendar", tab: "calendar" },
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

        {/* Requester Profile Overlay Modal */}
        {activeProfilePerson ? (
          <Dialog
            open={Boolean(activeProfilePerson)}
            onOpenChange={(open) => {
              if (!open) setActiveProfilePerson(null);
            }}
          >
            <DialogContent className="max-w-md rounded-2xl p-5">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Button
                    className="h-8 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveProfilePerson(null)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowLeft className="mr-1 size-3.5" />
                    Back to Date Feed
                  </Button>
                  <Badge
                    className="rounded-full text-[10px]"
                    variant="secondary"
                  >
                    {activeProfilePerson.compatibility
                      ? `${activeProfilePerson.compatibility}% Match`
                      : "Candidate"}
                  </Badge>
                </div>
                <DialogTitle className="mt-2 text-lg font-bold">
                  {activeProfilePerson.name}
                </DialogTitle>
              </DialogHeader>

              <div className="mt-2 flex flex-col gap-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
                  {activeProfilePerson.avatar ? (
                    <img
                      alt={activeProfilePerson.name}
                      className="size-full object-cover"
                      src={activeProfilePerson.avatar}
                    />
                  ) : null}
                  <button
                    className="absolute inset-0 flex items-center justify-center bg-black/40 transition hover:bg-black/30"
                    onClick={() => {
                      setActiveVideoModal({
                        name: activeProfilePerson.name,
                        url: activeProfilePerson.introVideoThumb,
                      });
                    }}
                    type="button"
                  >
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                      <Play className="ml-1 size-6 fill-primary-foreground" />
                    </div>
                  </button>
                </div>

                <div>
                  <h4 className="font-bold text-muted-foreground text-xs uppercase">
                    About
                  </h4>
                  <p className="mt-1 text-xs text-foreground leading-relaxed">
                    {activeProfilePerson.note ??
                      "Looking forward to matching and discovering date spots together!"}
                  </p>
                </div>

                {activeProfilePerson.tags?.length ? (
                  <div>
                    <h4 className="mb-1.5 font-bold text-muted-foreground text-xs uppercase">
                      Interests
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {activeProfilePerson.tags.map((t) => (
                        <Badge
                          className="rounded-full text-[10px]"
                          key={t}
                          variant="secondary"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Button
                  className="mt-2 w-full rounded-full font-semibold text-xs"
                  onClick={() => setActiveProfilePerson(null)}
                  type="button"
                >
                  Close profile
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}

        {/* Plan a Date Bottom Sheet */}
        {isPlanDateDrawerOpen ? (
          <Sheet
            open={isPlanDateDrawerOpen}
            onOpenChange={(open) => {
              if (!open) setIsPlanDateDrawerOpen(false);
            }}
          >
            <SheetContent>
              <SheetHeader>
                <SheetTitle className="font-bold text-xl">
                  Plan a New Date
                </SheetTitle>
                <SheetDescription className="text-muted-foreground text-xs">
                  Select date activities, scheduled time, and candidate spots.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-1">
                <DateWizard
                  membershipTier={tier}
                  onCancel={() => setIsPlanDateDrawerOpen(false)}
                  onCreated={(newRequestId) => {
                    setIsPlanDateDrawerOpen(false);
                    openDateHistory(newRequestId, "matcher");
                  }}
                  presetPlace={presetPlaceForWizard}
                />
              </div>
            </SheetContent>
          </Sheet>
        ) : null}

        <NavigationBlocker
          shouldBlock={Boolean(recapForm.placeName || recapForm.caption)}
        />

        {/* Video Player Modal */}
        {activeVideoModal ? (
          <Dialog
            open={Boolean(activeVideoModal)}
            onOpenChange={(open) => {
              if (!open) setActiveVideoModal(null);
            }}
          >
            <DialogContent className="max-w-sm rounded-2xl p-5 text-center">
              <DialogHeader>
                <DialogTitle className="font-bold text-base">
                  Intro Video · {activeVideoModal.name}
                </DialogTitle>
              </DialogHeader>
              <div className="relative aspect-9/16 flex w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-black">
                {activeVideoModal.url ? (
                  <video
                    autoPlay
                    controls
                    className="size-full object-cover"
                    src={activeVideoModal.url}
                  >
                    <track kind="captions" srcLang="en" label="English" />
                  </video>
                ) : (
                  <p className="p-6 text-sm text-muted-foreground">
                    No intro video is available for this profile.
                  </p>
                )}
              </div>
              <Button
                className="w-full rounded-full text-xs"
                onClick={() => setActiveVideoModal(null)}
                type="button"
              >
                Close video
              </Button>
            </DialogContent>
          </Dialog>
        ) : null}

        {/* Analytics & Streaks Detail Drawer */}
        <AnalyticsDrawer
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
        />

        {/* Location Change Modal */}
        <Dialog
          open={isLocationModalOpen}
          onOpenChange={setIsLocationModalOpen}
        >
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-lg">
                Change Your Location
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set a city or area to find local date spots and recaps.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const target = customLocationInput.trim() || userCity;
                if (target) {
                  const result = await getLocationWeatherFromCityName(target);
                  setUserCity(result.city);
                  setWeatherText(result.weatherText);
                  localStorage.setItem("chewbuu_user_city", result.city);
                  setIsLocationModalOpen(false);
                  toast.success(`Location updated to ${result.city}`);
                }
              }}
              className="flex flex-col gap-4 mt-2"
            >
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-10 rounded-full h-11"
                  placeholder="e.g. Searcy, AR or Little Rock, AR"
                  value={customLocationInput}
                  onChange={(e) => setCustomLocationInput(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-full text-xs font-bold"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const result = await getLocationWeatherFromCoords(
                            pos.coords.latitude,
                            pos.coords.longitude
                          );
                          setUserCity(result.city);
                          setWeatherText(result.weatherText);
                          localStorage.setItem(
                            "chewbuu_user_city",
                            result.city
                          );
                          toast.success(`Location set to GPS: ${result.city}`);
                          setIsLocationModalOpen(false);
                        },
                        () => {
                          toast.error(
                            "Could not determine your location. Enter an area manually."
                          );
                        }
                      );
                    }
                  }}
                >
                  Use Device GPS
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-full text-xs font-bold"
                >
                  Save Location
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
      <ConnectedAccountsCard />
      <PasskeysCard />

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
  setProfile,
  setProfileMode,
  tier,
}: {
  profile: DatingProfilePayload | null;
  setProfile: (profile: DatingProfilePayload) => void;
  setProfileMode: (mode: ProfileMode) => void;
  tier: string;
}) {
  const initialProfileChipOptions = [
    ...(profile?.lookingFor ?? []).map((value) =>
      profileChipValue("looking_for", value)
    ),
    ...(profile?.kids ? [profileChipValue("kids", profile.kids)] : []),
    ...(profile?.wantsKids
      ? [profileChipValue("future_kids", profile.wantsKids)]
      : []),
  ];
  const savedVisibleProfileChips =
    profile?.interestDetails?.[profileVisibleChipsKey] ?? [];
  const [formData, setFormData] = useState({
    username: profile?.username ?? "",
    name: profile?.name ?? "",
    bio: profile?.bio ?? "",
    birthday: profile?.birthday ?? "",
    area: profile?.area ?? "",
    sex: profile?.sex ?? "",
    sexuality: profile?.sexuality ?? "",
    height: profile?.height ?? "",
    weight: profile?.weight ?? "",
    maritalStatus: profile?.maritalStatus ?? "",
    kids: profile?.kids ?? "",
    wantsKids: profile?.wantsKids ?? "",
    occupation: profile?.occupation ?? "",
    religion: profile?.religion ?? "",
    politics: profile?.politics ?? "",
    interestedIn: profile?.interestedIn ?? [],
    ageRangeMin: profile?.ageRangeMin ?? 21,
    ageRangeMax: profile?.ageRangeMax ?? 38,
    distanceMiles: profile?.distanceMiles ?? 25,
    lookingFor: profile?.lookingFor ?? [],
    datingModes:
      sanitizeDateRequestCategories(profile?.datingModes).length > 0
        ? sanitizeDateRequestCategories(profile?.datingModes)
        : [],
    favoriteThings: profile?.favoriteThings ?? [],
    favoritePlaces: profile?.favoritePlaces ?? {},
    visibleProfileChips:
      savedVisibleProfileChips.length > 0
        ? savedVisibleProfileChips
        : initialProfileChipOptions,
    interestDetails: profile?.interestDetails ?? {},
    safetyOptIn: profile?.safetyOptIn ?? false,
    trustedContactName: profile?.trustedContacts?.[0]?.name ?? "",
    trustedContactPhone: profile?.trustedContacts?.[0]?.phone ?? "",
    trustedContactEmail: profile?.trustedContacts?.[0]?.email ?? "",
    media: profile?.media ?? [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  const usernameCheck = useUsernameChecker(formData.username);
  const normalizedUsername = formData.username.trim().toLowerCase();
  const usernameWasUnchanged = normalizedUsername === (profile?.username ?? "");
  const usernameStatus = usernameWasUnchanged
    ? "available"
    : usernameCheck.status;
  const usernameMessage =
    usernameStatus === "available"
      ? usernameWasUnchanged
        ? "Current username"
        : "Username is available"
      : usernameStatus === "checking"
        ? "Checking username..."
        : usernameStatus === "taken"
          ? "That username is taken"
          : usernameStatus === "invalid"
            ? "Use 3+ letters, numbers, or underscores"
            : "Enter a username";
  const availableSettingsInterestCategories = useMemo(() => {
    const age = getAge(formData.birthday);
    return age !== null && age < 21
      ? settingsInterestCategories.filter(
          (category) => category.label !== "Drink"
        )
      : settingsInterestCategories;
  }, [formData.birthday]);
  const formProfileChipOptions = useMemo(
    () => [
      ...formData.lookingFor.map((value) =>
        profileChipValue("looking_for", value)
      ),
      ...(formData.kids ? [profileChipValue("kids", formData.kids)] : []),
      ...(formData.wantsKids
        ? [profileChipValue("future_kids", formData.wantsKids)]
        : []),
    ],
    [formData.kids, formData.lookingFor, formData.wantsKids]
  );
  const toggleInterestDetail = (category: string, value: string) => {
    const currentValues = formData.interestDetails[category] ?? [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    const nextInterestDetails = {
      ...formData.interestDetails,
      [category]: nextValues,
    };
    const nextFavoriteThings = Object.entries(nextInterestDetails)
      .filter(([key]) => key !== profileVisibleChipsKey)
      .flatMap(([, values]) => values)
      .slice(0, 20);

    setFormData({
      ...formData,
      favoriteThings: nextFavoriteThings,
      interestDetails: nextInterestDetails,
    });
  };

  const uploadProfileMedia = async (
    file: File | undefined,
    kind: DatingMedia["kind"]
  ) => {
    if (!file) return;
    setUploadingMedia(kind);
    try {
      const upload = await blocksApi.createMediaUpload({
        contentType: file.type,
        fileName: file.name,
        slot: kind,
      });
      const response = await fetch(upload.uploadUrl, {
        body: file,
        headers: { "content-type": file.type },
        method: "PUT",
      });
      if (!response.ok) throw new Error("Media upload failed.");
      setFormData((current) => {
        const nextMedia =
          kind === "photo"
            ? current.media
            : current.media.filter((item) => item.kind !== kind);
        return {
          ...current,
          media: [
            ...nextMedia,
            {
              isPrimary: kind === "profile_photo",
              kind,
              sortOrder: kind === "profile_photo" ? 0 : nextMedia.length,
              url: upload.mediaUrl,
            },
          ],
        };
      });
      toast.success("Media uploaded. Save settings to keep it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingMedia(null);
    }
  };
  const formErrors = useMemo(() => {
    const errors: string[] = [];
    if (!normalizedUsername) {
      errors.push("Username is required.");
    } else if (usernameStatus === "invalid" || usernameStatus === "taken") {
      errors.push(usernameMessage);
    }
    if (!formData.name.trim()) errors.push("Display name is required.");
    if (!formData.area.trim()) errors.push("Location is required.");
    if (!formData.birthday) errors.push("Birthday is required.");
    if (!formData.sex) errors.push("Sex is required.");
    if (!formData.sexuality) errors.push("Sexuality is required.");
    if (!formData.maritalStatus)
      errors.push("Relationship status is required.");
    if (!formData.kids) errors.push("Kids status is required.");
    if (!formData.wantsKids) errors.push("Future kids preference is required.");
    if (!formData.politics) errors.push("Politics is required.");
    if (!formData.religion) errors.push("Religion is required.");
    if (formData.interestedIn.length === 0) {
      errors.push("Select at least one interested-in option.");
    }
    if (formData.lookingFor.length === 0) {
      errors.push("Select at least one looking-for option.");
    }
    if (
      availableSettingsInterestCategories.some((category) => {
        const values = formData.interestDetails[category.label] ?? [];
        return values.length === 0;
      })
    ) {
      errors.push("Select at least one interest in each category.");
    }
    if (formData.ageRangeMin < 18) {
      errors.push("Minimum match age must be 18 or older.");
    }
    if (formData.ageRangeMax < formData.ageRangeMin) {
      errors.push("Maximum match age must be greater than minimum match age.");
    }
    return errors;
  }, [
    availableSettingsInterestCategories,
    formData,
    normalizedUsername,
    usernameMessage,
    usernameStatus,
  ]);

  const handleSave = async () => {
    if (formErrors.length > 0) {
      toast.error(formErrors[0]);
      return;
    }

    setIsSaving(true);
    try {
      const interestDetailsWithoutProfileChips: Record<string, string[]> =
        Object.fromEntries(
          Object.entries(formData.interestDetails).filter(
            ([key]) => key !== profileVisibleChipsKey
          )
        );
      const nextInterestDetails: Record<string, string[]> = {
        ...interestDetailsWithoutProfileChips,
        [profileVisibleChipsKey]: formData.visibleProfileChips.filter((chip) =>
          formProfileChipOptions.includes(chip)
        ),
      };
      const nextFavoriteThings = getProfileFavoriteThings(nextInterestDetails);

      const updatedPayload: DatingProfilePayload = {
        ...(profile ?? {
          area: formData.area,
          birthday: formData.birthday,
          datingModes: sanitizeDateRequestCategories(formData.datingModes),
          favoriteThings: nextFavoriteThings,
          favoritePlaces: formData.favoritePlaces,
          friendInvites: [],
          interestDetails: nextInterestDetails,
          interestedIn: formData.interestedIn,
          interests: getProfileInterestKeys(nextInterestDetails),
          lookingFor: formData.lookingFor,
          media: [],
          safetyOptIn: formData.safetyOptIn,
          sex: formData.sex,
          sexuality: formData.sexuality,
          trustedContacts: [],
        }),
        username: normalizedUsername,
        name: formData.name.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        birthday: formData.birthday,
        area: formData.area,
        sex: formData.sex,
        sexuality: formData.sexuality,
        height: formData.height,
        weight: formData.weight,
        maritalStatus: formData.maritalStatus,
        kids: formData.kids,
        wantsKids: formData.wantsKids,
        occupation: formData.occupation,
        religion: formData.religion,
        politics: formData.politics,
        interestedIn: formData.interestedIn,
        ageRangeMin: formData.ageRangeMin,
        ageRangeMax: formData.ageRangeMax,
        distanceMiles: formData.distanceMiles,
        lookingFor: formData.lookingFor,
        datingModes: sanitizeDateRequestCategories(formData.datingModes),
        favoriteThings: nextFavoriteThings,
        favoritePlaces: formData.favoritePlaces,
        interestDetails: nextInterestDetails,
        interests: getProfileInterestKeys(nextInterestDetails),
        safetyOptIn: formData.safetyOptIn,
        trustedContacts: [
          {
            name: formData.trustedContactName,
            phone: formData.trustedContactPhone,
            email: formData.trustedContactEmail,
          },
        ],
        media: formData.media,
      };

      if (!usernameWasUnchanged) {
        const { error: usernameError } = await authClient.updateUser({
          username: normalizedUsername,
        });
        if (usernameError) {
          throw new Error(
            usernameError.message ?? "That username is taken. Pick another one."
          );
        }
      }

      await datingApi.saveProfile(updatedPayload);
      setProfile(updatedPayload);
      toast.success("Profile settings updated successfully!");
      setProfileMode("profile");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update profile settings."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-5 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-extrabold tracking-tight">
            Profile & Onboarding Settings
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage all your onboarding responses, dating criteria, and account
            details in one place.
          </p>
        </div>
        <Badge
          className="rounded-full uppercase text-[10px] px-3 py-1"
          variant="secondary"
        >
          {tier} Tier
        </Badge>
      </div>

      {/* SECTION 1: USERNAME & BASIC IDENTITY */}
      <Card className="rounded-3xl border-border bg-card/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <User className="size-4 text-primary" />
            Profile media
          </CardTitle>
          <CardDescription className="text-xs">
            Replace your profile photo, intro video, or add a photo without
            returning to the onboarding wizard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["profile_photo", "Profile photo", "image/*"],
              ["intro_video", "Intro video", "video/*"],
              ["photo", "Additional photo", "image/*"],
            ] as const
          ).map(([kind, label, accept]) => (
            <label
              className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-border p-4 text-center transition hover:border-primary/60 hover:bg-primary/5"
              key={kind}
            >
              <span className="text-xs font-bold">{label}</span>
              <span className="text-[11px] text-muted-foreground">
                {uploadingMedia === kind ? "Uploading..." : "Choose file"}
              </span>
              <input
                accept={accept}
                className="sr-only"
                disabled={Boolean(uploadingMedia)}
                onChange={(event) => {
                  void uploadProfileMedia(event.target.files?.[0], kind);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </label>
          ))}
        </CardContent>
      </Card>

      {/* SECTION 1: USERNAME & BASIC IDENTITY */}
      <Card className="rounded-3xl border-border bg-card/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <User className="size-4 text-primary" />
            1. Identity & Username
          </CardTitle>
          <CardDescription className="text-xs">
            Your unique @username is required for matching and date circle tags.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">
              Username <span className="text-red-500">*</span>
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
                @
              </span>
              <Input
                aria-describedby="profile-username-status"
                aria-invalid={
                  usernameStatus === "invalid" || usernameStatus === "taken"
                }
                className={cn(
                  "rounded-full pl-7",
                  usernameStatus === "available" &&
                    "border-emerald-500 focus-visible:ring-emerald-500/35",
                  (usernameStatus === "invalid" ||
                    usernameStatus === "taken") &&
                    "border-destructive focus-visible:ring-destructive/35"
                )}
                placeholder="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value.toLowerCase(),
                  })
                }
              />
            </div>
            <p
              className={cn(
                "text-[11px]",
                usernameStatus === "available" && "text-emerald-600",
                usernameStatus === "checking" && "text-muted-foreground",
                (usernameStatus === "invalid" || usernameStatus === "taken") &&
                  "text-destructive"
              )}
              id="profile-username-status"
            >
              {usernameMessage}
            </p>
          </Field>

          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">Display Name</FieldLabel>
            <Input
              className="rounded-full"
              placeholder="First Last"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </Field>

          <Field className="sm:col-span-2 gap-1">
            <FieldLabel className="text-xs font-bold">Bio</FieldLabel>
            <Textarea
              className="rounded-2xl bg-background/80"
              placeholder="Tell dates a bit about yourself..."
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
            />
          </Field>

          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">
              Location (City, State)
            </FieldLabel>
            <Input
              className="rounded-full"
              placeholder="Nashville, TN"
              value={formData.area}
              onChange={(e) =>
                setFormData({ ...formData, area: e.target.value })
              }
            />
          </Field>

          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">Birthday</FieldLabel>
            <Input
              type="date"
              className="rounded-full"
              value={formData.birthday}
              onChange={(e) =>
                setFormData({ ...formData, birthday: e.target.value })
              }
            />
          </Field>
        </CardContent>
      </Card>

      {/* SECTION 2: PHYSICAL & PERSONAL DETAILS */}
      <Card className="rounded-3xl border-border bg-card/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            2. Personal Details & Lifestyle
          </CardTitle>
          <CardDescription className="text-xs">
            These onboarding wizard fields help filter matches and display badge
            details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <SettingsSelectField
            label="Sex"
            onChange={(sex) => setFormData({ ...formData, sex })}
            options={sexOptions}
            value={formData.sex}
          />

          <SettingsSelectField
            label="Sexuality"
            onChange={(sexuality) => setFormData({ ...formData, sexuality })}
            options={sexualityOptions}
            value={formData.sexuality}
          />

          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">Height</FieldLabel>
            <Input
              className="rounded-full"
              placeholder="5'10&quot;"
              value={formData.height}
              onChange={(e) =>
                setFormData({ ...formData, height: e.target.value })
              }
            />
          </Field>

          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">Weight</FieldLabel>
            <Input
              className="rounded-full"
              placeholder="165 lbs"
              value={formData.weight}
              onChange={(e) =>
                setFormData({ ...formData, weight: e.target.value })
              }
            />
          </Field>

          <SettingsSelectField
            label="Relationship Status"
            onChange={(maritalStatus) =>
              setFormData({ ...formData, maritalStatus })
            }
            options={maritalStatusOptions}
            value={formData.maritalStatus}
          />

          <SettingsSelectField
            label="Kids"
            onChange={(kids) => setFormData({ ...formData, kids })}
            options={kidsOptions}
            value={formData.kids}
          />

          <SettingsSelectField
            label="Future Kids"
            onChange={(wantsKids) => setFormData({ ...formData, wantsKids })}
            options={wantsKidsOptions}
            value={formData.wantsKids}
          />

          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">Occupation</FieldLabel>
            <Input
              className="rounded-full"
              placeholder="Engineer, Designer..."
              value={formData.occupation}
              onChange={(e) =>
                setFormData({ ...formData, occupation: e.target.value })
              }
            />
          </Field>

          <SettingsSelectField
            label="Religion"
            onChange={(religion) => setFormData({ ...formData, religion })}
            options={religionOptions}
            value={formData.religion}
          />

          <SettingsSelectField
            label="Politics"
            onChange={(politics) => setFormData({ ...formData, politics })}
            options={politicsOptions}
            value={formData.politics}
          />
        </CardContent>
      </Card>

      {/* SECTION 3: DATING PREFERENCES & CRITERIA */}
      <Card className="rounded-3xl border-border bg-card/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Heart className="size-4 text-primary" />
            3. Dating Preferences & Match Criteria
          </CardTitle>
          <CardDescription className="text-xs">
            Configure who you want to meet and what date styles you prefer.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <SettingsMultiPillField
            label="Interested In"
            onChange={(interestedIn) =>
              setFormData({ ...formData, interestedIn })
            }
            options={interestedInOptions}
            value={formData.interestedIn}
          />

          <SettingsMultiPillField
            label="Looking For"
            onChange={(lookingFor) => setFormData({ ...formData, lookingFor })}
            options={lookingForOptions}
            value={formData.lookingFor}
          />

          <ProfileChipVisibilityField
            onChange={(visibleProfileChips) =>
              setFormData({ ...formData, visibleProfileChips })
            }
            options={formProfileChipOptions}
            value={formData.visibleProfileChips}
          />

          <div className="sm:col-span-2">
            <SettingsMultiPillField
              label="Date Request Categories"
              onChange={(datingModes) =>
                setFormData({ ...formData, datingModes })
              }
              options={dateRequestCategoryOptions}
              value={formData.datingModes}
            />
            <FieldDescription className="mt-2 text-xs">
              Chewbuu date requests can only be Eat, Drink, or Play.
            </FieldDescription>
          </div>

          <div className="grid gap-3 sm:col-span-2">
            <div>
              <p className="font-bold text-xs">Interest Categories</p>
              <FieldDescription className="mt-1 text-xs">
                These mirror onboarding chips and keep each signal in its
                category.
              </FieldDescription>
            </div>
            <div className="grid gap-3">
              {availableSettingsInterestCategories.map((category) => (
                <div
                  className="rounded-2xl border border-border bg-background/35 p-3"
                  key={category.label}
                >
                  <p className="mb-2 font-bold text-xs">{category.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {category.suggestions.map((suggestion) => {
                      const active = (
                        formData.interestDetails[category.label] ?? []
                      ).includes(suggestion);
                      return (
                        <button
                          className={cn(
                            "rounded-full px-3 py-1.5 font-bold text-xs transition",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          )}
                          key={suggestion}
                          onClick={() =>
                            toggleInterestDetail(category.label, suggestion)
                          }
                          type="button"
                        >
                          {suggestion}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">
              Age Range Min ({formData.ageRangeMin})
            </FieldLabel>
            <Input
              type="number"
              className="rounded-full"
              value={formData.ageRangeMin}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ageRangeMin: Number(e.target.value),
                })
              }
            />
          </Field>

          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">
              Age Range Max ({formData.ageRangeMax})
            </FieldLabel>
            <Input
              type="number"
              className="rounded-full"
              value={formData.ageRangeMax}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ageRangeMax: Number(e.target.value),
                })
              }
            />
          </Field>
        </CardContent>
      </Card>

      {/* SECTION 4: SAFETY CONTACT */}
      <Card className="rounded-3xl border-border bg-card/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            4. Safety & Emergency Contact
          </CardTitle>
          <CardDescription className="text-xs">
            Trusted contacts receive live date safety check-ins and emergency
            alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">Contact Name</FieldLabel>
            <Input
              className="rounded-full"
              placeholder="Friend / Family Member"
              value={formData.trustedContactName}
              onChange={(e) =>
                setFormData({ ...formData, trustedContactName: e.target.value })
              }
            />
          </Field>

          <Field className="gap-1">
            <FieldLabel className="text-xs font-bold">Contact Phone</FieldLabel>
            <Input
              className="rounded-full"
              placeholder="Phone number"
              value={formData.trustedContactPhone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  trustedContactPhone: e.target.value,
                })
              }
            />
          </Field>
        </CardContent>
      </Card>

      {formErrors.length > 0 ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-xs">
          <p className="font-bold">Fix these before saving</p>
          <ul className="mt-2 grid gap-1">
            {formErrors.slice(0, 4).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-emerald-600 text-xs">
          Profile settings look ready to save.
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <Button
          variant="outline"
          className="rounded-full font-bold px-6"
          onClick={() => setProfileMode("profile")}
          type="button"
        >
          Cancel
        </Button>
        <Button
          className="rounded-full font-bold px-8 shadow-lg shadow-primary/20"
          disabled={isSaving || usernameStatus === "checking"}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "Saving Settings..." : "Save All Profile Settings"}
        </Button>
      </div>
    </div>
  );
}

function SettingsSelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <Field className="gap-1">
      <FieldLabel className="font-bold text-xs">{label}</FieldLabel>
      <Select
        onValueChange={(nextValue) => {
          if (nextValue) onChange(nextValue);
        }}
        value={value}
      >
        <SelectTrigger className="h-10 w-full rounded-full border border-border bg-background px-4 text-sm">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto rounded-2xl border border-border bg-popover p-1 shadow-xl">
          {options.map((option) => (
            <SelectItem
              className="cursor-pointer rounded-xl px-3 py-2 text-xs focus:bg-primary/10 focus:text-primary"
              key={option}
              value={option}
            >
              {formatLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function SettingsMultiPillField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string[]) => void;
  options: readonly string[];
  value: string[];
}) {
  return (
    <Field className="gap-1">
      <FieldLabel className="font-bold text-xs">{label}</FieldLabel>
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map((option) => {
          const active = value.includes(option);
          return (
            <button
              className={cn(
                "rounded-full px-3 py-1.5 font-bold text-xs transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
              key={option}
              onClick={() => {
                const next = active
                  ? value.filter((item) => item !== option)
                  : [...value, option];
                onChange(next);
              }}
              type="button"
            >
              {formatLabel(option)}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function ProfileChipVisibilityField({
  onChange,
  options,
  value,
}: {
  onChange: (value: string[]) => void;
  options: string[];
  value: string[];
}) {
  return (
    <Field className="gap-1">
      <FieldLabel className="font-bold text-xs">Shown on Profile</FieldLabel>
      <FieldDescription className="text-xs">
        Choose which dating details appear as public profile chips.
      </FieldDescription>
      <div className="flex flex-wrap gap-2 pt-1">
        {options.length > 0 ? (
          options.map((option) => {
            const active = value.includes(option);
            return (
              <button
                className={cn(
                  "rounded-full px-3 py-1.5 font-bold text-xs transition",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
                key={option}
                onClick={() => {
                  const next = active
                    ? value.filter((item) => item !== option)
                    : [...value, option];
                  onChange(next);
                }}
                type="button"
              >
                {profileChipLabel(option)}
              </button>
            );
          })
        ) : (
          <span className="text-muted-foreground text-xs">
            Pick looking-for or lifestyle options first.
          </span>
        )}
      </div>
    </Field>
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
  anonymousReviewNotes,
  circleGroups,
  profileRating,
  reviewCount,
  recapsCount,
  target,
}: {
  anonymousReviewNotes: string[];
  circleGroups: {
    id: string;
    members: CircleInvite[];
    name: string;
    pending: CircleInvite[];
  }[];
  profileRating: null | number;
  reviewCount: number;
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

  if (target === "reviews") {
    return (
      <Card className="rounded-2xl border-border bg-card/45">
        <CardContent className="grid gap-3 p-4">
          <div className="flex items-center gap-2">
            <Badge className="rounded-full">
              {profileRating === null ? (
                "New dater"
              ) : (
                <>
                  <Star className="size-3 fill-current" />
                  {profileRating.toFixed(1)}
                </>
              )}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {reviewCount < 2
                ? "Ratings show after 2 review signals."
                : `${reviewCount} anonymous date review${
                    reviewCount === 1 ? "" : "s"
                  }`}
            </span>
          </div>
          {reviewCount < 2 ? (
            <p className="rounded-2xl border border-border bg-background/40 p-3 text-muted-foreground text-sm">
              New profiles start without a public star score. Date reviews,
              completed recaps, and attached date media build the score once
              there is enough signal.
            </p>
          ) : null}
          <div className="grid gap-2">
            {anonymousReviewNotes.map((note) => (
              <p
                className="rounded-2xl border border-border bg-background/40 p-3 text-sm"
                key={note}
              >
                {note}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border bg-card/45">
      <CardContent className="grid gap-3 p-4">
        <Link
          className="text-primary text-sm font-semibold underline"
          to="/communities"
        >
          Create or manage a Crew / Circle
        </Link>
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
            <Link
              className={buttonVariants({
                className: "mt-1 w-full rounded-full text-xs font-bold",
                size: "sm",
              })}
              hash={
                readinessItems.find((item) => !item.checked)?.hash ?? "basics"
              }
              to="/onboarding"
            >
              Continue onboarding
              <ChevronRight className="ml-1 size-3.5" />
            </Link>
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

function DateRequestSection({
  children,
  count,
  description,
  title,
}: {
  children: ReactNode;
  count: number;
  description: string;
  title: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-bold text-sm">{title}</h3>
          <p className="max-w-2xl text-muted-foreground text-xs">
            {description}
          </p>
        </div>
        <Badge className="w-fit rounded-full text-[10px]" variant="secondary">
          {count} {count === 1 ? "request" : "requests"}
        </Badge>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function DateHistoryNotification({
  date,
  onOpen,
  onOpenStep,
  onPlayVideo,
  onViewProfile,
  userAvatar,
  userName = "You",
}: {
  date: DateHistoryItem;
  onOpen: () => void;
  onOpenStep?: (step: "request" | "matcher" | "choice" | "date") => void;
  onPlayVideo?: () => void;
  onViewProfile?: () => void;
  userAvatar?: string;
  userName?: string;
}) {
  const acceptedMatch = date.matches.find(
    (match) => match.id === date.acceptedMatchId
  );
  const visibleTags = date.requester.tags.slice(0, 3);
  const isConfirmed = date.status === "Confirmed";

  return (
    <div
      className={cn(
        "group flex w-full min-w-0 flex-col gap-4 rounded-2xl border p-4 text-left transition sm:flex-row sm:items-stretch sm:p-5 shadow-sm hover:shadow-md",
        date.requesterView
          ? "border-sky-500/40 bg-sky-500/8 hover:border-sky-500/70 hover:bg-sky-500/12"
          : "border-primary/30 bg-primary/8 hover:border-primary/60 hover:bg-primary/12"
      )}
    >
      {/* Hero Media / Video Preview Thumbnail */}
      <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl border border-border/80 bg-card/90 shadow-sm transition group-hover:border-primary/50 sm:h-auto sm:w-48 md:w-56">
        {date.requester.avatar ? (
          <img
            alt={date.requester.name}
            className="size-full object-cover"
            src={date.requester.avatar}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted font-bold text-muted-foreground text-base">
            {date.requester.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        {/* Play Button Overlay */}
        <button
          aria-label={`Play intro video for ${date.requester.name}`}
          className="absolute inset-0 flex items-center justify-center bg-black/35 transition hover:bg-black/20"
          onClick={(e) => {
            e.stopPropagation();
            onPlayVideo?.();
          }}
          type="button"
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-lg transition group-hover:scale-110">
            <Play className="ml-0.5 size-5 fill-primary-foreground" />
          </div>
        </button>
        {date.requester.compatibility ? (
          <Badge className="absolute top-2 left-2 border-0 bg-amber-500/90 font-bold text-[10px] text-white shadow-xs">
            ★ {date.requester.compatibility}% Match
          </Badge>
        ) : null}
      </div>

      {/* Content details & Footer layout (Image 1 inspired) */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="flex flex-col gap-2">
          {/* Top category & scheduled time bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {date.what.map((item) => (
                <Badge
                  className="rounded-full font-bold text-[10px] uppercase tracking-wide"
                  key={item}
                  variant="secondary"
                >
                  {formatLabel(item)}
                </Badge>
              ))}
              {visibleTags.map((tag) => (
                <Badge
                  className="rounded-full border-0 text-[10px]"
                  key={tag}
                  variant="outline"
                >
                  {tag}
                </Badge>
              ))}
              {acceptedMatch && isConfirmed ? (
                <Badge className="rounded-full border-0 bg-emerald-500/15 font-semibold text-emerald-600 text-[10px]">
                  Matched with {acceptedMatch.displayName}
                </Badge>
              ) : null}
            </div>
            <span className="font-semibold text-muted-foreground text-xs">
              {new Date(date.scheduledAt).toLocaleDateString([], {
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                month: "short",
              })}
            </span>
          </div>

          {/* Large Title */}
          <h4 className="font-extrabold text-foreground text-base tracking-tight sm:text-lg">
            {date.title}
          </h4>

          {/* Bio / Request description */}
          <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
            {date.requester.bio ||
              `Looking for a fun date in ${date.searchArea}. Open to checking out great local spots together!`}
          </p>
        </div>

        {/* Divider & Footer Section */}
        <div className="flex flex-col gap-3 border-border/60 border-t pt-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Requester / Sender Avatar & Info */}
            <div className="flex items-center gap-2.5">
              <Avatar className="size-9 border border-border shadow-xs">
                {date.requesterView ? (
                  userAvatar ? (
                    <AvatarImage src={userAvatar} />
                  ) : (
                    <AvatarFallback className="bg-sky-500/20 font-bold text-sky-600 text-xs uppercase">
                      {userName.slice(0, 2)}
                    </AvatarFallback>
                  )
                ) : date.requester.avatar ? (
                  <AvatarImage src={date.requester.avatar} />
                ) : (
                  <AvatarFallback className="bg-primary/20 font-bold text-primary text-xs uppercase">
                    {date.requester.name.slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="min-w-0">
                <p className="truncate font-bold text-xs">
                  {date.requesterView
                    ? `${userName} (You sent)`
                    : date.requester.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {date.requesterView
                    ? `Waiting on matches in ${date.searchArea}`
                    : `${date.requester.compatibility ? `${date.requester.compatibility}% match · ` : ""}${date.searchArea}`}
                </p>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {!date.requesterView ? (
                <>
                  <Button
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewProfile?.();
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Eye className="mr-1.5 size-3.5" />
                    View Profile
                  </Button>
                  <Button
                    className="h-8 rounded-full font-bold text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenStep) {
                        onOpenStep("matcher");
                      } else {
                        onOpen();
                      }
                    }}
                    size="sm"
                    type="button"
                  >
                    <Heart className="mr-1.5 size-3.5 fill-current" />
                    I'm Interested
                  </Button>
                </>
              ) : (
                <Button
                  className="h-8 rounded-full font-bold text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenStep) {
                      onOpenStep("matcher");
                    } else {
                      onOpen();
                    }
                  }}
                  size="sm"
                  type="button"
                >
                  <Users className="mr-1.5 size-3.5" />
                  Review Candidate Rooms
                  <ChevronRight className="ml-1 size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function DateHistoryDetail({
  date,
  initialStep = "request",
  onShowChats,
}: {
  date: DateHistoryItem;
  initialStep?: StepKey;
  onShowChats: () => void;
}) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState<DateHistoryItem>(date);
  const [isGeofenceScanned, setIsGeofenceScanned] = useState(false);
  const [mediaList, setMediaList] = useState<
    { id: string; name: string; url: string }[]
  >([]);

  useEffect(() => {
    setCurrentDate(date);
  }, [date]);

  const acceptedMatch = currentDate.matches.find(
    (match) => match.id === currentDate.acceptedMatchId
  );

  const [activeCardStep, setActiveCardStep] = useState<StepKey>(initialStep);

  const [activeChatMatchId, setActiveChatMatchId] = useState<string | null>(
    null
  );

  const activeChatCandidate = currentDate.matches.find(
    (match) => match.id === activeChatMatchId
  );

  const handleDateMediaUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const kind = file.type.startsWith("video/") ? "video" : "photo";
      const upload = await blocksApi.createMediaUpload({
        contentType: file.type || "application/octet-stream",
        fileName: file.name,
        slot: kind === "video" ? "intro_video" : "photo",
      });
      const response = await fetch(upload.uploadUrl, {
        body: file,
        headers: { "content-type": file.type },
        method: "PUT",
      });
      if (!response.ok) throw new Error("Media upload failed.");
      const media = await dateMediaApi.upload({
        dateRequestId: currentDate.id,
        kind,
        url: upload.mediaUrl,
      });
      setMediaList((previous) => [
        ...previous,
        { id: media.media.id, name: file.name, url: media.media.url },
      ]);
      toast.success("Date media uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  const handleStepChange = (nextStep: StepKey) => {
    setActiveCardStep(nextStep);
    if (nextStep !== "matcher") setActiveChatMatchId(null);
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, step: nextStep }),
      to: "/me",
      replace: true,
    } as Parameters<typeof navigate>[0]);
  };

  const steps: StepItem[] = [
    {
      description: `${currentDate.places.length || 3} spots selected`,
      key: "request" as const,
      label: "Request",
      locked: currentDate.status === "Confirmed",
      tone: "done" as const,
    },
    {
      description: activeChatCandidate
        ? `Room with ${activeChatCandidate.displayName}`
        : `${currentDate.matches.length} candidate rooms`,
      key: "matcher" as const,
      label: "Matcher",
      locked: currentDate.status === "Confirmed",
      tone: "live" as const,
    },
    {
      description: acceptedMatch
        ? `${acceptedMatch.displayName} chosen`
        : "Pending partner",
      key: "choice" as const,
      label: "Choice",
      tone: acceptedMatch ? ("done" as const) : ("muted" as const),
    },
    {
      description: isGeofenceScanned
        ? "Live + memories open"
        : "After confirmation",
      key: "date" as const,
      label: "Date",
      tone: isGeofenceScanned ? ("live" as const) : ("muted" as const),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <HorizontalStepper
        activeStep={activeCardStep}
        onSelectStep={handleStepChange}
        steps={steps}
      />

      {/* CARD 1: REQUEST SUMMARY VIEW (ITINERARY TIMELINE) */}
      {activeCardStep === "request" && (
        <Card className="rounded-2xl border-border bg-card/45 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-extrabold text-lg tracking-tight">
                  Date Itinerary & Planned Order
                </CardTitle>
                <CardDescription className="text-xs">
                  Initial itinerary schedule for both date partners. Sequence
                  and spots can be refined together on the Choice step.
                </CardDescription>
              </div>
              <Badge
                className={cn(
                  "rounded-full border-0 px-3 py-1 font-bold text-xs",
                  currentDate.status === "Confirmed"
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-amber-500/15 text-amber-600"
                )}
              >
                {currentDate.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Top Overview Bar */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3.5 shadow-2xs">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Utensils className="size-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                    Activity Categories
                  </span>
                  <p className="mt-0.5 truncate font-extrabold text-sm">
                    {currentDate.what.map(formatLabel).join(" + ")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {currentDate.title}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3.5 shadow-2xs">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                  <CalendarHeart className="size-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                    Scheduled Time
                  </span>
                  <p className="mt-0.5 truncate font-extrabold text-sm">
                    {new Date(currentDate.scheduledAt).toLocaleDateString([], {
                      day: "numeric",
                      month: "short",
                      weekday: "short",
                    })}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(currentDate.scheduledAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3.5 shadow-2xs">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <MapPin className="size-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                    Location Area
                  </span>
                  <p className="mt-0.5 truncate font-extrabold text-sm">
                    {currentDate.searchArea}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Solo request · Dutch split
                  </p>
                </div>
              </div>
            </div>

            {/* Stepper Itinerary Timeline */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/40 p-4 sm:p-5">
              <div className="flex items-center justify-between border-border/60 border-b pb-3">
                <h4 className="font-extrabold text-sm uppercase tracking-wide">
                  Planned Itinerary Stops
                </h4>
                {!currentDate.requesterView &&
                  currentDate.status !== "Confirmed" && (
                    <Badge className="rounded-full border-0 bg-primary/10 font-medium text-[10px] text-primary">
                      🔒 Venue names hidden until confirmed
                    </Badge>
                  )}
              </div>

              <div className="relative flex flex-col gap-4 pl-2 pt-2">
                {/* Timeline vertical connector bar */}
                <div className="absolute top-6 bottom-6 left-[21px] w-0.5 bg-border/80" />

                {currentDate.places.map((place, index) => {
                  const categoryLabel =
                    currentDate.what[index % currentDate.what.length] ?? "eat";
                  const canSeeDetails =
                    currentDate.requesterView ||
                    currentDate.status === "Confirmed";

                  return (
                    <div
                      className="relative flex items-start gap-3.5"
                      key={place.placeId || index}
                    >
                      {/* Step Number Badge */}
                      <div className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background font-extrabold text-xs text-primary shadow-xs">
                        {index + 1}
                      </div>

                      {/* Stop Detail Card */}
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="rounded-full font-bold text-[10px] uppercase tracking-wider">
                              Stop {index + 1} · {formatLabel(categoryLabel)}
                            </Badge>
                            {canSeeDetails ? (
                              <Badge className="rounded-full border-0 bg-emerald-500/10 font-bold text-[9px] text-emerald-600">
                                Venue Unlocked
                              </Badge>
                            ) : (
                              <Badge className="rounded-full border-0 bg-amber-500/10 font-bold text-[9px] text-amber-600">
                                🔒 Hidden Category
                              </Badge>
                            )}
                          </div>
                          <span className="font-semibold text-muted-foreground text-[11px]">
                            {place.types?.[0]
                              ? formatLabel(place.types[0])
                              : "Recommended Spot"}
                          </span>
                        </div>

                        {canSeeDetails ? (
                          <>
                            <p className="font-extrabold text-foreground text-sm">
                              {place.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {place.address ?? `${currentDate.searchArea}`}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-foreground/90 text-sm">
                              {formatLabel(categoryLabel)} Spot in{" "}
                              {currentDate.searchArea}
                            </p>
                            <p className="text-xs text-muted-foreground italic">
                              Specific venue name & street address are kept
                              private until you match and confirm the date.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Matcher Transition Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-sm">Ready for matching</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Each match opens as a date room first. Those rooms become
                  regular chats after a friend or keep-chatting choice.
                </p>
              </div>
              <Button
                className="shrink-0 rounded-full font-bold text-xs"
                onClick={() => handleStepChange("matcher")}
                size="sm"
                type="button"
              >
                Review candidate rooms
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CARD 2: MATCHER CANDIDATES DIRECTORY */}
      {activeCardStep === "matcher" && !activeChatCandidate && (
        <Card className="rounded-xl border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-base">Matcher rooms</CardTitle>
            <CardDescription>
              Open a candidate room inside this date request until you make a
              choice.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {currentDate.matches.map((match) => (
              <DateHistoryMatchRow
                isAccepted={match.id === currentDate.acceptedMatchId}
                key={match.id}
                match={match}
                onShowChats={onShowChats}
                onOpenChat={(id) => {
                  setActiveChatMatchId(id);
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* CANDIDATE CHAT / DATE ROOM VIEW */}
      {activeCardStep === "matcher" && activeChatCandidate ? (
        <Card className="rounded-xl border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-base">
              Open this date room in Chats
            </CardTitle>
            <CardDescription>
              Conversation history and media are available only from the live
              chat room.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="rounded-full"
              onClick={onShowChats}
              type="button"
            >
              Open Chats
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* CARD 3: PRE-DATE CONFIRM + QR */}
      {activeCardStep === "choice" && acceptedMatch ? (
        <DateConfirmScreen
          onCancelDate={() => {
            setCurrentDate((prev) => ({
              ...prev,
              status: "Canceled",
            }));
          }}
          onCheckedIn={() => {
            setIsGeofenceScanned(true);
            setActiveCardStep("date");
          }}
          onFinalize={() => {
            setCurrentDate((prev) => ({
              ...prev,
              status: "Confirmed",
            }));
          }}
          onOpenChat={() => {
            setActiveChatMatchId(acceptedMatch.id);
            setActiveCardStep("matcher");
          }}
          onReschedule={(nextIso) => {
            setCurrentDate((prev) => ({
              ...prev,
              scheduledAt: nextIso,
            }));
          }}
          onSuggestPlace={(placeName) => {
            toast.message(`Suggested spot: ${placeName}`);
          }}
          partner={{
            avatar: acceptedMatch.photoUrl ?? "",
            compatibility: acceptedMatch.compatibility,
            id: acceptedMatch.id,
            name: acceptedMatch.displayName,
            note: acceptedMatch.note,
            tags: acceptedMatch.tags,
            verified: true,
          }}
          places={currentDate.places.map((place) => ({
            address: place.address ?? currentDate.searchArea,
            name: place.name,
            placeId: place.placeId,
            rating: place.rating,
          }))}
          role={currentDate.requesterView ? "sender" : "receiver"}
          scheduledAt={currentDate.scheduledAt}
          searchArea={currentDate.searchArea}
          title={currentDate.title}
        />
      ) : null}
      {activeCardStep === "choice" && !acceptedMatch ? (
        <Card className="rounded-xl border-border bg-card/45">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No date partner picked yet. Open{" "}
            <button
              type="button"
              onClick={() => setActiveCardStep("matcher")}
              className="font-bold text-primary underline"
            >
              Matcher
            </button>{" "}
            , exchange videos, then pick someone.
          </CardContent>
        </Card>
      ) : null}

      {/* CARD 4: LIVE DATE SCREEN */}
      {activeCardStep === "date" && (
        <Card className="rounded-xl border-border bg-card/45">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Live Date Screen</CardTitle>
                <CardDescription>
                  Attach media memories, access safety protocols, and end date
                  for reviews.
                </CardDescription>
              </div>
              <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 border-0 font-bold">
                Live Date Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {/* Media Upload Memories Section */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-bold text-foreground">
                  Attach Date Memories (Photos & Videos)
                </span>
                <label className="rounded-full text-[10px] h-7 px-3 flex items-center gap-1">
                  <Plus className="size-3" />
                  Add Photo / Video
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*,video/*"
                    onChange={(event) => {
                      void handleDateMediaUpload(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              {mediaList.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {mediaList.map((m) => (
                    <div
                      key={m.id}
                      className="relative rounded-lg overflow-hidden border border-border aspect-square bg-black/40"
                    >
                      <img
                        src={m.url}
                        alt={m.name}
                        className="size-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-dashed border-border/80 rounded-lg text-center text-xs text-muted-foreground">
                  No photos or videos attached yet. Click &quot;Add Photo /
                  Video&quot; to capture memories!
                </div>
              )}
            </div>

            {/* Safety Menu */}
            <div className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-xs text-foreground">
                  Safety & Location Share
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Share live location with emergency contacts
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.success(
                    "Emergency contact notified of live date location."
                  )
                }
                className="rounded-full text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10 h-8"
              >
                Safety Hotline
              </Button>
            </div>

            {/* End Date CTA */}
            <div className="flex flex-col gap-3 border-border/80 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Ready to finish your date?
              </span>
              <Button
                onClick={() => {
                  toast.success("Date completed! Proceeding to review flow...");
                  navigate({
                    to: "/reviews/$requestid",
                    params: { requestid: currentDate.id },
                  });
                }}
                className="rounded-full font-bold text-xs bg-primary text-primary-foreground shadow-md px-5"
              >
                End Date & Complete Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DateHistoryMatchRow({
  isAccepted,
  match,
  onShowChats,
  onOpenChat,
}: {
  isAccepted: boolean;
  match: DateHistoryMatch;
  onShowChats: () => void;
  onOpenChat: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/50 p-3 sm:flex-row sm:items-center">
      <Avatar className="size-12 border border-border animate-none shrink-0">
        {match.photoUrl && <AvatarImage src={match.photoUrl} />}
        <AvatarFallback>{match.displayName.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-sm">{match.displayName}</p>
          <Badge
            className="rounded-full text-[10px] border-0"
            variant="secondary"
          >
            {match.compatibility}% match
          </Badge>
          <MatchStatusBadge status={match.status} />
          {isAccepted ? (
            <Badge className="rounded-full bg-primary/10 text-[10px] text-primary border-0">
              Chosen
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{match.note}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {match.tags.map((tag) => (
            <Badge className="rounded-full text-[9px] border-0" key={tag}>
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      {match.status === "friended" || match.status === "saved" ? (
        <Button
          className="rounded-full text-xs animate-none"
          onClick={onShowChats}
          size="sm"
          type="button"
        >
          <MessageCircle className="size-4" />
          Chat
        </Button>
      ) : match.status === "declined" || match.status === "archived" ? (
        <Button
          className="rounded-full text-xs animate-none"
          disabled
          size="sm"
          variant="ghost"
        >
          {match.status === "archived" ? "Archived" : "Declined"}
        </Button>
      ) : (
        <Button
          className="rounded-full text-xs animate-none"
          onClick={() => onOpenChat(match.id)}
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
    archived: "Archived",
    declined: "Rejected",
    friended: "Friend",
    saved: "Chat",
    suggested: "Suggested",
  }[status];
  const className =
    status === "declined" || status === "archived"
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
