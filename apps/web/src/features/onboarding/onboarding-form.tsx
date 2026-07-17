import { uploadFile } from "@better-upload/client";
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
  Heart,
  HeartHandshake,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  datingApi,
  getApiUrl,
  pricingApi,
  type DatePlace,
  type DateWhat,
  type DatingMedia,
  type DatingProfilePayload,
  type MembershipPlan,
} from "@/lib/dating-api";

import { useOnboardingStore } from "./onboarding-store";

const steps = [
  "Basics",
  "Media",
  "Interests",
  "Values",
  "Friends",
  "Premium",
] as const;
const areaPattern = /^[a-zA-Z .'-]+,\s?[A-Z]{2}$/;
const sexOptions = [
  "Female",
  "Male",
  "Nonbinary",
  "Trans Woman",
  "Trans Man",
  "Prefer Not to Say",
];
const sexualityOptions = [
  "Straight",
  "Gay",
  "Lesbian",
  "Bisexual",
  "Pansexual",
  "Queer",
  "Questioning",
  "Prefer Not to Say",
];
const raceOptions = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Hispanic or Latino",
  "Native Hawaiian or Other Pacific Islander",
  "White",
  "Multiracial",
  "Prefer not to say",
];
const maritalStatusOptions = [
  "Single",
  "Dating",
  "Engaged",
  "Married",
  "Separated",
  "Divorced",
  "Widowed",
  "Prefer Not to Say",
];
const spouseInviteStatuses = new Set(["Dating", "Engaged", "Married"]);
const politicsOptions = [
  "Liberal",
  "Moderate",
  "Conservative",
  "Independent",
  "Apolitical",
  "Other",
  "Prefer Not to Say",
];
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
];
const kidsOptions = ["Have Kids", "Do Not Have Kids", "Prefer Not to Say"];
const wantsKidsOptions = [
  "Want Kids",
  "Open to Kids",
  "Do Not Want Kids",
  "Not Sure",
  "Prefer Not to Say",
];
const lookingForOptions = [
  "A relationship",
  "Intentional dating",
  "Casual dates",
  "New friends",
  "Double dates",
  "Group hangs",
  "Not sure yet",
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
    prompt: "What genres, shows, and movies are your favorites?",
    suggestions: [
      "Comedy",
      "Drama",
      "Thriller",
      "Action",
      "Sci-Fi",
      "Horror",
      "Documentary",
      "Anime",
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
      "Tech",
      "Philosophy",
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
  occupation: "",
  race: "",
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
  kids: "",
  lookingFor: [] as string[],
  media: [
    { isPrimary: true, kind: "profile_photo", sortOrder: 0, url: "" },
    { kind: "intro_video", sortOrder: 0, url: "" },
  ] as DatingMedia[],
  politics: "",
  religion: "",
  safetyOptIn: false,
  sex: "",
  sexuality: "",
  trustedContacts: [] as { email?: string; name: string; phone?: string }[],
  weight: "",
  wantsKids: "",
  latitude: "",
  longitude: "",
  maritalStatus: "",
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

const formatPhoneNumber = (value: string) => {
  const hasPlus = value.startsWith("+");
  const cleaned = value.replaceAll(/\D/g, "");

  if (cleaned.length === 0) return hasPlus ? "+" : "";

  if (hasPlus) {
    if (cleaned.length <= 1) {
      return `+${cleaned}`;
    }
    if (cleaned.length <= 4) {
      return `+${cleaned.slice(0, 1)} (${cleaned.slice(1)})`;
    }
    if (cleaned.length <= 7) {
      return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
    }
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
  }

  if (cleaned.length <= 3) {
    return cleaned;
  }
  if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  }
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

export function OnboardingForm() {
  const navigate = useNavigate();
  const {
    profile: persistedProfile,
    step: persistedStep,
    setStep: setPersistedStep,
    setProfile: setPersistedProfile,
    clear: clearPersistedOnboarding,
  } = useOnboardingStore();

  const [step, setStep] = useState(persistedStep);
  const [plans, setPlans] = useState<MembershipPlan[]>(defaultPlans);
  const { data: session } = authClient.useSession();

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const media = value.media.filter((item) => item.url);

      if (!media.some((item) => item.kind === "profile_photo")) {
        toast.error("Add a profile photo before dating.");
        updateStep(1);
        return;
      }

      if (!media.some((item) => item.kind === "intro_video")) {
        toast.error("Chewbuu is video-first. Add your intro video.");
        updateStep(1);
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
      clearPersistedOnboarding();
      toast.success("Profile ready. Go find a real date.");
      await navigate({ to: "/dashboard" });
    },
  });

  // Sync form values to Zustand store as the user edits
  useEffect(() => {
    const unsub = form.store.subscribe((state) => {
      setPersistedProfile(state.values);
    });
    return () => {
      if (typeof unsub === "function") {
        unsub();
      } else if (unsub && typeof (unsub as any).unsubscribe === "function") {
        (unsub as any).unsubscribe();
      }
    };
  }, [form.store, setPersistedProfile]);

  // Load existing profile from API on mount and merge with local persisted values
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await datingApi.getProfile();
        // Merge order: 1. default values, 2. API profile, 3. local persisted profile edits
        const merged = {
          ...defaultValues,
          ...res?.profile,
          ...useOnboardingStore.getState().profile,
        };

        if (session?.user) {
          form.setFieldValue("name", merged.name || session.user.name || "");
          form.setFieldValue("email", merged.email || session.user.email || "");
        } else {
          form.setFieldValue("name", merged.name || "");
          form.setFieldValue("email", merged.email || "");
        }
        form.setFieldValue("phone", merged.phone || "");
        form.setFieldValue("birthday", merged.birthday || "");
        form.setFieldValue("area", merged.area || "");
        form.setFieldValue("latitude", merged.latitude || "");
        form.setFieldValue("longitude", merged.longitude || "");
        form.setFieldValue("maritalStatus", merged.maritalStatus || "");
        form.setFieldValue("sex", merged.sex || "");
        form.setFieldValue("sexuality", merged.sexuality || "");
        form.setFieldValue("race", merged.race || "");
        form.setFieldValue("occupation", merged.occupation || "");
        form.setFieldValue("bio", merged.bio || "");
        form.setFieldValue("datingModes", merged.datingModes || []);
        form.setFieldValue("interests", merged.interests || []);
        form.setFieldValue("interestDetails", merged.interestDetails || {});
        form.setFieldValue("favoriteThings", merged.favoriteThings || []);
        form.setFieldValue("politics", merged.politics || "");
        form.setFieldValue("religion", merged.religion || "");
        form.setFieldValue("kids", merged.kids || "");
        form.setFieldValue("wantsKids", merged.wantsKids || "");
        form.setFieldValue("lookingFor", merged.lookingFor || []);
        form.setFieldValue("friendInvites", merged.friendInvites || []);
        form.setFieldValue("trustedContacts", merged.trustedContacts || []);
        form.setFieldValue("safetyOptIn", !!merged.safetyOptIn);
        form.setFieldValue("media", merged.media || defaultValues.media);
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };
    void loadProfile();
  }, [form, session]);

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

  const updateStep = (newStep: number) => {
    setStep(newStep);
    setPersistedStep(newStep);
  };

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

      const cleanedPhone = (values.phone || "").replaceAll(/\D/g, "");
      if (cleanedPhone.length < 10) {
        toast.error("A valid 10-digit phone number is required.");
        return;
      }

      if (!values.occupation?.trim()) {
        toast.error("Occupation / Career is required.");
        return;
      }

      if (!values.race) {
        toast.error("Race is required (stored privately).");
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

      if (!values.maritalStatus) {
        toast.error("Relationship status is required.");
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
      if (!values.politics) {
        toast.error("Politics is required. You can choose Prefer Not to Say.");
        return;
      }
      if (!values.religion) {
        toast.error("Religion is required. You can choose Prefer Not to Say.");
        return;
      }
      if (!values.kids || !values.wantsKids) {
        toast.error("Kids and future kids preferences are required.");
        return;
      }
      if (!values.lookingFor || values.lookingFor.length === 0) {
        toast.error("Select at least one thing you are looking for.");
        return;
      }
    }

    if (step === 4) {
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

    updateStep(Math.min(steps.length - 1, step + 1));
  };

  const handleFinishLater = async () => {
    const { values } = form.state;
    const media = values.media.filter((item) => item.url);

    try {
      toast.loading("Saving progress...", { id: "finish-later" });
      await datingApi.saveProfile({
        ...values,
        media,
      });
      toast.success("Progress saved.", { id: "finish-later" });
    } catch {
      toast.dismiss("finish-later");
    }
    await navigate({ to: "/dashboard" });
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
              onClick={() => updateStep(index)}
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
            {step === 3 && <ValuesStep form={form} />}
            {step === 4 && <FriendsStep form={form} />}
            {step === 5 && (
              <PremiumStep
                plans={plans}
                form={form}
                onFinishLater={handleFinishLater}
              />
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              className="rounded-full px-5 h-10 font-semibold"
              disabled={step === 0}
              onClick={() => updateStep(Math.max(0, step - 1))}
              type="button"
              variant="outline"
            >
              <ChevronLeft className="size-4 mr-1 inline" />
              Back
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="rounded-full px-5 h-10 font-semibold"
                onClick={handleFinishLater}
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

  const getPosition = () => {
    // eslint-disable-next-line promise/avoid-new
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  };

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    toast.loading("Requesting location access...", { id: "geo" });
    try {
      const position = await getPosition();
      const { latitude, longitude } = position.coords;
      form.setFieldValue("latitude", String(latitude));
      form.setFieldValue("longitude", String(longitude));

      let resolvedArea = "Searcy, AR";
      if (Math.abs(latitude - 36.16) < 1 && Math.abs(longitude + 86.78) < 1) {
        resolvedArea = "Nashville, TN";
      } else if (
        Math.abs(latitude - 34.74) < 1 &&
        Math.abs(longitude + 92.28) < 1
      ) {
        resolvedArea = "Little Rock, AR";
      } else if (
        Math.abs(latitude - 35.24) < 1 &&
        Math.abs(longitude + 91.73) < 1
      ) {
        resolvedArea = "Searcy, AR";
      } else {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          if (data?.address) {
            const city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.suburb ||
              "";
            const state = data.address.state
              ? data.address.state_code || data.address.state
              : "";
            let stateCode = String(state).trim();
            if (stateCode.length > 2) {
              stateCode = stateCode.slice(0, 2).toUpperCase();
            }
            if (city && stateCode) {
              resolvedArea = `${city}, ${stateCode}`;
            }
          }
        } catch (error) {
          console.error("OSM geocode error:", error);
        }
      }

      form.setFieldValue("area", resolvedArea);
      setArea(resolvedArea);
      toast.success(`Location set to ${resolvedArea}`, { id: "geo" });
    } catch (error) {
      console.error("Geolocation error:", error);
      toast.error("Location permission denied or unavailable.", { id: "geo" });
    }
  };

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
                  onChange={(event) => {
                    const formatted = formatPhoneNumber(event.target.value);
                    field.handleChange(formatted);
                  }}
                  placeholder="(555) 555-5555"
                  value={field.state.value ?? ""}
                  type="tel"
                />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="occupation">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  Occupation / Career
                </FieldLabel>
                <Input
                  className="rounded-full h-10 px-4 text-sm"
                  id={field.name}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="E.g. Software Engineer, Designer, Teacher"
                  value={field.state.value ?? ""}
                />
              </Field>
            )}
          </form.Field>
          <SelectField
            form={form}
            label="Race / Ethnicity"
            name="race"
            options={raceOptions}
            placeholder="Select race/ethnicity (private)"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="area">
            {(field) => (
              <Field data-invalid={areaIsInvalid || undefined}>
                <FieldLabel htmlFor={field.name}>Area (City, ST)</FieldLabel>
                <div className="relative flex-1">
                  <Input
                    className="rounded-full h-10 pl-4 pr-10 text-sm w-full"
                    aria-invalid={areaIsInvalid}
                    id={field.name}
                    onChange={(event) => {
                      setArea(event.target.value);
                      field.handleChange(event.target.value);
                    }}
                    placeholder="Little Rock, AR"
                    value={field.state.value}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handleDetectLocation();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition bg-transparent border-0 p-1 cursor-pointer flex items-center justify-center"
                    title="Detect location"
                  >
                    <MapPin className="size-4" />
                  </button>
                </div>
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

        <SelectField
          form={form}
          label="Relationship Status"
          name="maritalStatus"
          options={maritalStatusOptions}
          placeholder="Select relationship status"
        />

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
  return (
    <form.Subscribe selector={(state) => [state.values.media]}>
      {([mediaValue]) => {
        const media = (mediaValue || []) as DatingMedia[];

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
                    Add up to six more photos from your camera roll to enrich
                    your profile.
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
      }}
    </form.Subscribe>
  );
}

function InterestsStep({ form }: { form: OnboardingFormApi }) {
  return (
    <form.Subscribe
      selector={(state) => [
        state.values.interestDetails,
        state.values.interestedIn,
        state.values.area,
      ]}
    >
      {([interestDetails, interestedIn, areaValue]) => (
        <InterestsStepContent
          form={form}
          interestDetails={interestDetails || {}}
          interestedIn={interestedIn || []}
          area={areaValue || "Nashville, TN"}
        />
      )}
    </form.Subscribe>
  );
}

interface InterestsStepContentProps {
  form: OnboardingFormApi;
  interestDetails: Record<string, string[]>;
  interestedIn: string[];
  area: string;
}

function InterestsStepContent({
  form,
  interestDetails,
  interestedIn,
  area,
}: InterestsStepContentProps) {
  const [activeCategory, setActiveCategory] = useState(
    interestCategories[0].label
  );
  const [customInterest, setCustomInterest] = useState("");
  const [places, setPlaces] = useState<DatePlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placeSearch, setPlaceSearch] = useState("");

  const active = useMemo(
    () =>
      interestCategories.find(
        (category) => category.label === activeCategory
      ) ?? interestCategories[0],
    [activeCategory]
  );

  const selected = interestDetails[active.label] ?? [];
  const selectedString = selected.join(",");

  const toggleValue = (value: string) => {
    const nextValues = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    const nextDetails = { ...interestDetails, [active.label]: nextValues };
    const allValues = Object.values(nextDetails).flat();

    form.setFieldValue("interestDetails", nextDetails);
    form.setFieldValue("favoriteThings", allValues.slice(0, 20));
    form.setFieldValue(
      "interests",
      Object.keys(nextDetails).filter((key) => nextDetails[key]?.length)
    );
  };

  useEffect(() => {
    if (!["Eat", "Drink", "Play", "Move"].includes(active.label)) {
      setPlaces([]);
      return;
    }

    const fetchPlaces = async () => {
      setIsLoadingPlaces(true);
      try {
        const filters = placeSearch.trim()
          ? [placeSearch.trim()]
          : selected.length > 0
            ? selected
            : [active.label];
        const res = await datingApi.suggestPlaces({
          area,
          filters,
          latitude: (form.state.values.latitude as string) || undefined,
          longitude: (form.state.values.longitude as string) || undefined,
          what: [active.label.toLowerCase() as DateWhat],
        });
        setPlaces(res.places || []);
      } catch (error) {
        console.error("Failed to suggest places:", error);
      } finally {
        setIsLoadingPlaces(false);
      }
    };

    const timer = setTimeout(() => {
      void fetchPlaces();
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.label, selectedString, placeSearch, area]);

  const selectedPlacesKey = `${active.label}_places`;
  const activeFavoritePlaces = interestDetails[selectedPlacesKey] || [];

  const togglePlaceFavorite = (placeName: string) => {
    const nextPlaces = activeFavoritePlaces.includes(placeName)
      ? activeFavoritePlaces.filter((p) => p !== placeName)
      : [...activeFavoritePlaces, placeName];

    form.setFieldValue(`interestDetails.${selectedPlacesKey}`, nextPlaces);
  };

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        eyebrow="Interests"
        title="Give matching more signal."
        text="Chewbuu matches you based on your activities and topics. Please select or enter at least one interest for each category below."
      />

      {/* Category Navigation Tabs */}
      <div className="flex flex-wrap justify-start gap-2 border-b border-border pb-4">
        {interestCategories.map((category) => {
          const count = interestDetails[category.label]?.length ?? 0;
          const isActive = activeCategory === category.label;
          return (
            <button
              key={category.label}
              onClick={() => {
                setActiveCategory(category.label);
                setPlaceSearch("");
              }}
              className={`rounded-full px-4 py-2 border text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-hover"
              }`}
              type="button"
            >
              {category.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border bg-background p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-lg text-foreground">
            {active.label}
          </h3>
          <p className="text-muted-foreground text-sm">{active.prompt}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {active.suggestions.map((suggestion) => (
            <Button
              className="rounded-full px-4 py-1.5 text-sm transition-all duration-200"
              key={suggestion}
              onClick={() => toggleValue(suggestion)}
              type="button"
              variant={selected.includes(suggestion) ? "default" : "outline"}
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

        {/* Show Local Place Suggestions for Eat, Drink, Play, Move */}
        {["Eat", "Drink", "Play", "Move"].includes(active.label) && (
          <div className="mt-4 border-t border-border pt-4">
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" />
              Select your favorite local {active.label.toLowerCase()} spots in{" "}
              {area}:
            </h4>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder={`Search local ${active.label.toLowerCase()} spots (e.g. Starbucks, KJ's Market)...`}
                value={placeSearch}
                onChange={(e) => setPlaceSearch(e.target.value)}
                className="rounded-full h-10 px-4 bg-background border border-border text-sm"
              />
            </div>
            {isLoadingPlaces ? (
              <p className="text-xs text-muted-foreground animate-pulse">
                Searching near you...
              </p>
            ) : places.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No spots found. Try searching above!
              </p>
            ) : (
              <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                {places.map((place) => {
                  const isFav = activeFavoritePlaces.includes(place.name);
                  return (
                    <button
                      key={place.placeId}
                      type="button"
                      onClick={() => togglePlaceFavorite(place.name)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs transition duration-250 ${
                        isFav
                          ? "border-primary bg-primary/5 text-primary-foreground font-medium"
                          : "border-border bg-card text-foreground hover:border-border-hover"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-foreground">
                          {place.name}
                        </p>
                        {place.address && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {place.address}
                          </p>
                        )}
                      </div>
                      <Heart
                        className={`size-4 ml-2 shrink-0 ${isFav ? "fill-primary text-primary" : "text-muted-foreground"}`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Extra input forms for Watch category */}
        {active.label === "Watch" && (
          <div className="mt-4 border-t border-border pt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground ml-1">
                Favorite Shows & Movies
              </span>
              <InputList
                form={form}
                fieldKey="Watch_shows"
                placeholder="Add show or movie (e.g. Breaking Bad)"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground ml-1">
                Favorite Actors & Actresses
              </span>
              <InputList
                form={form}
                fieldKey="Watch_actors"
                placeholder="Add actor/actress (e.g. Pedro Pascal)"
              />
            </div>
          </div>
        )}

        {/* Extra input forms for Talk category */}
        {active.label === "Talk" && (
          <div className="mt-4 border-t border-border pt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground ml-1">
                Other Topics or Hobbies
              </span>
              <InputList
                form={form}
                fieldKey="Talk_topics"
                placeholder="Add topic (e.g. Hiking, Cooking, Web3)"
              />
            </div>
          </div>
        )}
      </div>

      <form.Field name="interestedIn">
        {(field) => (
          <Field>
            <FieldLabel>Interested in (Select Multiple)</FieldLabel>
            <FieldDescription>
              Select the people and social setups you want Chewbuu to consider.
            </FieldDescription>
            <ToggleGroup
              className="flex flex-wrap justify-start gap-2"
              onValueChange={(value) => field.handleChange(value)}
              type="multiple"
              value={interestedIn}
            >
              {["women", "men", "couples", "friends", "groups"].map((value) => (
                <ToggleGroupItem
                  className="rounded-full px-4 py-2 border border-border text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all duration-200"
                  key={value}
                  value={value}
                  type="button"
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

function InputList({
  form,
  fieldKey,
  placeholder,
}: {
  form: OnboardingFormApi;
  fieldKey: string;
  placeholder: string;
}) {
  const [val, setVal] = useState("");
  const currentList = form.state.values.interestDetails[fieldKey] || [];

  const handleAdd = () => {
    if (!val.trim()) return;
    if (currentList.includes(val.trim())) return;

    form.setFieldValue(`interestDetails.${fieldKey}`, [
      ...currentList,
      val.trim(),
    ]);
    setVal("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          className="rounded-full h-10 px-4 text-xs"
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          onClick={handleAdd}
          className="rounded-full h-10 px-4 text-xs font-semibold"
        >
          Add
        </Button>
      </div>
      {currentList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {currentList.map((item: string) => (
            <Badge
              key={item}
              variant="secondary"
              className="pl-3 pr-1.5 py-1 text-xs rounded-full flex items-center gap-1 font-semibold border"
            >
              <span>{item}</span>
              <button
                type="button"
                className="hover:bg-muted p-0.5 rounded-full shrink-0"
                onClick={() => {
                  form.setFieldValue(
                    `interestDetails.${fieldKey}`,
                    currentList.filter((x: string) => x !== item)
                  );
                }}
              >
                <Trash2 className="size-3 text-muted-foreground" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function ValuesStep({ form }: { form: OnboardingFormApi }) {
  return (
    <form.Subscribe selector={(state) => [state.values.lookingFor]}>
      {([lookingForValue]) => {
        const lookingFor = (lookingForValue || []) as string[];

        return (
          <div className="flex flex-col gap-6">
            <StepIntro
              eyebrow="Values"
              title="Make the matching signal honest."
              text="These answers help Chewbuu avoid awkward mismatches and suggest people who want a similar kind of date life."
            />
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  form={form}
                  label="Politics"
                  name="politics"
                  options={politicsOptions}
                  placeholder="Select politics"
                />
                <SelectField
                  form={form}
                  label="Religion"
                  name="religion"
                  options={religionOptions}
                  placeholder="Select religion"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  form={form}
                  label="Kids"
                  name="kids"
                  options={kidsOptions}
                  placeholder="Select kids status"
                />
                <SelectField
                  form={form}
                  label="Future kids"
                  name="wantsKids"
                  options={wantsKidsOptions}
                  placeholder="Select future kids preference"
                />
              </div>

              <form.Field name="lookingFor">
                {(field) => (
                  <Field>
                    <FieldLabel>What are you looking for?</FieldLabel>
                    <FieldDescription>
                      Pick every mode that feels true right now.
                    </FieldDescription>
                    <ToggleGroup
                      className="flex flex-wrap justify-start gap-2"
                      onValueChange={(value) => field.handleChange(value)}
                      type="multiple"
                      value={lookingFor}
                    >
                      {lookingForOptions.map((value) => (
                        <ToggleGroupItem
                          className="rounded-full px-4 py-2 border border-border text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all duration-200"
                          key={value}
                          value={value}
                          type="button"
                        >
                          {value}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          </div>
        );
      }}
    </form.Subscribe>
  );
}

function FriendsStep({ form }: { form: OnboardingFormApi }) {
  return (
    <form.Subscribe
      selector={(state) => [
        state.values.friendInvites,
        state.values.maritalStatus,
        state.values.trustedContacts,
      ]}
    >
      {([friendInvites, maritalStatus, trustedContacts]) => {
        const invites = (friendInvites || []) as {
          email?: string;
          name?: string;
          phone?: string;
          relationship?: "friend" | "spouse";
        }[];
        const friends = invites.filter(
          (invite) => invite.relationship !== "spouse"
        );
        const spouseInvite = invites.find(
          (invite) => invite.relationship === "spouse"
        );
        const canInviteSpouse = spouseInviteStatuses.has(maritalStatus || "");
        const contacts = (trustedContacts || []) as {
          email?: string;
          name: string;
          phone?: string;
        }[];

        return (
          <div className="flex flex-col gap-6">
            <StepIntro
              eyebrow="Friends & Safety"
              title="Chewbuu is better with friends."
              text="Invite your spouse or partner when that applies, bring friends into circles, and add safety contacts who can receive date check-ins."
            />
            {canInviteSpouse && (
              <div className="rounded-2xl border bg-background p-5 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <Heart
                    aria-hidden="true"
                    className="mt-1 size-5 text-primary"
                  />
                  <div>
                    <h3 className="font-semibold text-base">
                      Invite your spouse or partner
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Send an invite so they can join Chewbuu with you, verify
                      their profile, and be part of date planning when needed.
                    </p>
                  </div>
                </div>
                <DynamicPeopleList
                  addLabel="Add spouse or partner"
                  form={form}
                  items={spouseInvite ? [spouseInvite] : []}
                  maxItems={1}
                  path="friendInvites"
                  relationship="spouse"
                  showName
                />
              </div>
            )}
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
                    Mingle and Sugar members can go on dates with up to three
                    friends. Invite them now.
                  </p>
                </div>
              </div>
              <DynamicPeopleList
                addLabel="Add friend"
                form={form}
                items={friends}
                path="friendInvites"
                relationship="friend"
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
                    Add up to two trusted contacts. We will notify them with
                    location and date details for your peace of mind.
                  </p>
                </div>
              </div>
              <DynamicPeopleList
                addLabel="Add safety contact"
                form={form}
                items={contacts}
                maxItems={2}
                path="trustedContacts"
                relationship="friend"
                showName
              />
            </div>
          </div>
        );
      }}
    </form.Subscribe>
  );
}

function PremiumStep({
  plans,
  form,
  onFinishLater,
}: {
  plans: MembershipPlan[];
  form: OnboardingFormApi;
  onFinishLater: () => void;
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
      badge: "Best Value",
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

      <button
        onClick={onFinishLater}
        className="w-fit text-sm underline underline-offset-4 mt-4 self-center text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0"
        type="button"
      >
        I will upgrade later
      </button>
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
  name:
    | "kids"
    | "maritalStatus"
    | "politics"
    | "race"
    | "religion"
    | "sex"
    | "sexuality"
    | "wantsKids";
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
            onValueChange={(value) => {
              const nextValue = String(value);
              field.handleChange(nextValue);

              if (
                name === "maritalStatus" &&
                !spouseInviteStatuses.has(nextValue)
              ) {
                const invites = form.state.values.friendInvites || [];
                form.setFieldValue(
                  "friendInvites",
                  invites.filter(
                    (invite: { relationship?: string }) =>
                      invite.relationship !== "spouse"
                  )
                );
              }
            }}
            value={field.state.value || undefined}
          >
            <SelectTrigger
              className="w-full rounded-full h-10 px-4 bg-background border border-border text-sm flex items-center justify-between"
              id={field.name}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border rounded-2xl shadow-xl z-50 p-1 min-w-[200px] w-[--anchor-width] max-h-60 overflow-y-auto">
              {options.map((option) => (
                <SelectItem
                  key={option}
                  value={option}
                  className="rounded-xl py-2 px-3 focus:bg-primary/10 focus:text-primary text-xs cursor-pointer"
                >
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
        api: getApiUrl("/upload"),
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
      toast.success(`${label} uploaded successfully.`);
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
        displayName={form.state.values.name || ""}
      />
    </div>
  );
}

function InputWithLocalState({
  value,
  onChange,
  className,
  ...props
}: {
  value: string;
  onChange: (val: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  const [localVal, setLocalVal] = useState(value);
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setLocalVal(value);
    }
  }, [value]);

  return (
    <Input
      {...props}
      className={className}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onFocus={() => {
        isFocused.current = true;
      }}
      onBlur={() => {
        isFocused.current = false;
        onChange(localVal);
      }}
    />
  );
}

function DynamicPeopleList({
  addLabel,
  form,
  items,
  maxItems = 6,
  path,
  relationship,
  showName,
}: {
  addLabel: string;
  form: OnboardingFormApi;
  items: {
    email?: string;
    name?: string;
    phone?: string;
    relationship?: "friend" | "spouse";
  }[];
  maxItems?: number;
  path: "friendInvites" | "trustedContacts";
  relationship: "friend" | "spouse";
  showName: boolean;
}) {
  const allItems = (form.state.values[path] || []) as typeof items;
  const nextItem = showName
    ? {
        email: "",
        name: "",
        phone: "",
        ...(path === "friendInvites" ? { relationship } : {}),
      }
    : {
        email: "",
        phone: "",
        ...(path === "friendInvites" ? { relationship } : {}),
      };

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, displayIndex) => {
        const index = allItems.indexOf(item);

        return (
          <div
            className="relative flex flex-col md:flex-row md:items-end gap-4 p-5 rounded-2xl border border-border/80 bg-background/50 hover:border-border transition-all duration-200"
            key={`${relationship}-${displayIndex}`}
          >
            <div className="flex-1 grid gap-4 grid-cols-1 md:grid-cols-3">
              {showName && (
                <form.Field name={`${path}[${index}].name`}>
                  {(field) => (
                    <div className="flex flex-col gap-1.5 col-span-1">
                      <span className="text-xs font-semibold text-muted-foreground ml-1">
                        Contact Name
                      </span>
                      <InputWithLocalState
                        className="rounded-full h-10 px-4 text-sm"
                        aria-label="Contact name"
                        onChange={(value) => field.handleChange(value)}
                        placeholder="E.g. Sarah Smith"
                        value={field.state.value ?? ""}
                      />
                    </div>
                  )}
                </form.Field>
              )}

              <form.Field name={`${path}[${index}].email`}>
                {(field) => (
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <span className="text-xs font-semibold text-muted-foreground ml-1">
                      Email Address
                    </span>
                    <div className="relative">
                      <Mail
                        aria-hidden="true"
                        className="absolute top-3 left-3.5 size-4 text-muted-foreground/75"
                      />
                      <InputWithLocalState
                        aria-label="Email"
                        className="pl-10 rounded-full h-10 text-sm"
                        onChange={(value) => field.handleChange(value)}
                        placeholder="email@example.com"
                        value={field.state.value ?? ""}
                      />
                    </div>
                  </div>
                )}
              </form.Field>

              <form.Field name={`${path}[${index}].phone`}>
                {(field) => (
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <span className="text-xs font-semibold text-muted-foreground ml-1">
                      Phone Number
                    </span>
                    <div className="relative">
                      <Phone
                        aria-hidden="true"
                        className="absolute top-3 left-3.5 size-4 text-muted-foreground/75"
                      />
                      <InputWithLocalState
                        aria-label="Phone"
                        className="pl-10 rounded-full h-10 text-sm"
                        onChange={(value) => {
                          const formatted = formatPhoneNumber(value);
                          field.handleChange(formatted);
                        }}
                        placeholder="Phone"
                        value={field.state.value ?? ""}
                      />
                    </div>
                  </div>
                )}
              </form.Field>
            </div>

            <div className="flex items-center justify-end md:pb-1 md:self-end self-end">
              <Button
                aria-label="Remove person"
                className="rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all duration-200"
                onClick={() => {
                  form.setFieldValue(
                    path,
                    allItems.filter((_, itemIndex) => itemIndex !== index)
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
        );
      })}
      <Button
        className="w-fit rounded-full px-5 border-dashed border-2 hover:border-primary transition-all duration-200 font-semibold"
        disabled={items.length >= maxItems}
        onClick={() => form.setFieldValue(path, [...allItems, nextItem])}
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
  displayName?: string;
}

function LiveCaptureDialog({
  isOpen,
  onClose,
  onCapture,
  mode,
  displayName = "",
}: LiveCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [countdown, setCountdown] = useState(mode === "video" ? 60 : 0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
    }
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (error) {
        console.error("Error enumerating devices:", error);
      }
    };
    void getDevices();
  }, [isOpen, selectedDeviceId]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setRecordedUrl(null);
      setCapturedFile(null);
      setIsRecording(false);
      setCountdown(mode === "video" ? 60 : 0);
      clearTimer();
      stopStream();

      let mediaStream: MediaStream;
      try {
        const constraints = {
          audio: mode === "video",
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: "user" },
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback constraints for browsers/hardware missing user/environment specs
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: mode === "video",
          video: true,
        });
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (cameraError) {
      console.error("Camera access error:", cameraError);
      setError(
        "Camera and Microphone access are required. Please check your browser permissions."
      );
    }
  }, [clearTimer, mode, selectedDeviceId, stopStream]);

  useEffect(() => {
    if (!isOpen) return;

    void startCamera();

    return () => {
      stopStream();
      clearTimer();
    };
  }, [clearTimer, isOpen, startCamera, stopStream]);

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
            const url = URL.createObjectURL(blob);
            setRecordedUrl(url);
            setCapturedFile(file);
            stopStream();
          }
        },
        "image/jpeg",
        0.9
      );
    }
  };

  const handleStartRecording = () => {
    if (!streamRef.current) return;
    setRecordedUrl(null);
    setCapturedFile(null);
    setIsRecording(true);
    setCountdown(60);

    // Pick best format supported by browser (WebM vp9/vp8, or MP4 for iOS/Safari)
    let mimeType = "";
    const types = [
      "video/mp4;codecs=avc1",
      "video/mp4",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        mimeType = t;
        break;
      }
    }
    const options = mimeType ? { mimeType } : undefined;

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
      clearTimer();
      setIsRecording(false);
      if (chunks.length === 0) {
        setError("No video data was recorded. Please try again.");
        return;
      }

      const mimeType = mediaRecorder.mimeType || "video/webm";
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `intro-video.${extension}`, {
        type: mimeType,
      });
      setRecordedUrl(url);
      setCapturedFile(file);
      stopStream();
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
    clearTimer();
  };

  const handleUseCapturedMedia = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose();
    }
  };

  const handleRetake = () => {
    setRecordedUrl(null);
    setCapturedFile(null);
    setCountdown(mode === "video" ? 60 : 0);
    setIsRecording(false);
    void startCamera();
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
              : "Introduce yourself in a short, live 60-second video."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-4 aspect-square md:aspect-video w-full rounded-2xl bg-black overflow-hidden border border-border flex items-center justify-center">
          {error ? (
            <div className="p-4 text-center text-sm text-destructive font-medium">
              {error}
            </div>
          ) : recordedUrl ? (
            mode === "photo" ? (
              <img
                src={recordedUrl}
                alt="Captured profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={recordedUrl}
                controls
                className="w-full h-full object-cover"
              >
                <track kind="captions" />
              </video>
            )
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

        {/* Tip text under the frame */}
        {!recordedUrl && !error && (
          <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-2xl text-xs text-primary/95 font-semibold">
            {mode === "photo" ? (
              <p>💡 Tip: Center your face in the frame and smile!</p>
            ) : (
              <p>
                🗣️ Tip: Say: &quot;Hey, I&apos;m {displayName || "Name"}! I love
                doing [interests] and I&apos;m down to grab [food/drink]!&quot;
              </p>
            )}
          </div>
        )}

        {/* Device selection dropdown if multiple cameras exist */}
        {videoDevices.length > 1 && !recordedUrl && (
          <div className="flex flex-col gap-1.5 mt-3">
            <label
              htmlFor="camera-device-select"
              className="text-xs font-bold text-muted-foreground ml-1"
            >
              Select Camera Device
            </label>
            <select
              id="camera-device-select"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="rounded-full bg-background border border-border px-3 py-2 text-xs outline-none w-full text-foreground font-medium"
            >
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        )}

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
                onClick={handleUseCapturedMedia}
                disabled={!capturedFile}
                className="rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
              >
                {mode === "photo" ? "Use Photo" : "Use Video"}
              </Button>
            </>
          ) : mode === "photo" ? (
            <Button
              onClick={handleCapturePhoto}
              disabled={!!error || !stream}
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
              disabled={!!error || !stream}
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
