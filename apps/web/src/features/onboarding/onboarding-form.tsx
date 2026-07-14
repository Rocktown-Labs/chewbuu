import { uploadFile } from "@better-upload/client";
import { env } from "@chewbuu/env/web";
import { Avatar, AvatarFallback } from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
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

import { authClient } from "@/lib/auth-client";
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

const defaultValues = {
  name: "",
  email: "",
  phone: "",
  area: "",
  bio: "",
  birthday: "",
  datingModes: ["solo"],
  favoriteThings: [],
  friendInvites: [],
  height: "",
  interestDetails: {} as Record<string, string[]>,
  interestedIn: [] as string[],
  interests: [] as string[],
  media: [
    { isPrimary: true, kind: "profile_photo", sortOrder: 0, url: "" },
    { kind: "intro_video", sortOrder: 0, url: "" },
  ] as DatingMedia[],
  safetyOptIn: false,
  sex: "",
  sexuality: "",
  trustedContacts: [] as { email?: string; name: string; phone?: string }[],
  weight: "",
};

type OnboardingFormApi = any;
type UploadRoute = "introVideo" | "photo" | "profilePhoto";

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
  const { data: session } = authClient.useSession();

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

      // Update name on Better Auth if changed
      if (session?.user && value.name && value.name !== session.user.name) {
        try {
          await authClient.updateUser({
            name: value.name,
          });
        } catch (error) {
          console.error("Failed to update user profile in auth:", error);
        }
      }

      await datingApi.saveProfile({
        ...value,
        media,
      });
      toast.success("Profile ready. Go find a real date.");
      await navigate({ to: "/dashboard" });
    },
  });

  // Prefill user details from auth session
  useEffect(() => {
    if (session?.user) {
      form.setFieldValue("name", session.user.name);
      form.setFieldValue("email", session.user.email);
    }
  }, [session, form]);

  // Load existing profile if it exists
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await datingApi.getProfile();
        if (res?.profile) {
          form.setFieldValue("area", res.profile.area);
          form.setFieldValue("birthday", res.profile.birthday);
          form.setFieldValue("bio", res.profile.bio ?? "");
          form.setFieldValue("sex", res.profile.sex);
          form.setFieldValue("sexuality", res.profile.sexuality);
          form.setFieldValue("datingModes", res.profile.datingModes);
          form.setFieldValue("favoriteThings", res.profile.favoriteThings);
          form.setFieldValue("interestDetails", res.profile.interestDetails);
          form.setFieldValue("interestedIn", res.profile.interestedIn);
          form.setFieldValue("interests", res.profile.interests);
          form.setFieldValue("phone", res.profile.phone ?? "");
          if (res.profile.media && res.profile.media.length > 0) {
            form.setFieldValue("media", res.profile.media);
          }
          if (res.profile.trustedContacts) {
            form.setFieldValue("trustedContacts", res.profile.trustedContacts);
          }
          if (res.profile.friendInvites) {
            form.setFieldValue("friendInvites", res.profile.friendInvites);
          }
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };
    void loadProfile();
  }, [form]);

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

  const getAge = (birthdayString: string) => {
    const today = new Date();
    const birthDate = new Date(birthdayString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  };

  const goNext = () => {
    const { values } = form.state;

    if (step === 0) {
      if (!values.name?.trim() || values.name.trim().length < 2) {
        toast.error("Display Name must be at least 2 characters.");
        return;
      }

      if (
        !values.email?.trim() ||
        !/^\S+@\S+\.\S+$/.test(values.email.trim())
      ) {
        toast.error("A valid email address is required.");
        return;
      }

      if (!values.phone?.trim() || values.phone.trim().length < 7) {
        toast.error("A valid phone number is required.");
        return;
      }

      if (!areaPattern.test(values.area.trim())) {
        toast.error("Use a city and state format, like Little Rock, AR.");
        return;
      }

      if (!values.birthday) {
        toast.error("Birthday is required.");
        return;
      }

      if (getAge(values.birthday) < 18) {
        toast.error("You must be at least 18 years old to use Chewbuu.");
        return;
      }

      if (!values.sex || !values.sexuality) {
        toast.error("Sex and sexuality are required.");
        return;
      }

      if (!values.bio?.trim() || values.bio.trim().length < 10) {
        toast.error("Short bio is required (min 10 characters).");
        return;
      }
    }

    if (step === 1) {
      const { media } = values;
      if (!media.some((item) => item.kind === "profile_photo" && item.url)) {
        toast.error("Profile photo is required. Capture one live.");
        return;
      }
      if (!media.some((item) => item.kind === "intro_video" && item.url)) {
        toast.error("Intro video is required. Record one live.");
        return;
      }
    }

    if (step === 2) {
      const details = values.interestDetails || {};
      const categories = ["Eat", "Drink", "Play", "Move", "Watch", "Talk"];
      for (const cat of categories) {
        if (!details[cat] || details[cat].length === 0) {
          toast.error(
            `Please select or add at least one interest for "${cat}".`
          );
          return;
        }
      }

      if (!values.interestedIn || values.interestedIn.length === 0) {
        toast.error("Please select at least one option you are interested in.");
        return;
      }
    }

    if (step === 3) {
      const contacts = values.trustedContacts || [];
      if (contacts.length === 0) {
        toast.error("At least one safety contact is required.");
        return;
      }
      const [firstContact] = contacts;
      if (!firstContact.name?.trim()) {
        toast.error("Safety contact name is required.");
        return;
      }
      if (!firstContact.email?.trim() && !firstContact.phone?.trim()) {
        toast.error("Provide an email or phone for your safety contact.");
        return;
      }
    }

    setStep((current) => Math.min(steps.length - 1, current + 1));
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-8">
      <header className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
        <div className="flex flex-col gap-3">
          <Badge
            className="w-fit rounded-full px-3 py-1 font-semibold"
            variant="secondary"
          >
            Real People, Real Dates, Real Results
          </Badge>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              Set up your Chewbuu profile
            </h1>
            <p className="max-w-2xl text-muted-foreground text-sm">
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
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible pb-2 lg:pb-0">
          {steps.map((label, index) => (
            <button
              className={`flex min-w-36 items-center justify-between rounded-full border px-5 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                index === step
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-hover"
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
          <section className="min-h-[420px] rounded-3xl border bg-card p-6 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 md:p-8">
            {step === 0 && <BasicsStep form={form} />}
            {step === 1 && <MediaStep form={form} />}
            {step === 2 && <InterestsStep form={form} />}
            {step === 3 && <FriendsStep form={form} />}
            {step === 4 && <PremiumStep plans={plans} form={form} />}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              className="rounded-full px-5 h-10 font-semibold"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              type="button"
              variant="outline"
            >
              <ChevronLeft className="size-4 mr-1 inline" />
              Back
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="rounded-full px-5 h-10 font-semibold"
                onClick={() => navigate({ to: "/dashboard" })}
                type="button"
                variant="ghost"
              >
                Finish later
              </Button>
              {step < steps.length - 1 ? (
                <Button
                  className="rounded-full px-6 h-10 font-semibold"
                  onClick={goNext}
                  type="button"
                >
                  Next
                  <ChevronRight className="size-4 ml-1 inline" />
                </Button>
              ) : (
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      className="rounded-full px-6 h-10 font-semibold"
                      disabled={!canSubmit || isSubmitting}
                      type="submit"
                    >
                      <Sparkles className="size-4 mr-1.5 inline" />
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
        text="Keep it clean and real. All fields are required. Birthday will verify you are over 18 years old."
      />
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-3">
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Display Name</FieldLabel>
                <Input
                  className="rounded-full h-10 px-4 text-sm"
                  id={field.name}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="E.g. Sarah Smith"
                  value={field.state.value}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Email Address</FieldLabel>
                <Input
                  className="rounded-full h-10 px-4 text-sm bg-muted/30"
                  id={field.name}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="email@example.com"
                  value={field.state.value}
                  type="email"
                  disabled
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="phone">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Phone Number</FieldLabel>
                <Input
                  className="rounded-full h-10 px-4 text-sm"
                  id={field.name}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="(555) 555-5555"
                  value={field.state.value ?? ""}
                  type="tel"
                />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="area">
            {(field) => (
              <Field data-invalid={areaIsInvalid || undefined}>
                <FieldLabel htmlFor={field.name}>Area (City, ST)</FieldLabel>
                <Input
                  className="rounded-full h-10 px-4 text-sm"
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
                  Matches start nearby based on this city.
                </FieldDescription>
              </Field>
            )}
          </form.Field>

          <form.Field name="birthday">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Birthday</FieldLabel>
                <Input
                  className="rounded-full h-10 px-4 text-sm"
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
                className="rounded-3xl p-4 min-h-24 text-sm"
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
  const media = form.state.values.media as DatingMedia[];

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        eyebrow="Media"
        title="Live Capture. Real photos."
        text="A profile photo and intro video are required to date on Chewbuu. To prevent AI & fake profiles, profile media must be captured live."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <MediaSlot
          accept="image/*"
          form={form}
          icon={Camera}
          index={0}
          kind="profile_photo"
          label="Profile photo"
          route="profilePhoto"
        />
        <MediaSlot
          accept="video/*"
          form={form}
          icon={Video}
          index={1}
          kind="intro_video"
          label="Intro video"
          route="introVideo"
        />
      </div>

      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Real photo slots</h3>
            <p className="text-muted-foreground text-sm">
              Add up to six more photos from your camera roll to enrich your
              profile.
            </p>
          </div>
          <Button
            className="rounded-full px-4 font-semibold"
            onClick={() => {
              const photoCount = media.filter(
                (item) => item.kind === "photo"
              ).length;

              if (photoCount >= 6) {
                toast.error("Six profile photos is the max for now.");
                return;
              }

              form.setFieldValue("media", [
                ...media,
                createEmptyPhoto(photoCount + 1),
              ]);
            }}
            type="button"
            variant="outline"
          >
            <Plus className="size-4 mr-1 inline" />
            Add photo
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {media
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.kind === "photo")
            .map(({ index }) => (
              <MediaSlot
                accept="image/*"
                form={form}
                icon={ImagePlus}
                index={index}
                key={index}
                kind="photo"
                label={`Extra Photo ${index - 1}`}
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

  return (
    <form.Subscribe
      selector={(state) => [
        state.values.interestDetails,
        state.values.interestedIn,
      ]}
    >
      {([interestDetails, interestedIn]) => {
        const details = (interestDetails || {}) as Record<string, string[]>;
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
              text="Chewbuu matches you based on your activities and topics. Please select or enter at least one interest for each category below."
            />

            <ToggleGroup
              className="flex flex-wrap justify-start gap-2"
              onValueChange={(value) => value && setActiveCategory(value)}
              type="single"
              value={activeCategory}
            >
              {interestCategories.map((category) => {
                const count = details[category.label]?.length ?? 0;
                return (
                  <ToggleGroupItem
                    className="rounded-full px-4 py-2 border border-border text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all duration-200"
                    key={category.label}
                    value={category.label}
                    type="button"
                  >
                    {category.label} {count > 0 && `(${count})`}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>

            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-1">
                <h3 className="font-semibold text-lg text-foreground">
                  {active.label}
                </h3>
                <p className="text-muted-foreground text-sm">{active.prompt}</p>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {active.suggestions.map((suggestion) => (
                  <Button
                    className="rounded-full px-4 py-1.5 text-sm transition-all duration-200"
                    key={suggestion}
                    onClick={() => toggleValue(suggestion)}
                    type="button"
                    variant={
                      selected.includes(suggestion) ? "default" : "outline"
                    }
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  className="rounded-full h-10 px-4 text-sm"
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
                  placeholder={`Add your own custom ${active.label.toLowerCase()}...`}
                  value={customInterest}
                />
                <Button
                  className="rounded-full px-5 h-10 bg-primary text-primary-foreground font-semibold"
                  onClick={() => {
                    if (customInterest.trim()) {
                      toggleValue(customInterest.trim());
                      setCustomInterest("");
                    }
                  }}
                  type="button"
                >
                  <Plus className="size-4 mr-1 inline" />
                  Add
                </Button>
              </div>
            </div>

            <form.Field name="interestedIn">
              {(field) => (
                <Field>
                  <FieldLabel>Interested in (Select Multiple)</FieldLabel>
                  <FieldDescription>
                    Select the people and social setups you want Chewbuu to
                    consider.
                  </FieldDescription>
                  <ToggleGroup
                    className="flex flex-wrap justify-start gap-2"
                    onValueChange={(value) => field.handleChange(value)}
                    type="multiple"
                    value={field.state.value || []}
                  >
                    {["women", "men", "couples", "friends", "groups"].map(
                      (value) => (
                        <ToggleGroupItem
                          className="rounded-full px-4 py-2 border border-border text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all duration-200"
                          key={value}
                          value={value}
                          type="button"
                        >
                          {formatValue(value)}
                        </ToggleGroupItem>
                      )
                    )}
                  </ToggleGroup>
                </Field>
              )}
            </form.Field>
          </div>
        );
      }}
    </form.Subscribe>
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
        text="Invite friends to hang out on the platform, and add safety contacts who will receive automatic check-ins when you are on dates."
      />
      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <HeartHandshake
            aria-hidden="true"
            className="mt-1 size-5 text-primary"
          />
          <div>
            <h3 className="font-semibold text-base">
              Invite friends for circles and group dates
            </h3>
            <p className="text-muted-foreground text-sm">
              Mingle and Sugar members can go on dates with up to three friends.
              Invite them now.
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

      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <ShieldCheck
            aria-hidden="true"
            className="mt-1 size-5 text-primary"
          />
          <div>
            <h3 className="font-semibold text-base">
              Safety contacts (At least 1 required)
            </h3>
            <p className="text-muted-foreground text-sm">
              Add up to two trusted contacts. We will notify them with location
              and date details for your peace of mind.
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

function PremiumStep({
  plans,
  form,
}: {
  plans: MembershipPlan[];
  form: OnboardingFormApi;
}) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly"
  );

  const getPriceLabel = (plan: MembershipPlan) => {
    if (plan.tier === "social") return "Free Forever";
    const baseCents = plan.monthlyPriceCents;
    if (billingPeriod === "monthly") {
      return `$${Math.round(baseCents / 100)}/mo`;
    }
    const annualPrice = Math.round((baseCents * 10) / 100);
    return `$${annualPrice}/yr`;
  };

  const planDetails = {
    social: {
      tagline: "Solo dating, standard speed",
      highlight: false,
      ctaLabel: "Keep Free Social",
      features: [
        "Create solo date requests (1 person)",
        "Max 2 booked dates per day",
        "100% verified real video intros",
        "Standard matchmaking pool",
      ],
    },
    mingle: {
      tagline: "Group hangs and circles",
      highlight: true,
      badge: "Best Social Value",
      ctaLabel: "Get Mingle",
      features: [
        "Go on group dates (up to 4 people)",
        "Invite friends & build social circles",
        "Match with other groups/parties",
        "Book up to 8 dates per day",
        "Unlock circle matching signals",
      ],
    },
    sugar: {
      tagline: "Cover dates and direct match",
      highlight: false,
      badge: "VIP Premium",
      ctaLabel: "Get Sugar",
      features: [
        "Send direct requests to specific people",
        "Pay & cover date costs (Dutch optional)",
        "Bypass public search/fan-out pool",
        "Book up to 24 dates per day",
        "Includes all Mingle features",
      ],
    },
  };

  const handleUpgrade = async (plan: MembershipPlan) => {
    if (plan.tier === "social") {
      void form.handleSubmit();
      return;
    }

    const priceId =
      billingPeriod === "monthly"
        ? plan.stripePriceId
        : plan.annualStripePriceId;
    if (!priceId) {
      toast.error("Stripe integration is not synced for this tier yet.");
      return;
    }

    try {
      toast.loading("Redirecting to checkout...", { id: "checkout" });
      const res = await authClient.stripe.upgrade({
        priceId,
        callbackURL: `${window.location.origin}/dashboard`,
      });
      if (res.error) {
        toast.error(res.error.message, { id: "checkout" });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout",
        { id: "checkout" }
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <StepIntro
          eyebrow="Upgrade Chewbuu"
          title="Pick your dating mode."
          text="Social is completely free. Upgrade to Mingle to bring friends and circles. Go Sugar to cover dates and send direct matchmaking requests."
        />

        {/* Billing Period Toggle */}
        <div className="flex items-center self-center md:self-end bg-muted p-1 rounded-full border border-border shadow-inner mt-2 md:mt-0">
          <button
            type="button"
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              billingPeriod === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setBillingPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              billingPeriod === "annual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setBillingPeriod("annual")}
          >
            Annual
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[9px] font-bold">
              Save ~17%
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mt-4">
        {plans.map((plan) => {
          const detail = planDetails[plan.tier];
          const isHighlighted = detail.highlight;

          return (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-3xl border-2 p-6 transition-all duration-300 ${
                isHighlighted
                  ? "border-primary bg-primary/5 shadow-lg scale-102 lg:-translate-y-1"
                  : "border-border bg-card hover:border-border-hover hover:shadow-md"
              }`}
            >
              {isHighlighted && detail.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow">
                  {detail.badge}
                </span>
              )}

              <div className="flex items-start justify-between gap-4 mt-2">
                <div>
                  <h3 className="font-bold text-2xl text-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-muted-foreground text-sm font-medium mt-0.5">
                    {detail.tagline}
                  </p>
                </div>
              </div>

              <div className="my-5 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">
                  {getPriceLabel(plan)}
                </span>
              </div>

              <p className="text-muted-foreground text-xs/relaxed mb-5">
                {plan.description}
              </p>

              <hr className="border-border mb-5" />

              <ul className="flex flex-1 flex-col gap-3 text-xs/relaxed font-medium text-foreground/80 mb-6">
                {detail.features.map((feature) => (
                  <li className="flex items-start gap-2.5" key={feature}>
                    <Check className="text-primary size-4 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleUpgrade(plan)}
                className={`w-full rounded-full py-2.5 font-bold transition-all duration-200 ${
                  isHighlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                }`}
                type="button"
              >
                {detail.ctaLabel}
              </Button>
            </div>
          );
        })}
      </div>

      <Link
        className="w-fit text-sm underline underline-offset-4 mt-2 self-center text-muted-foreground hover:text-foreground"
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
            <SelectTrigger
              className="w-full rounded-full h-10 px-4"
              id={field.name}
            >
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
  form,
  icon: Icon,
  index,
  kind,
  label,
  route,
}: {
  accept: string;
  form: OnboardingFormApi;
  icon: typeof Camera;
  index: number;
  kind: DatingMedia["kind"];
  label: string;
  route: UploadRoute;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);

  const { values } = form.state;
  const media = values.media[index] as DatingMedia | undefined;
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
      toast.success(`${label} captured successfully.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-44 flex-col justify-between rounded-2xl border bg-background p-5 shadow-sm hover:shadow-md transition duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3 className="font-semibold text-sm">{label}</h3>
            <p className="text-muted-foreground text-xs">
              {value
                ? "Ready for matching"
                : kind === "photo"
                  ? "Upload details photo"
                  : "Live capture required"}
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
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      {value && (
        <div className="mt-3 relative aspect-video w-full rounded-2xl overflow-hidden border border-border bg-black">
          {kind === "intro_video" ? (
            <video src={value} controls className="w-full h-full object-cover">
              <track kind="captions" />
            </video>
          ) : (
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {kind === "photo" ? (
          <>
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
            <Button
              className="rounded-full font-semibold"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              type="button"
              variant="outline"
              size="sm"
            >
              <Upload className="size-3.5 mr-1 inline" />
              {isUploading ? "Uploading" : "Upload Photo"}
            </Button>
          </>
        ) : (
          <Button
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/95 font-semibold"
            disabled={isUploading}
            onClick={() => setIsCaptureOpen(true)}
            type="button"
            size="sm"
          >
            <Camera className="size-3.5 mr-1 inline" />
            {kind === "intro_video" ? "Record Live" : "Camera Shutter"}
          </Button>
        )}
      </div>

      <LiveCaptureDialog
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onCapture={uploadSelectedFile}
        mode={kind === "intro_video" ? "video" : "photo"}
      />
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
    <div className="flex flex-col gap-4">
      {items.map((_, index) => (
        <div
          className="relative grid gap-4 p-4 rounded-2xl border border-border/80 bg-background/50 hover:border-border transition-all duration-200 items-end sm:grid-cols-[1fr_1fr_auto]"
          key={index}
        >
          {showName && (
            <form.Field name={`${path}[${index}].name`}>
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground ml-1">
                    Contact Name
                  </span>
                  <Input
                    className="rounded-full h-10 px-4 text-sm"
                    aria-label="Contact name"
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="E.g. Sarah Smith"
                    value={field.state.value ?? ""}
                  />
                </div>
              )}
            </form.Field>
          )}
          <form.Field name={`${path}[${index}].email`}>
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground ml-1">
                  Email Address
                </span>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="absolute top-3 left-3.5 size-4 text-muted-foreground/75"
                  />
                  <Input
                    aria-label="Email"
                    className="pl-10 rounded-full h-10 text-sm"
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="email@example.com"
                    value={field.state.value ?? ""}
                  />
                </div>
              </div>
            )}
          </form.Field>
          <form.Field name={`${path}[${index}].phone`}>
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground ml-1">
                  Phone Number
                </span>
                <div className="relative">
                  <Phone
                    aria-hidden="true"
                    className="absolute top-3 left-3.5 size-4 text-muted-foreground/75"
                  />
                  <Input
                    aria-label="Phone"
                    className="pl-10 rounded-full h-10 text-sm"
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Phone"
                    value={field.state.value ?? ""}
                  />
                </div>
              </div>
            )}
          </form.Field>
          <div className="flex items-center justify-end sm:pb-0.5">
            <Button
              aria-label="Remove person"
              className="rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all duration-200"
              onClick={() => {
                form.setFieldValue(
                  path,
                  items.filter((_, itemIndex) => itemIndex !== index)
                );
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        className="w-fit rounded-full px-5 border-dashed border-2 hover:border-primary transition-all duration-200 font-semibold"
        disabled={items.length >= maxItems}
        onClick={() => form.setFieldValue(path, [...items, nextItem])}
        type="button"
        variant="outline"
      >
        <Plus className="size-4 mr-1 inline animate-pulse" />
        {addLabel}
      </Button>
      {items.length === 0 && (
        <p className="text-muted-foreground text-sm italic ml-1">
          No one added yet.
        </p>
      )}
    </div>
  );
}

interface LiveCaptureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  mode: "photo" | "video";
}

function LiveCaptureDialog({
  isOpen,
  onClose,
  onCapture,
  mode,
}: LiveCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(mode === "video" ? 15 : 0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        setError(null);
        setRecordedUrl(null);
        setRecordedChunks([]);
        setIsRecording(false);
        setCountdown(mode === "video" ? 15 : 0);

        const constraints = {
          video: { facingMode: mode === "photo" ? "environment" : "user" },
          audio: mode === "video",
        };
        const mediaStream =
          await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (cameraError) {
        console.error("Camera access error:", cameraError);
        setError(
          "Camera access is required. Please check your browser permissions."
        );
      }
    };

    void startCamera();

    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, mode]);

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "profile_photo.jpg", {
              type: "image/jpeg",
            });
            onCapture(file);
            onClose();
          }
        },
        "image/jpeg",
        0.9
      );
    }
  };

  const handleStartRecording = () => {
    if (!streamRef.current) return;
    setRecordedChunks([]);
    setRecordedUrl(null);
    setIsRecording(true);
    setCountdown(15);

    const options = { mimeType: "video/webm;codecs=vp9" };
    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(streamRef.current, options);
    } catch {
      mediaRecorder = new MediaRecorder(streamRef.current);
    }

    mediaRecorderRef.current = mediaRecorder;
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      setRecordedChunks(chunks);
    };

    mediaRecorder.start();

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleStopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleUseVideo = () => {
    if (recordedChunks.length === 0) return;
    const mimeType = mediaRecorderRef.current?.mimeType || "video/webm";
    const blob = new Blob(recordedChunks, { type: mimeType });
    const file = new File([blob], "intro_video.webm", { type: mimeType });
    onCapture(file);
    onClose();
  };

  const handleRetake = () => {
    setRecordedUrl(null);
    setRecordedChunks([]);
    setCountdown(15);
    setIsRecording(false);
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 border-0 shadow-2xl bg-card overflow-hidden">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-lg font-bold text-foreground">
            {mode === "photo"
              ? "Capture Live Photo"
              : "Record Live Intro Video"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {mode === "photo"
              ? "We verify real profiles. Snap a live photo of yourself."
              : "Introduce yourself in a short, live 15-second video."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-4 aspect-square md:aspect-video w-full rounded-2xl bg-black overflow-hidden border border-border flex items-center justify-center">
          {error ? (
            <div className="p-4 text-center text-sm text-destructive font-medium">
              {error}
            </div>
          ) : recordedUrl ? (
            <video
              src={recordedUrl}
              controls
              className="w-full h-full object-cover"
            >
              <track kind="captions" />
            </video>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            >
              <track kind="captions" />
            </video>
          )}

          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              <span>0:{countdown.toString().padStart(2, "0")}</span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-3">
          {recordedUrl ? (
            <>
              <Button
                onClick={handleRetake}
                variant="outline"
                className="rounded-full"
              >
                Retake
              </Button>
              <Button
                onClick={handleUseVideo}
                className="rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
              >
                Use Video
              </Button>
            </>
          ) : mode === "photo" ? (
            <Button
              onClick={handleCapturePhoto}
              disabled={!!error || !streamRef.current}
              className="rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6"
            >
              Capture
            </Button>
          ) : isRecording ? (
            <Button
              onClick={handleStopRecording}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold px-6"
            >
              Stop Recording
            </Button>
          ) : (
            <Button
              onClick={handleStartRecording}
              disabled={!!error || !streamRef.current}
              className="rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6"
            >
              Start Recording
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
