import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button, buttonVariants } from "@chewbuu/ui/components/button";
import { Calendar } from "@chewbuu/ui/components/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Checkbox } from "@chewbuu/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import { Field, FieldLabel } from "@chewbuu/ui/components/field";
import { Input } from "@chewbuu/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@chewbuu/ui/components/popover";
import { Progress } from "@chewbuu/ui/components/progress";
import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Beer,
  Calendar as CalendarIcon,
  Check,
  ChevronRight,
  Gamepad2,
  MapPin,
  MessageCircle,
  Plus,
  Sparkles,
  Star,
  Users,
  Utensils,
  Video,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { datingApi } from "@/lib/dating-api";
import type {
  DateMatch,
  DatePlace,
  DateRequestPayload,
  DateWhat,
} from "@/lib/dating-api";

const steps = ["Plan", "Places", "Matches"] as const;

type WizardWhat = "eat" | "drink" | "play";

const activityOptions: { hint: string; label: string; value: WizardWhat }[] = [
  { hint: "Restaurants & food", label: "Eat", value: "eat" },
  { hint: "Bars, coffee & more", label: "Drink", value: "drink" },
  { hint: "Games & activities", label: "Play", value: "play" },
];

const CATEGORY_FILTERS: Record<WizardWhat, string[]> = {
  drink: [
    "Cocktails",
    "Whiskey",
    "Wine",
    "Craft beer",
    "Coffee",
    "Boba",
    "Mocktails",
    "Dive bar",
  ],
  eat: [
    "Tacos",
    "Sushi",
    "Barbecue",
    "Brunch",
    "Pasta",
    "Burgers",
    "Ramen",
    "Dessert",
  ],
  play: [
    "Pool",
    "Bowling",
    "Arcade",
    "Live music",
    "Comedy",
    "Karaoke",
    "Trivia",
    "Mini golf",
  ],
};

const MAX_GUESTS = 3;
const REQUIRED_SPOTS = 3;

const isComboPlace = (types: string[]): boolean => {
  const hasFood = types.some((t) =>
    ["restaurant", "food", "cafe", "meal_takeaway", "diner"].includes(t)
  );
  const hasDrink = types.some((t) =>
    ["bar", "night_club", "brewery"].includes(t)
  );
  const hasPlay = types.some((t) =>
    [
      "amusement_park",
      "bowling_alley",
      "movie_theater",
      "casino",
      "museum",
      "tourist_attraction",
      "park",
      "zoo",
      "stadium",
      "aquarium",
      "video_arcade",
    ].includes(t)
  );
  return [hasFood, hasDrink, hasPlay].filter(Boolean).length >= 2;
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

const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultScheduledAt = () => {
  const tomorrow = new Date(Date.now() + 86_400_000);
  tomorrow.setMinutes(0);
  return toLocalInputValue(tomorrow);
};

const formatDateLabel = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Pick a date";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(date);
};

const emailPattern = /^\S+@\S+\.\S+$/;

interface DateWizardProps {
  membershipTier: string;
  presetPlace?: DatePlace;
}

