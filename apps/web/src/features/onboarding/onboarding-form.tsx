import { uploadFile } from "@better-upload/client";
import { env } from "@chewbuu/env/web";
import { Avatar, AvatarFallback } from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@chewbuu/ui/components/field";
import { Input } from "@chewbuu/ui/components/input";
import { Progress } from "@chewbuu/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@chewbuu/ui/components/select";
import { Textarea } from "@chewbuu/ui/components/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@chewbuu/ui/components/toggle-group";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  ImagePlus,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  datingApi,
  getServerUrl,
  pricingApi,
  type DatingMedia,
  type DatingProfilePayload,
  type MembershipPlan,
} from "@/lib/dating-api";

const steps = ["Basics", "Media", "Interests", "Friends", "Premium"] as const;
const areaPattern = /^[a-zA-Z .'-]+,\s?[A-Z]{2}$/;
const sexOptions = [
  "female",
  "male",
  "nonbinary",
  "trans woman",
  "trans man",
  "prefer not to say",
];
const sexualityOptions = [
  "straight",
  "gay",
  "lesbian",
  "bisexual",
  "pansexual",
  "queer",
  "questioning",
  "prefer not to say",
];

const interestCategories = [
  {
    label: "Eat",
    prompt: "What foods, cuisines, or cravings make you say yes?",
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
    prompt: "What should Chewbuu know about your drink lane?",
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
    prompt: "What does a fun date look like when food is not the whole plan?",
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
    prompt: "How do you like to be active?",
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
    prompt: "What would you happily watch with someone?",
    suggestions: [
      "Football",
      "Basketball",
      "Movies",
      "Anime",
      "Reality TV",
      "Documentaries",
      "UFC",
    ],
  },
  {
    label: "Talk",
    prompt: "What topics usually pull you into a good conversation?",
    suggestions: [
      "Books",
      "Travel",
      "Music",
      "Business",
      "Faith",
      "Family",
      "Art",
    ],
  },
] as const;

const defaultPlans: MembershipPlan[] = [
  {
    active: true,
    annualPriceCents: 0,
    annualStripePriceId: "",
    cta: "Keep Social",
    description: "Solo dates, Dutch by default, and two booked dates per day.",
    features: ["Solo dating", "2 booked dates daily", "Video-first matches"],
    monthlyPriceCents: 0,
    name: "Social",
    sortOrder: 0,
    stats: ["Free", "Solo only", "2/day"],
    tier: "social",
  },
  {
    active: true,
    annualPriceCents: 19_000,
    annualStripePriceId: "",
    cta: "Unlock Mingle",
    description: "Bring friends, build circles, and match with other parties.",
    features: ["Group dates up to 4", "Friend invites", "Circle matching"],
    monthlyPriceCents: 1900,
    name: "Mingle",
    sortOrder: 1,
    stats: ["Groups", "Circles", "Priority"],
    tier: "mingle",
  },
  {
    active: true,
    annualPriceCents: 39_000,
    annualStripePriceId: "",
    cta: "Go Sugar",
    description:
      "Cover dates, request premium matches, and unlock every social mode.",
    features: [
      "Requester-covers dates",
      "Premium match pool",
      "All Mingle features",
    ],
    monthlyPriceCents: 3900,
    name: "Sugar",
    sortOrder: 2,
    stats: ["Highest", "Cover dates", "All modes"],
    tier: "sugar",
  },
];

const defaultValues: DatingProfilePayload = {
  area: "",
  bio: "",
  birthday: "",
  datingModes: ["solo"],
  favoriteThings: [],
  friendInvites: [],
  height: "",
  interestDetails: {},
  interestedIn: [],
  interests: [],
  media: [
    { isPrimary: true, kind: "profile_photo", sortOrder: 0, url: "" },
    { kind: "intro_video", sortOrder: 0, url: "" },
  ],
  safetyOptIn: false,
  sex: "",
  sexuality: "",
  trustedContacts: [],
  weight: "",
};

type OnboardingFormApi = any;
type UploadRoute = "introVideo" | "photo" | "profilePhoto";

const toDollars = (cents: number) =>
  cents === 0 ? "Free" : `$${Math.round(cents / 100)}/mo`;

const formatValue = (value: string) =>
  value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const fileUrlFromUpload = (result: Awaited<ReturnType<typeof uploadFile>>) => {
  const baseUrl =
    typeof result.metadata.publicBaseUrl === "string"
      ? result.metadata.publicBaseUrl.replace(/\/$/, "")
      : "";
  const { key } = result.file.objectInfo;

  return baseUrl ? `${baseUrl}/${key}` : `r2://${key}`;
};

const createEmptyPhoto = (sortOrder: number): DatingMedia => ({
  kind: "photo",
  sortOrder,
  url: "",
});

export function OnboardingForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<MembershipPlan[]>(defaultPlans);
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const media = value.media.filter((item) => item.url);

      if (!media.some((item) => item.kind === "profile_photo")) {
        toast.error("Add a profile photo before dating.");
        setStep(1);
        return;
      }

      if (!media.some((item) => item.kind === "intro_video")) {
        toast.error("Chewbuu is video-first. Add your intro video.");
        setStep(1);
        return;
      }

      await datingApi.saveProfile({ ...value, media });
      toast.success("Profile ready. Go find a real date.");
      await navigate({ to: "/dashboard" });
    },
  });

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const { plans: nextPlans } = await pricingApi.getPlans();
        setPlans(nextPlans);
      } catch {
        setPlans(defaultPlans);
      }
    };

    void loadPlans();
  }, []);

  const progress = ((step + 1) / steps.length) * 100;

  const goNext = () => {
    const { values } = form.state;

    if (step === 0) {
      if (!areaPattern.test(values.area.trim())) {
        toast.error("Use a city and state format, like Little Rock, AR.");
        return;
      }

      if (!values.birthday || !values.sex || !values.sexuality) {
        toast.error("Birthday, sex, and sexuality are required.");
        return;
      }
    }

    setStep((current) => Math.min(steps.length - 1, current + 1));
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-8">
      <header className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
        <div className="flex flex-col gap-3">
          <Badge className="w-fit rounded-full" variant="secondary">
            Real People, Real Dates, Real Results
          </Badge>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              Set up your Chewbuu profile
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Video first, real photos, richer interests, and the friends who
              should know you are going out. Required media unlocks dating;
              everything else makes matching sharper.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{steps[step]}</span>
            <span className="text-muted-foreground">
              {step + 1} of {steps.length}
            </span>
          </div>
          <Progress
            className="[&_[data-slot=progress-track]]:rounded-full [&_[data-slot=progress-indicator]]:rounded-full"
            value={progress}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {steps.map((label, index) => (
            <button
              className={`flex min-w-36 items-center justify-between rounded-full border px-4 py-3 text-left text-sm transition ${
                index === step
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
              key={label}
              onClick={() => setStep(index)}
              type="button"
            >
              <span>{label}</span>
              {index < step && <Check aria-hidden="true" className="size-4" />}
            </button>
          ))}
        </nav>

        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <section className="min-h-[420px] rounded-lg border bg-card p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 md:p-6">
            {step === 0 && <BasicsStep form={form} />}
            {step === 1 && <MediaStep form={form} />}
            {step === 2 && <InterestsStep form={form} />}
            {step === 3 && <FriendsStep form={form} />}
            {step === 4 && <PremiumStep plans={plans} />}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              className="rounded-full"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              type="button"
              variant="outline"
            >
              <ChevronLeft data-icon="inline-start" />
              Back
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="rounded-full"
                onClick={() => navigate({ to: "/dashboard" })}
                type="button"
                variant="ghost"
              >
                Finish later
              </Button>
              {step < steps.length - 1 ? (
                <Button className="rounded-full" onClick={goNext} type="button">
                  Next
                  <ChevronRight data-icon="inline-end" />
                </Button>
              ) : (
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      className="rounded-full"
                      disabled={!canSubmit || isSubmitting}
                      type="submit"
                    >
                      <Sparkles data-icon="inline-start" />
                      Finish onboarding
                    </Button>
                  )}
                </form.Subscribe>
              )}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

function BasicsStep({ form }: { form: OnboardingFormApi }) {
  const [area, setArea] = useState(form.state.values.area);
  const areaIsInvalid = area.length > 0 && !areaPattern.test(area.trim());

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        eyebrow="Basics"
        title="Tell Chewbuu who is going out."
        text="Keep it clean and real. Area is validated as city and state for now; Google Places autocomplete can replace this later."
      />
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="area">
            {(field) => (
              <Field data-invalid={areaIsInvalid || undefined}>
                <FieldLabel htmlFor={field.name}>Area</FieldLabel>
                <Input
                  aria-invalid={areaIsInvalid}
                  id={field.name}
                  onChange={(event) => {
                    setArea(event.target.value);
                    field.handleChange(event.target.value);
                  }}
                  placeholder="Little Rock, AR"
                  value={field.state.value}
                />
                <FieldDescription>
                  Use city and state so places and matches start nearby.
                </FieldDescription>
              </Field>
            )}
          </form.Field>
          <form.Field name="birthday">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Birthday</FieldLabel>
                <Input
                  id={field.name}
                  onChange={(event) => field.handleChange(event.target.value)}
                  type="date"
                  value={field.state.value}
                />
              </Field>
            )}
          </form.Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            form={form}
            label="Sex"
            name="sex"
            options={sexOptions}
            placeholder="Select sex"
          />
          <SelectField
            form={form}
            label="Sexuality"
            name="sexuality"
            options={sexualityOptions}
            placeholder="Select sexuality"
          />
        </div>
        <form.Field name="bio">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Short bio</FieldLabel>
              <Textarea
                id={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="What should someone know before saying yes?"
                value={field.state.value}
              />
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </div>
  );
}

function MediaStep({ form }: { form: OnboardingFormApi }) {
  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        eyebrow="Media"
        title="Video first. Real photos second."
        text="A profile photo and intro video are required before you can date. Photos can come from camera roll or camera capture, and each slot can be removed."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <MediaSlot
          accept="image/*"
          capture="environment"
          form={form}
          icon={Camera}
          index={0}
          kind="profile_photo"
          label="Profile photo"
          route="profilePhoto"
        />
        <MediaSlot
          accept="video/*"
          capture="user"
          form={form}
          icon={Video}
          index={1}
          kind="intro_video"
          label="Intro video"
          route="introVideo"
        />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-medium">Real photo slots</h3>
            <p className="text-muted-foreground text-sm">
              Add up to six more photos. Each one can be replaced or removed.
            </p>
          </div>
          <Button
            className="rounded-full"
            onClick={() => {
              const media = form.state.values.media as DatingMedia[];
              const photoCount = media.filter(
                (item) => item.kind === "photo"
              ).length;

              if (photoCount >= 6) {
                toast.error("Six profile photos is the max for now.");
                return;
              }

              form.setFieldValue(
                `media[${media.length}]`,
                createEmptyPhoto(photoCount + 1)
              );
            }}
            type="button"
            variant="outline"
          >
            <Plus data-icon="inline-start" />
            Add photo
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(form.state.values.media as DatingMedia[])
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.kind === "photo")
            .map(({ index }) => (
              <MediaSlot
                accept="image/*"
                capture="environment"
                form={form}
                icon={ImagePlus}
                index={index}
                key={index}
                kind="photo"
                label={`Photo ${index - 1}`}
                route="photo"
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function InterestsStep({ form }: { form: OnboardingFormApi }) {
  const [activeCategory, setActiveCategory] = useState(
    interestCategories[0].label
  );
  const [customInterest, setCustomInterest] = useState("");
  const active = useMemo(
    () =>
      interestCategories.find(
        (category) => category.label === activeCategory
      ) ?? interestCategories[0],
    [activeCategory]
  );
  const details = form.state.values.interestDetails as Record<string, string[]>;
  const selected = details[active.label] ?? [];

  const toggleValue = (value: string) => {
    const nextValues = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    const nextDetails = { ...details, [active.label]: nextValues };
    const allValues = Object.values(nextDetails).flat();

    form.setFieldValue("interestDetails", nextDetails);
    form.setFieldValue("favoriteThings", allValues.slice(0, 20));
    form.setFieldValue(
      "interests",
      Object.keys(nextDetails).filter((key) => nextDetails[key]?.length)
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        eyebrow="Interests"
        title="Give matching more signal."
        text="Chewbuu embeds this profile later, so broad categories plus specific favorites matter. Pick a lane, add the details, then move to the next."
      />
      <ToggleGroup
        className="flex flex-wrap justify-start gap-2"
        onValueChange={(value) => value && setActiveCategory(value)}
        type="single"
        value={activeCategory}
      >
        {interestCategories.map((category) => (
          <ToggleGroupItem
            className="rounded-full"
            key={category.label}
            value={category.label}
          >
            {category.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="rounded-lg border bg-background p-4">
        <div className="mb-4 flex flex-col gap-1">
          <h3 className="font-medium">{active.label}</h3>
          <p className="text-muted-foreground text-sm">{active.prompt}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {active.suggestions.map((suggestion) => (
            <Button
              className="rounded-full"
              key={suggestion}
              onClick={() => toggleValue(suggestion)}
              type="button"
              variant={selected.includes(suggestion) ? "default" : "outline"}
            >
              {suggestion}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Input
            aria-label={`Add ${active.label} interest`}
            onChange={(event) => setCustomInterest(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (customInterest.trim()) {
                  toggleValue(customInterest.trim());
                  setCustomInterest("");
                }
              }
            }}
            placeholder={`Add your own ${active.label.toLowerCase()} signal`}
            value={customInterest}
          />
          <Button
            className="rounded-full"
            onClick={() => {
              if (customInterest.trim()) {
                toggleValue(customInterest.trim());
                setCustomInterest("");
              }
            }}
            type="button"
          >
            <Plus data-icon="inline-start" />
            Add
          </Button>
        </div>
      </div>
      <form.Field name="interestedIn">
        {(field) => (
          <Field>
            <FieldLabel>Interested in</FieldLabel>
            <FieldDescription>
              Select the people and social setups you want Chewbuu to consider.
            </FieldDescription>
            <ToggleGroup
              className="flex flex-wrap justify-start gap-2"
              onValueChange={(value) => field.handleChange(value)}
              type="multiple"
              value={field.state.value}
            >
              {["women", "men", "couples", "friends", "groups"].map((value) => (
                <ToggleGroupItem
                  className="rounded-full"
                  key={value}
                  value={value}
                >
                  {formatValue(value)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        )}
      </form.Field>
    </div>
  );
}

function FriendsStep({ form }: { form: OnboardingFormApi }) {
  const friends = form.state.values.friendInvites as {
    email?: string;
    phone?: string;
  }[];
  const contacts = form.state.values.trustedContacts as {
    email?: string;
    name: string;
    phone?: string;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        eyebrow="Friends & Safety"
        title="Chewbuu is better with friends."
        text="Invite people into the platform and add up to two safety contacts who can later receive date notifications."
      />
      <div className="rounded-lg border bg-background p-4">
        <div className="mb-4 flex items-start gap-3">
          <HeartHandshake aria-hidden="true" className="mt-1 text-primary" />
          <div>
            <h3 className="font-medium">
              Invite friends for circles and group dates
            </h3>
            <p className="text-muted-foreground text-sm">
              Mingle and Sugar members can bring up to three people. Social
              users can still invite friends before upgrading.
            </p>
          </div>
        </div>
        <DynamicPeopleList
          addLabel="Add friend"
          form={form}
          items={friends}
          path="friendInvites"
          showName={false}
        />
      </div>
      <div className="rounded-lg border bg-background p-4">
        <div className="mb-4 flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-1 text-primary" />
          <div>
            <h3 className="font-medium">Safety contacts</h3>
            <p className="text-muted-foreground text-sm">
              Add one or two people. Email, phone, or both can be used for
              notifications when the safety feature goes live.
            </p>
          </div>
        </div>
        <DynamicPeopleList
          addLabel="Add safety contact"
          form={form}
          items={contacts}
          maxItems={2}
          path="trustedContacts"
          showName
        />
      </div>
    </div>
  );
}

function PremiumStep({ plans }: { plans: MembershipPlan[] }) {
  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        eyebrow="Premium"
        title="Pick the dating mode that matches your social life."
        text="Social stays free. Mingle makes groups and circles useful. Sugar unlocks covered dates and the highest-intent modes."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <button
            className="flex h-full flex-col rounded-lg border bg-background p-5 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            key={plan.tier}
            type="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-xl">{plan.name}</h3>
                <p className="text-muted-foreground">
                  {toDollars(plan.monthlyPriceCents)}
                </p>
              </div>
              <Avatar className="size-11">
                <AvatarFallback>{plan.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
            </div>
            <p className="mt-4 text-muted-foreground text-sm">
              {plan.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.stats.map((stat) => (
                <Badge className="rounded-full" key={stat} variant="secondary">
                  {stat}
                </Badge>
              ))}
            </div>
            <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm">
              {plan.features.map((feature) => (
                <li className="flex items-center gap-2" key={feature}>
                  <Check aria-hidden="true" className="text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <span className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm">
              {plan.cta}
            </span>
          </button>
        ))}
      </div>
      <Link
        className="w-fit text-sm underline underline-offset-4"
        to="/dashboard"
      >
        I will upgrade later
      </Link>
    </div>
  );
}

function StepIntro({
  eyebrow,
  text,
  title,
}: {
  eyebrow: string;
  text: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">
        {eyebrow}
      </p>
      <h2 className="font-semibold text-2xl">{title}</h2>
      <p className="max-w-2xl text-muted-foreground text-sm">{text}</p>
    </div>
  );
}

function SelectField({
  form,
  label,
  name,
  options,
  placeholder,
}: {
  form: OnboardingFormApi;
  label: string;
  name: "sex" | "sexuality";
  options: readonly string[];
  placeholder: string;
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <Field>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Select
            name={field.name}
            onValueChange={(value) => field.handleChange(String(value))}
            value={field.state.value || undefined}
          >
            <SelectTrigger className="w-full rounded-full" id={field.name}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {formatValue(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </form.Field>
  );
}

function MediaSlot({
  accept,
  capture,
  form,
  icon: Icon,
  index,
  kind,
  label,
  route,
}: {
  accept: string;
  capture: "environment" | "user";
  form: OnboardingFormApi;
  icon: typeof Camera;
  index: number;
  kind: DatingMedia["kind"];
  label: string;
  route: UploadRoute;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const media = form.state.values.media[index] as DatingMedia | undefined;
  const value = media?.url ?? "";

  const uploadSelectedFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFile({
        api: new URL("/upload", getServerUrl(env.VITE_SERVER_URL)).toString(),
        credentials: "include",
        file,
        metadata: { slot: kind },
        route,
      });
      const url = fileUrlFromUpload(result);

      form.setFieldValue(`media[${index}]`, {
        isPrimary: kind === "profile_photo",
        kind,
        sortOrder: kind === "photo" ? Math.max(0, index - 1) : 0,
        url,
      });
      toast.success(`${label} uploaded.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-44 flex-col justify-between rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-medium">{label}</h3>
            <p className="text-muted-foreground text-sm">
              {value ? "Ready for matching" : "Upload or capture"}
            </p>
          </div>
        </div>
        {value && (
          <Button
            aria-label={`Remove ${label}`}
            className="rounded-full"
            onClick={() =>
              form.setFieldValue(`media[${index}]`, {
                isPrimary: kind === "profile_photo",
                kind,
                sortOrder: kind === "photo" ? Math.max(0, index - 1) : 0,
                url: "",
              })
            }
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {value && (
        <p className="mt-4 truncate rounded-full bg-muted px-3 py-2 text-muted-foreground text-xs">
          {value}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          accept={accept}
          className="sr-only"
          onChange={(event) => {
            void uploadSelectedFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <input
          accept={accept}
          capture={capture}
          className="sr-only"
          onChange={(event) => {
            void uploadSelectedFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
          ref={cameraRef}
          type="file"
        />
        <Button
          className="rounded-full"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
          variant="outline"
        >
          <Upload data-icon="inline-start" />
          {isUploading ? "Uploading" : "Upload"}
        </Button>
        <Button
          className="rounded-full"
          disabled={isUploading}
          onClick={() => cameraRef.current?.click()}
          type="button"
          variant="outline"
        >
          <Camera data-icon="inline-start" />
          {accept.startsWith("video") ? "Record" : "Camera"}
        </Button>
      </div>
    </div>
  );
}

function DynamicPeopleList({
  addLabel,
  form,
  items,
  maxItems = 6,
  path,
  showName,
}: {
  addLabel: string;
  form: OnboardingFormApi;
  items: { email?: string; name?: string; phone?: string }[];
  maxItems?: number;
  path: "friendInvites" | "trustedContacts";
  showName: boolean;
}) {
  const nextItem = showName
    ? { email: "", name: "", phone: "" }
    : { email: "", phone: "" };

  return (
    <div className="flex flex-col gap-3">
      {items.map((_, index) => (
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" key={index}>
          {showName && (
            <form.Field name={`${path}[${index}].name`}>
              {(field) => (
                <Input
                  aria-label="Contact name"
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Name"
                  value={field.state.value ?? ""}
                />
              )}
            </form.Field>
          )}
          <form.Field name={`${path}[${index}].email`}>
            {(field) => (
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="absolute top-2.5 left-3 text-muted-foreground"
                />
                <Input
                  aria-label="Email"
                  className="pl-9"
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="email@example.com"
                  value={field.state.value ?? ""}
                />
              </div>
            )}
          </form.Field>
          <form.Field name={`${path}[${index}].phone`}>
            {(field) => (
              <div className="relative">
                <Phone
                  aria-hidden="true"
                  className="absolute top-2.5 left-3 text-muted-foreground"
                />
                <Input
                  aria-label="Phone"
                  className="pl-9"
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Phone"
                  value={field.state.value ?? ""}
                />
              </div>
            )}
          </form.Field>
          <Button
            aria-label="Remove person"
            className="rounded-full"
            onClick={() => {
              form.setFieldValue(
                path,
                items.filter((_, itemIndex) => itemIndex !== index)
              );
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        className="w-fit rounded-full"
        disabled={items.length >= maxItems}
        onClick={() => form.setFieldValue(path, [...items, nextItem])}
        type="button"
        variant="outline"
      >
        <Plus data-icon="inline-start" />
        {addLabel}
      </Button>
      {items.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No one added yet. Add an email, phone, or both.
        </p>
      )}
    </div>
  );
}
