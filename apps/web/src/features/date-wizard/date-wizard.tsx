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
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@chewbuu/ui/components/field";
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
  Calendar as CalendarIcon,
  Check,
  ChevronRight,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Sparkles,
  Star,
  UserPlus,
  Users,
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
        const { profile } = await datingApi.getProfile();
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
                selector={(state) => [state.values.places, state.isSubmitting]}
              >
                {([selectedPlaces, isSubmitting]) => (
                  <Button
                    disabled={
                      selectedPlaces.length !== REQUIRED_SPOTS || isSubmitting
                    }
                    type="submit"
                  >
                    <Sparkles data-icon="inline-start" />
                    {isSubmitting
                      ? "Finding matches..."
                      : `Find matches (${selectedPlaces.length}/${REQUIRED_SPOTS} spots)`}
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
}: {
  canGroup: boolean;
  form: WizardForm;
  isSugar: boolean;
  isUnder21: boolean;
}) {
  const availableActivities = isUnder21
    ? activityOptions.filter((option) => option.value !== "drink")
    : activityOptions;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>What are you up for?</CardTitle>
          <CardDescription>
            Pick any combination — stack dinner, drinks, and an activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form.Field name="what">
            {(field) => (
              <div
                className="grid gap-3 sm:grid-cols-3"
                role="group"
                aria-label="Date activities"
              >
                {availableActivities.map((option) => {
                  const selected = field.state.value.includes(option.value);
                  return (
                    <button
                      aria-pressed={selected}
                      className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
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
                      <span className="flex w-full items-center justify-between font-semibold">
                        {option.label}
                        {selected && <Check className="size-4 text-primary" />}
                      </span>
                      <span className="text-xs">{option.hint}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </form.Field>
          {isUnder21 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Drink dates unlock when you turn 21.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When & where</CardTitle>
          <CardDescription>
            Chewbuu optimizes matches and spots around this window.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <form.Field name="scheduledAt">
            {(field) => {
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
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Area</FieldLabel>
                <Input
                  id={field.name}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Nashville, TN"
                  value={field.state.value}
                />
                <FieldDescription>
                  Spots and matches stay close to this area.
                </FieldDescription>
              </Field>
            )}
          </form.Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guests</CardTitle>
          <CardDescription>
            {canGroup
              ? "Bring up to three friends. They get an invite with the plan."
              : "Social members date solo. Upgrade to Mingle to bring friends."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form.Subscribe selector={(state) => state.values.partyMembers}>
            {(partyMembers) => {
              const guests = partyMembers.length;
              const setGuests = (next: number) => {
                const clamped = Math.max(0, Math.min(MAX_GUESTS, next));
                if (clamped > guests) {
                  form.setFieldValue("partyMembers", [
                    ...partyMembers,
                    { email: "" },
                  ]);
                } else if (clamped < guests) {
                  form.setFieldValue(
                    "partyMembers",
                    partyMembers.slice(0, clamped)
                  );
                }
              };

              return (
                <div className="flex items-center justify-between rounded-2xl border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <Users className="size-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {guests === 0
                          ? "Just you"
                          : `You + ${guests} guest${guests > 1 ? "s" : ""}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {canGroup ? "Group date" : "Solo date"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      aria-label="Remove guest"
                      disabled={!canGroup || guests === 0}
                      onClick={() => setGuests(guests - 1)}
                      size="icon-sm"
                      type="button"
                      variant="outline"
                    >
                      <Minus />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {guests}
                    </span>
                    <Button
                      aria-label="Add guest"
                      disabled={!canGroup || guests >= MAX_GUESTS}
                      onClick={() => setGuests(guests + 1)}
                      size="icon-sm"
                      type="button"
                      variant="outline"
                    >
                      <Plus />
                    </Button>
                  </div>
                </div>
              );
            }}
          </form.Subscribe>

          <form.Subscribe selector={(state) => state.values.partyMembers}>
            {(partyMembers) =>
              partyMembers.map((member, index) => (
                <form.Field
                  key={member.id ?? index}
                  name={`partyMembers[${index}].email`}
                >
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        <UserPlus data-icon="inline-start" />
                        Guest {index + 1} email
                      </FieldLabel>
                      <Input
                        id={field.name}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="friend@example.com"
                        type="email"
                        value={field.state.value ?? ""}
                      />
                    </Field>
                  )}
                </form.Field>
              ))
            }
          </form.Subscribe>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
          <CardDescription>
            Dutch is the default. Sugar members can cover the whole date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form.Field name="paymentMode">
            {(field) => (
              <Field>
                <label
                  className={`flex w-fit items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-sm font-medium ${
                    isSugar
                      ? "cursor-pointer hover:border-primary/40"
                      : "opacity-80"
                  }`}
                >
                  <Checkbox
                    aria-label="Split the bill (Dutch)"
                    checked={field.state.value === "dutch"}
                    disabled={!isSugar}
                    onCheckedChange={(checked) =>
                      field.handleChange(checked ? "dutch" : "requester_covers")
                    }
                  />
                  Split the bill (Dutch)
                </label>
                {!isSugar && (
                  <FieldDescription>
                    Go Sugar to cover the date yourself.
                  </FieldDescription>
                )}
              </Field>
            )}
          </form.Field>
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
          !selected.some((item) =>
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
    <form.Subscribe selector={(state) => state.values.places}>
      {(selectedPlaces) => (
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
                  {selectedPlaces.map((place) => (
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

          {categories.map((category) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{category} spots</CardTitle>
                <CardDescription>
                  {anchor &&
                  !selectedPlaces.some(
                    (item) => item.placeId === anchor.placeId
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
                  <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
                    {(placesByCategory[category] ?? []).map((place) => {
                      const selected = selectedPlaces.some(
                        (item) => item.placeId === place.placeId
                      );
                      return (
                        <button
                          aria-pressed={selected}
                          className={`flex w-56 shrink-0 snap-start flex-col gap-2 rounded-2xl border p-4 text-left transition md:w-auto ${
                            selected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                          key={place.placeId}
                          onClick={() => togglePlace(place)}
                          type="button"
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold leading-snug">
                              {place.name}
                            </span>
                            {selected ? (
                              <Check className="size-4 shrink-0 text-primary" />
                            ) : (
                              place.rating && (
                                <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold">
                                  <Star className="size-3 fill-yellow-500 text-yellow-500" />
                                  {place.rating}
                                </span>
                              )
                            )}
                          </span>
                          {place.address && (
                            <span className="text-xs text-muted-foreground">
                              {place.address}
                            </span>
                          )}
                          <span className="mt-auto flex flex-wrap gap-1">
                            {place.types.slice(0, 3).map((type) => (
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