export function DateWizard({ membershipTier, presetPlace }: DateWizardProps) {
  const [step, setStep] = useState(0);
  const [matches, setMatches] = useState<DateMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState<DateMatch | null>(null);
  const [isUnder21, setIsUnder21] = useState(false);
  const [profileCoords, setProfileCoords] = useState<{
    latitude?: string;
    longitude?: string;
  }>({});
  const [circleFriends, setCircleFriends] = useState<any[]>([]);

  const form = useForm({
    defaultValues: {
      filters: [],
      partyMembers: [],
      paymentMode: "dutch",
      places: presetPlace ? [presetPlace] : [],
      scheduledAt: defaultScheduledAt(),
      searchArea: "",
      what: ["eat"],
    } as DateRequestPayload,
    onSubmit: async ({ value }) => {
      const response = await datingApi.createRequest({
        ...value,
        partyMembers: value.partyMembers.filter((member) =>
          Boolean(member.email?.trim() || member.phone?.trim())
        ),
        scheduledAt: new Date(value.scheduledAt).toISOString(),
      });
      setMatches(
        [...response.matches].toSorted(
          (first, second) => second.compatibility - first.compatibility
        )
      );
      setStep(2);
      toast.success("Intro videos are exchanged when a match request is sent.");
    },
  });

  const isSugar = membershipTier === "sugar";
  const canGroup = membershipTier === "mingle" || isSugar;

  // Load the profile once: area prefill, home coordinates, and the under-21
  // drink gate all come from it.
  useEffect(() => {
    const load = async () => {
      try {
        const response = await datingApi.getProfile();
        const profile = response?.profile;
        if (!profile) {
          return;
        }

        const age = profile.birthday ? getAge(profile.birthday) : null;
        const under21 = age !== null && age < 21;
        setIsUnder21(under21);
        if (under21 && form.getFieldValue("what").includes("drink")) {
          form.setFieldValue(
            "what",
            form.getFieldValue("what").filter((item) => item !== "drink")
          );
        }

        if (profile.area && !form.getFieldValue("searchArea")) {
          form.setFieldValue("searchArea", profile.area);
        }
        setProfileCoords({
          latitude: profile.latitude || undefined,
          longitude: profile.longitude || undefined,
        });

        const joinedFriends = (profile.friendInvites || []).filter(
          (invite) => invite.status === "joined"
        );
        setCircleFriends(joinedFriends);
      } catch {
        // Profile is optional for the wizard; the server enforces readiness.
      }
    };

    void load();
  }, [form]);

  const continueFromPlan = () => {
    const { values } = form.state;

    if (values.what.length === 0) {
      toast.error("Pick at least one thing to do.");
      return;
    }

    const scheduled = new Date(values.scheduledAt);
    if (Number.isNaN(scheduled.getTime()) || scheduled <= new Date()) {
      toast.error("Choose a date and time in the future.");
      return;
    }

    if (!values.searchArea.trim()) {
      toast.error("Add the area you want to date in.");
      return;
    }

    for (const member of values.partyMembers) {
      if (member.email && !emailPattern.test(member.email.trim())) {
        toast.error("One of the guest emails looks off.");
        return;
      }
    }

    setStep(1);
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <Button
          className="w-fit"
          onClick={() => history.back()}
          type="button"
          variant="ghost"
        >
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <div className="flex flex-col gap-2">
          <Badge className="w-fit" variant="secondary">
            {steps[step]}
          </Badge>
          <h1 className="text-2xl font-semibold">Plan a real date</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Book the plan like a reservation, pick three spots, then Chewbuu
            lines up video-first matches.
          </p>
        </div>
        <Progress value={((step + 1) / steps.length) * 100} />
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        {step === 0 && (
          <PlanStep
            canGroup={canGroup}
            form={form}
            isSugar={isSugar}
            isUnder21={isUnder21}
            circleFriends={circleFriends}
          />
        )}
        {step === 1 && <PlacesStep form={form} profileCoords={profileCoords} />}
        {step === 2 && (
          <MatchesStep matches={matches} onOpen={setActiveMatch} />
        )}

        {step < 2 && (
          <div className="flex flex-wrap justify-between gap-3">
            <Button
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              type="button"
              variant="outline"
            >
              Back
            </Button>
            {step === 0 && (
              <Button onClick={continueFromPlan} type="button">
                Continue to spots
                <ChevronRight data-icon="inline-end" />
              </Button>
            )}
            {step === 1 && (
              <form.Subscribe
                selector={(state: any) => ({
                  places: state.values.places,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ places, isSubmitting }: any) => (
                  <Button
                    disabled={places.length !== REQUIRED_SPOTS || isSubmitting}
                    type="submit"
                  >
                    <Sparkles data-icon="inline-start" />
                    {isSubmitting
                      ? "Finding matches..."
                      : `Find matches (${places.length}/${REQUIRED_SPOTS} spots)`}
                  </Button>
                )}
              </form.Subscribe>
            )}
          </div>
        )}
      </form>

      <MatchDialog match={activeMatch} onClose={() => setActiveMatch(null)} />
    </main>
  );
}

type WizardForm = any;

function PlanStep({
  canGroup,
  form,
  isSugar,
  isUnder21,
  circleFriends,
}: {
  canGroup: boolean;
  form: WizardForm;
  isSugar: boolean;
  isUnder21: boolean;
  circleFriends: any[];
}) {
  const availableActivities = isUnder21
    ? activityOptions.filter((option) => option.value !== "drink")
    : activityOptions;

  const [showEmailInput, setShowEmailInput] = useState(false);
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [newGuestName, setNewGuestName] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-border bg-card">
        <CardHeader className="border-b bg-muted/10 pb-4">
          <CardTitle className="text-lg font-bold">
            Customize your booking request
          </CardTitle>
          <CardDescription>
            Select your activities, date and time, and invite guests below.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {/* Section 1: What are you up for */}
          <div className="p-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              What are you up for?
            </h3>
            <form.Field name="what">
              {(field: any) => (
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Date activities"
                >
                  {availableActivities.map((option) => {
                    const selected = field.state.value.includes(option.value);
                    const Icon =
                      option.value === "eat"
                        ? Utensils
                        : option.value === "drink"
                          ? Beer
                          : Gamepad2;
                    return (
                      <button
                        aria-pressed={selected}
                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                        key={option.value}
                        onClick={() => {
                          const next = selected
                            ? field.state.value.filter(
                                (item: DateWhat) => item !== option.value
                              )
                            : [...field.state.value, option.value];
                          field.handleChange(next);
                        }}
                        type="button"
                      >
                        <Icon className="size-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </form.Field>
            {isUnder21 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Drink dates unlock when you turn 21.
              </p>
            )}
          </div>

          {/* Section 2: When & Where */}
          <div className="p-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              When & where?
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <form.Field name="scheduledAt">
                {(field: any) => {
                  const dateValue = field.state.value.slice(0, 10);
                  const timeValue = field.state.value.slice(11, 16);

                  const setDate = (date: Date | undefined) => {
                    if (!date) return;
                    field.handleChange(
                      `${toLocalInputValue(date).slice(0, 10)}T${timeValue}`
                    );
                  };
                  const setTime = (time: string) => {
                    field.handleChange(`${dateValue}T${time || "19:00"}`);
                  };

                  return (
                    <>
                      <Field>
                        <FieldLabel>Date</FieldLabel>
                        <Popover>
                          <PopoverTrigger className="flex h-9 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition hover:bg-muted/60 focus-visible:outline-1 focus-visible:outline-ring/50 data-placeholder:text-muted-foreground">
                            <CalendarIcon className="size-4 text-muted-foreground" />
                            {formatDateLabel(dateValue)}
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                              disabled={{ before: new Date() }}
                              mode="single"
                              onSelect={setDate}
                              selected={new Date(`${dateValue}T00:00:00`)}
                            />
                          </PopoverContent>
                        </Popover>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="date-time">Time</FieldLabel>
                        <Input
                          id="date-time"
                          onChange={(event) => setTime(event.target.value)}
                          type="time"
                          value={timeValue}
                        />
                      </Field>
                    </>
                  );
                }}
              </form.Field>
              <form.Field name="searchArea">
                {(field: any) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Area</FieldLabel>
                    <Input
                      id={field.name}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Nashville, TN"
                      value={field.state.value}
                    />
                  </Field>
                )}
              </form.Field>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Spots and matches stay close to your designated area.
            </p>
          </div>

          {/* Section 3: Guests */}
          <div className="p-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              Guests
            </h3>

            <form.Subscribe
              selector={(state: any) => state.values.partyMembers}
            >
              {(partyMembers: any) => {
                const guests = partyMembers || [];

                const toggleFriend = (friend: any) => {
                  if (!canGroup) return;
                  const exists = guests.some(
                    (m: any) => m.email === friend.email
                  );

                  if (exists) {
                    form.setFieldValue(
                      "partyMembers",
                      guests.filter((m: any) => m.email !== friend.email)
                    );
                  } else {
                    if (guests.length >= MAX_GUESTS) {
                      toast.error(`You can add up to ${MAX_GUESTS} guests.`);
                      return;
                    }
                    form.setFieldValue("partyMembers", [
                      ...guests,
                      {
                        email: friend.email,
                        name: friend.name,
                        phone: friend.phone,
                      },
                    ]);
                  }
                };

                const removeGuestIndex = (index: number) => {
                  form.setFieldValue(
                    "partyMembers",
                    guests.filter((_: any, idx: number) => idx !== index)
                  );
                };

                const addGuestByEmail = () => {
                  if (
                    !newGuestEmail ||
                    !emailPattern.test(newGuestEmail.trim())
                  ) {
                    toast.error("Enter a valid email address.");
                    return;
                  }
                  const exists = guests.some(
                    (m: any) => m.email === newGuestEmail.trim()
                  );
                  if (exists) {
                    toast.error("This guest is already added.");
                    return;
                  }
                  if (guests.length >= MAX_GUESTS) {
                    toast.error(`You can add up to ${MAX_GUESTS} guests.`);
                    return;
                  }
                  form.setFieldValue("partyMembers", [
                    ...guests,
                    {
                      email: newGuestEmail.trim(),
                      name: newGuestName.trim() || "Guest",
                    },
                  ]);
                  setNewGuestEmail("");
                  setNewGuestName("");
                  setShowEmailInput(false);
                };

                return (
                  <div className="flex flex-col gap-4">
                    {canGroup ? (
                      <>
                        <p className="text-xs text-muted-foreground -mt-1">
                          Bring up to three friends. They get an invite with the
                          plan details.
                        </p>

                        {circleFriends.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Choose from your Circle
                            </span>
                            <div className="flex flex-wrap gap-3">
                              {circleFriends.map((friend) => {
                                const isSelected = guests.some(
                                  (g: any) => g.email === friend.email
                                );
                                return (
                                  <button
                                    key={friend.email}
                                    onClick={() => toggleFriend(friend)}
                                    className={`relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition ${
                                      isSelected
                                        ? "border-primary bg-primary/5"
                                        : "border-transparent bg-transparent hover:bg-muted/40"
                                    }`}
                                    type="button"
                                  >
                                    <div className="relative">
                                      <Avatar className="size-10">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                          {friend.name
                                            ?.slice(0, 2)
                                            .toUpperCase() ?? "??"}
                                        </AvatarFallback>
                                      </Avatar>
                                      {isSelected && (
                                        <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground shadow-sm">
                                          <Check className="size-2.5" />
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs font-medium max-w-[80px] truncate">
                                      {friend.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No active friends in your circle yet.
                          </p>
                        )}

                        {/* Custom Guests list */}
                        {guests.some(
                          (g: any) =>
                            !circleFriends.some((f) => f.email === g.email)
                        ) && (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Other Invited Guests
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {guests.map((guest: any, idx: number) => {
                                const isCircle = circleFriends.some(
                                  (f) => f.email === guest.email
                                );
                                if (isCircle) return null;
                                return (
                                  <Badge
                                    key={guest.email}
                                    variant="secondary"
                                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                                  >
                                    <span className="max-w-[120px] truncate">
                                      {guest.name || guest.email}
                                    </span>
                                    <button
                                      aria-label="Remove guest"
                                      onClick={() => removeGuestIndex(idx)}
                                      className="ml-1 text-muted-foreground hover:text-destructive transition"
                                      type="button"
                                    >
                                      <X className="size-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {guests.length < MAX_GUESTS && (
                          <div className="mt-1">
                            {!showEmailInput ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full flex items-center gap-1 text-xs px-3 h-8"
                                onClick={() => setShowEmailInput(true)}
                                type="button"
                              >
                                <Plus className="size-3" />
                                Invite by Email
                              </Button>
                            ) : (
                              <div className="flex flex-col gap-2 p-4 rounded-2xl border bg-muted/10 max-w-sm">
                                <span className="text-xs font-semibold">
                                  Invite guest by email
                                </span>
                                <Input
                                  placeholder="friend@example.com"
                                  type="email"
                                  value={newGuestEmail}
                                  onChange={(e) =>
                                    setNewGuestEmail(e.target.value)
                                  }
                                  className="h-9 text-xs"
                                />
                                <Input
                                  placeholder="Guest Name (optional)"
                                  type="text"
                                  value={newGuestName}
                                  onChange={(e) =>
                                    setNewGuestName(e.target.value)
                                  }
                                  className="h-9 text-xs"
                                />
                                <div className="flex gap-2 justify-end mt-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-8 rounded-full"
                                    onClick={() => setShowEmailInput(false)}
                                    type="button"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="text-xs h-8 rounded-full px-4"
                                    onClick={addGuestByEmail}
                                    type="button"
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-muted/5 p-4 opacity-85">
                        <div className="flex items-center gap-3">
                          <Users className="size-5 text-muted-foreground" />
                          <div className="flex flex-col flex-1">
                            <span className="text-sm font-semibold text-muted-foreground">
                              Social members date solo
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Upgrade to Mingle to bring guests.
                            </span>
                          </div>
                        </div>
                        <Button
                          aria-label="Add guest"
                          disabled
                          variant="outline"
                          size="sm"
                          className="rounded-full flex items-center gap-1 text-xs w-fit"
                          type="button"
                        >
                          <Plus className="size-3" /> Add guest
                        </Button>
                      </div>
                    )}
                  </div>
                );
              }}
            </form.Subscribe>
          </div>

          {/* Section 4: Payment */}
          <div className="p-6 bg-muted/5">
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                4
              </span>
              Payment options
            </h3>
            <form.Field name="paymentMode">
              {(field: any) => (
                <Field>
                  <label
                    className={`flex w-fit items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-sm font-medium transition ${
                      isSugar
                        ? "cursor-pointer hover:border-primary/40 border-border"
                        : "opacity-80 border-dashed bg-muted/20"
                    }`}
                  >
                    <Checkbox
                      aria-label="Split the bill (Dutch)"
                      checked={field.state.value === "dutch"}
                      disabled={!isSugar}
                      onCheckedChange={(checked) =>
                        field.handleChange(
                          checked ? "dutch" : "requester_covers"
                        )
                      }
                    />
                    <div className="flex flex-col text-left">
                      <span>Split the bill (Dutch)</span>
                      {!isSugar && (
                        <span className="text-xs text-muted-foreground font-normal mt-0.5">
                          Go Sugar to cover the date yourself.
                        </span>
                      )}
                    </div>
                  </label>
                </Field>
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlacesStep({
  form,
  profileCoords,
}: {
  form: WizardForm;
  profileCoords: { latitude?: string; longitude?: string };
}) {
  const [placesByCategory, setPlacesByCategory] = useState<
    Partial<Record<WizardWhat, DatePlace[]>>
  >({});
  const [activeFilters, setActiveFilters] = useState<
    Partial<Record<WizardWhat, string>>
  >({});
  const [loadingCategory, setLoadingCategory] = useState<WizardWhat | null>(
    null
  );
  const [anchor, setAnchor] = useState<DatePlace | null>(null);

  const categories = (form.state.values.what as DateWhat[]).filter(
    (item): item is WizardWhat => ["eat", "drink", "play"].includes(item)
  );

  const loadPlaces = async (
    category: WizardWhat,
    filter?: string,
    anchorPlace?: DatePlace | null
  ) => {
    const { searchArea } = form.state.values;
    if (!searchArea.trim()) {
      return;
    }

    setLoadingCategory(category);
    try {
      const bias = anchorPlace ?? anchor;
      const response = await datingApi.suggestPlaces({
        area: searchArea,
        filters: filter ? [filter] : [],
        latitude: bias?.latitude
          ? String(bias.latitude)
          : profileCoords.latitude,
        longitude: bias?.longitude
          ? String(bias.longitude)
          : profileCoords.longitude,
        what: [category],
      });
      setPlacesByCategory((current) => ({
        ...current,
        [category]: response.places,
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load places."
      );
    } finally {
      setLoadingCategory(null);
    }
  };

  // Initial load: one search per selected category when the step mounts.
  useEffect(() => {
    for (const category of categories) {
      if (!placesByCategory[category]) {
        void loadPlaces(category, activeFilters[category]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectFilter = (category: WizardWhat, filter: string) => {
    const next = activeFilters[category] === filter ? undefined : filter;
    setActiveFilters((current) => {
      if (next) {
        return { ...current, [category]: next };
      }
      const { [category]: _, ...rest } = current;
      return rest;
    });
    void loadPlaces(category, next);
  };

  const togglePlace = (place: DatePlace) => {
    const selected: DatePlace[] = form.getFieldValue("places");
    const exists = selected.some((item) => item.placeId === place.placeId);

    if (exists) {
      form.setFieldValue(
        "places",
        selected.filter((item) => item.placeId !== place.placeId)
      );
      if (anchor?.placeId === place.placeId) {
        setAnchor(null);
      }
      return;
    }

    if (selected.length >= REQUIRED_SPOTS) {
      toast.error(`You can pick ${REQUIRED_SPOTS} spots. Remove one first.`);
      return;
    }

    form.setFieldValue("places", [...selected, place]);

    // Proximity chaining: the first chosen spot anchors every other
    // category so "play" stays close to dinner.
    if (!anchor && place.latitude && place.longitude) {
      setAnchor(place);
      for (const category of categories) {
        if (
          !selected.some((item: any) =>
            placesByCategory[category]?.some((p) => p.placeId === item.placeId)
          )
        ) {
          void loadPlaces(category, activeFilters[category], place);
        }
      }
    }
  };

  // Keep the submitted filters in sync with the chosen chips.
  useEffect(() => {
    form.setFieldValue("filters", Object.values(activeFilters).filter(Boolean));
  }, [activeFilters, form]);

  return (
    <form.Subscribe selector={(state: any) => state.values.places}>
      {(selectedPlaces: any) => (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your spots</CardTitle>
              <CardDescription>
                Pick exactly {REQUIRED_SPOTS}. The first spot anchors the rest
                so the night stays walkable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedPlaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing picked yet — choose from the suggestions below.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedPlaces.map((place: any) => (
                    <Badge
                      className="flex items-center gap-1 rounded-full px-3 py-1.5"
                      key={place.placeId}
                      variant="secondary"
                    >
                      <MapPin className="size-3" />
                      {place.name}
                      <button
                        aria-label={`Remove ${place.name}`}
                        className="ml-1 rounded-full hover:text-destructive"
                        onClick={() => togglePlace(place)}
                        type="button"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {categories.map((category: WizardWhat) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{category} spots</CardTitle>
                <CardDescription>
                  {anchor &&
                  !selectedPlaces.some(
                    (item: any) => item.placeId === anchor.placeId
                  )
                    ? `Near ${anchor.name}`
                    : anchor
                      ? "Pick your anchor spot or keep browsing"
                      : "Filter by vibe, then tap to select"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {CATEGORY_FILTERS[category].map((filter) => {
                    const isActive = activeFilters[category] === filter;
                    return (
                      <button
                        aria-pressed={isActive}
                        className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                        key={filter}
                        onClick={() => selectFilter(category, filter)}
                        type="button"
                      >
                        {filter}
                      </button>
                    );
                  })}
                </div>

                {loadingCategory === category ? (
                  <p className="py-6 text-sm text-muted-foreground">
                    Finding {category} spots...
                  </p>
                ) : (
                  <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scrollbar-thin">
                    {(placesByCategory[category] ?? []).map((place: any) => {
                      const selected = selectedPlaces.some(
                        (item: any) => item.placeId === place.placeId
                      );
                      const isHighRating =
                        place.rating && Number(place.rating) >= 4.7;
                      const combo = isComboPlace(place.types);
                      return (
                        <button
                          aria-pressed={selected}
                          className={`flex w-64 md:w-72 shrink-0 snap-start flex-col gap-2 rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                          key={place.placeId}
                          onClick={() => togglePlace(place)}
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            {isHighRating && (
                              <Badge className="bg-amber-500 text-white border-none flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5">
                                <Star className="size-2.5 fill-white text-white" />{" "}
                                Featured
                              </Badge>
                            )}
                            {combo && (
                              <Badge
                                variant="outline"
                                className="bg-primary/5 text-primary border-primary/20 flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5"
                              >
                                <Sparkles className="size-2.5" /> Combo
                              </Badge>
                            )}
                          </div>
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold leading-snug">
                              {place.name}
                            </span>
                            {selected ? (
                              <Check className="size-4 shrink-0 text-primary" />
                            ) : (
                              place.rating &&
                              !isHighRating && (
                                <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold">
                                  <Star className="size-3 fill-yellow-500 text-yellow-500" />
                                  {place.rating}
                                </span>
                              )
                            )}
                          </span>
                          {place.address && (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {place.address}
                            </span>
                          )}
                          <span className="mt-auto flex flex-wrap gap-1">
                            {place.types.slice(0, 3).map((type: any) => (
                              <Badge
                                className="text-[9px] font-semibold"
                                key={type}
                                variant="secondary"
                              >
                                {type}
                              </Badge>
                            ))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {!loadingCategory &&
                  (placesByCategory[category] ?? []).length === 0 && (
                    <p className="py-4 text-sm text-muted-foreground">
                      No spots found for that filter — try another vibe.
                    </p>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </form.Subscribe>
  );
}

function MatchesStep({
  matches,
  onOpen,
}: {
  matches: DateMatch[];
  onOpen: (match: DateMatch) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your matches</CardTitle>
        <CardDescription>
          Ranked from best compatibility down. Open anyone to start the
          video-first room.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {matches.map((match, index) => (
          <button
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40"
            key={match.id}
            onClick={() => onOpen(match)}
            type="button"
          >
            <Badge className="shrink-0 rounded-full" variant="outline">
              #{index + 1}
            </Badge>
            <Avatar size="lg">
              <AvatarImage alt="" src={match.profilePhotoUrl ?? ""} />
              <AvatarFallback>{match.displayName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">
                  {match.displayName}
                </span>
                <Badge variant="secondary">{match.compatibility}% match</Badge>
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {match.profileSummary}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function MatchDialog({
  match,
  onClose,
}: {
  match: DateMatch | null;
  onClose: () => void;
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={!!match}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{match?.displayName}</DialogTitle>
          <DialogDescription>{match?.compatibility}% match</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarImage alt="" src={match?.profilePhotoUrl ?? ""} />
              <AvatarFallback>{match?.displayName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">
              {match?.profileSummary}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Button>
              <Video data-icon="inline-start" />
              View intro
            </Button>
            <Link
              className={buttonVariants({ variant: "outline" })}
              params={{ matchid: match?.id ?? "" }}
              to="/matches/$matchid"
            >
              <MessageCircle data-icon="inline-start" />
              Open chat
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Intro videos are exchanged first. Each person sends three more video
            messages before text chat unlocks.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
