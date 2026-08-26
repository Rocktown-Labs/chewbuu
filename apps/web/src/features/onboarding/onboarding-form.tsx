import { api as blocksApi } from "@chewbuu/aws-blocks";
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
import { ScrollArea, ScrollBar } from "@chewbuu/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@chewbuu/ui/components/select";
import { Slider } from "@chewbuu/ui/components/slider";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { cn } from "@chewbuu/ui/lib/utils";
import {
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
  type ReactFormExtendedApi,
  useForm,
} from "@tanstack/react-form";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  HeartHandshake,
  ImagePlus,
  Mail,
  MapPin,
  Mic,
  Phone,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { NavigationBlocker } from "@/components/navigation-blocker";
import { authClient } from "@/lib/auth-client";
import {
  datingApi,
  pricingApi,
  type DatePlace,
  type DatingMedia,
  type DatingProfilePayload,
  type FavoritePlace,
  type MembershipPlan,
  type PlaceSuggestWhat,
} from "@/lib/dating-api";
import { triggerHaptic } from "@/lib/haptics";
import {
  getPushPermissionState,
  subscribeUserToPush,
} from "@/lib/push-notifications";
import { useUsernameChecker } from "@/lib/use-username-checker";

import {
  createMediaFile,
  createMediaCaptureSession,
  hasAudioTrack,
  type MediaCaptureSession,
} from "./media-capture";
import { useOnboardingStore } from "./onboarding-store";
import { WatchAutocomplete, type WatchSearchResult } from "./watch-search";

const steps = [
  "Basics",
  "Permissions",
  "Media",
  "Preferences",
  "Interests",
  "Values",
  "Friends",
  "Premium",
] as const;
const onboardingStepByHash = new Map(
  steps.map((label, index) => [label.toLowerCase(), index])
);
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

const MINIMUM_AGE = 18;
const UNDER_21_MATCH_MAX_AGE = 22;
const ADULT_MATCH_MIN_AGE = 23;
const MAXIMUM_MATCH_AGE = 99;

const WATCH_MEDIA_KEY = "Watch_media";
const WATCH_TOPIC_KEY = "Watch_topics";

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
      "Politics",
      "Philosophy",
    ],
  },
] as const;

const getCategorySignalValues = (
  details: Record<string, string[]>,
  category: string
) =>
  Object.entries(details)
    .filter(
      ([key, values]) =>
        values.length > 0 &&
        (key === category || key.startsWith(`${category}_`)) &&
        !key.endsWith("_places") &&
        key !== WATCH_MEDIA_KEY
    )
    .flatMap(([, values]) => values);

const getInterestSummary = (details: Record<string, string[]>) => ({
  favoriteThings: Array.from(
    new Set(
      interestCategories.flatMap((category) =>
        getCategorySignalValues(details, category.label)
      )
    )
  ),
  interests: interestCategories
    .filter(
      (category) => getCategorySignalValues(details, category.label).length
    )
    .map((category) => category.label),
});

const isWatchSearchResult = (value: unknown): value is WatchSearchResult => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
    (candidate.kind === "show" || candidate.kind === "person") &&
    typeof candidate.name === "string" &&
    typeof candidate.sourceUrl === "string"
  );
};

const parseWatchSearchResults = (values: string[] | undefined) =>
  (values ?? []).flatMap((value) => {
    try {
      const parsed: unknown = JSON.parse(value);
      return isWatchSearchResult(parsed) ? [parsed] : [];
    } catch {
      return [];
    }
  });

const defaultValues = {
  name: "",
  username: "",
  email: "",
  phone: "",
  occupation: "",
  race: "",
  area: "",
  bio: "",
  birthday: "",
  ageRangeMax: MAXIMUM_MATCH_AGE,
  ageRangeMin: MINIMUM_AGE,
  datingModes: ["solo"],
  favoriteThings: [] as string[],
  friendInvites: [] as DatingProfilePayload["friendInvites"],
  height: "",
  interestDetails: {} as Record<string, string[]>,
  favoritePlaces: {} as Record<string, FavoritePlace[]>,
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
  distanceMiles: 25,
};

type OnboardingFormValues = typeof defaultValues;
type OnboardingSyncValidator =
  | FormValidateOrFn<OnboardingFormValues>
  | undefined;
type OnboardingAsyncValidator =
  | FormAsyncValidateOrFn<OnboardingFormValues>
  | undefined;
type OnboardingFormApi = ReactFormExtendedApi<
  OnboardingFormValues,
  OnboardingSyncValidator,
  OnboardingSyncValidator,
  OnboardingAsyncValidator,
  OnboardingSyncValidator,
  OnboardingAsyncValidator,
  OnboardingSyncValidator,
  OnboardingAsyncValidator,
  OnboardingSyncValidator,
  OnboardingAsyncValidator,
  OnboardingAsyncValidator,
  unknown
>;

const getAge = (birthdayString: string) => {
  const today = new Date();
  const birthDate = new Date(birthdayString);
  if (Number.isNaN(birthDate.getTime())) return null;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthOffset = today.getMonth() - birthDate.getMonth();
  if (
    monthOffset < 0 ||
    (monthOffset === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age;
};

const getDateWhenUserTurns = (birthdayString: string, age: number) => {
  const birthDate = new Date(birthdayString);
  if (Number.isNaN(birthDate.getTime())) return null;
  return new Date(
    birthDate.getFullYear() + age,
    birthDate.getMonth(),
    birthDate.getDate()
  );
};

const formatEligibilityDate = (date: Date | null) => {
  if (!date) return "your 18th birthday";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatValue = (value: string) =>
  value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatIdentity = (value: string) => value;

const cleanUploadFileName = (name: string) =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80);

const getUploadType = (file: File, kind: DatingMedia["kind"]) => {
  if (kind === "intro_video") {
    return file.type.includes("mp4") ? "video/mp4" : "video/webm";
  }

  if (file.type === "image/svg+xml") {
    throw new Error("SVG images are not supported. Use a JPG, PNG, or WebP.");
  }

  if (
    file.type &&
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  ) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }

  return file.type || "image/jpeg";
};

const ensureUploadExtension = (fileName: string, contentType: string) => {
  const cleanName = cleanUploadFileName(fileName) || "upload";

  if (cleanName.includes(".")) {
    return cleanName;
  }

  const extension = contentType.includes("mp4")
    ? "mp4"
    : contentType.includes("webm")
      ? "webm"
      : contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg";

  return `${cleanName}.${extension}`;
};

const uploadProfileMedia = async (file: File, kind: DatingMedia["kind"]) => {
  const contentType = getUploadType(file, kind);
  const upload = await blocksApi.createMediaUpload({
    contentType,
    fileName: ensureUploadExtension(file.name, contentType),
    slot: kind,
  });
  const response = await fetch(upload.uploadUrl, {
    body: file,
    headers: { "content-type": contentType },
    method: "PUT",
  });
  if (!response.ok) throw new Error("Media upload failed.");

  return upload.mediaUrl;
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
  const router = useRouter();
  const {
    step: persistedStep,
    setStep: setPersistedStep,
    setProfile: setPersistedProfile,
    clear: clearPersistedOnboarding,
  } = useOnboardingStore();

  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [underageBirthday, setUnderageBirthday] = useState("");
  const [isLeavingOnboarding, setIsLeavingOnboarding] = useState(false);
  const { data: session } = authClient.useSession();

  const leaveOnboarding = useCallback(
    async (to: "/me") => {
      setIsLeavingOnboarding(true);
      await authClient.getSession();
      await router.invalidate();
      await navigate({ replace: true, to });
    },
    [navigate, router]
  );

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const media = value.media.filter((item) => item.url);

      if (!media.some((item) => item.kind === "profile_photo")) {
        toast.error("Add a profile photo before dating.");
        updateStep(2);
        return;
      }

      if (!media.some((item) => item.kind === "intro_video")) {
        toast.error("Chewbuu is video-first. Add your intro video.");
        updateStep(2);
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

      // Claim the username on Better Auth so it is unique across the platform
      if (
        session?.user &&
        value.username &&
        value.username !== session.user.username
      ) {
        try {
          const { error: usernameError } = await authClient.updateUser({
            username: value.username,
          });

          if (usernameError) {
            toast.error(
              usernameError.message ??
                "That username is taken. Pick another one."
            );
            updateStep(0);
            return;
          }
        } catch (error) {
          console.error("Failed to update username in auth:", error);
          toast.error("Could not save your username. Try again.");
          return;
        }
      }

      await datingApi.saveProfile({
        ...value,
        media,
      });
      clearPersistedOnboarding();
      toast.success("Profile ready. Go find a real date.");
      await leaveOnboarding("/me");
    },
  });

  // Sync form values to Zustand store as the user edits
  useEffect(() => {
    const subscription = form.store.subscribe((state) => {
      setPersistedProfile(state.values);
    });
    return () => subscription.unsubscribe();
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
          form.setFieldValue(
            "username",
            merged.username || session.user.username || ""
          );
        } else {
          form.setFieldValue("name", merged.name || "");
          form.setFieldValue("email", merged.email || "");
        }
        form.setFieldValue("phone", merged.phone || "");
        form.setFieldValue("birthday", merged.birthday || "");
        form.setFieldValue(
          "ageRangeMin",
          merged.ageRangeMin || defaultValues.ageRangeMin
        );
        form.setFieldValue(
          "ageRangeMax",
          merged.ageRangeMax || defaultValues.ageRangeMax
        );
        form.setFieldValue(
          "distanceMiles",
          merged.distanceMiles || defaultValues.distanceMiles
        );
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
        form.setFieldValue("favoritePlaces", merged.favoritePlaces || {});
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
        setPlans([]);
      }
    };

    void loadPlans();
  }, []);

  const updateStep = useCallback(
    (newStep: number) => {
      setStep(newStep);
      setPersistedStep(newStep);
      if (typeof window !== "undefined") {
        window.location.hash = steps[newStep].toLowerCase();
      }
    },
    [setPersistedStep]
  );

  useEffect(() => {
    const hash =
      typeof window !== "undefined"
        ? window.location.hash.replace("#", "").toLowerCase()
        : "";
    const hashStep = onboardingStepByHash.get(hash);
    if (typeof hashStep === "number") {
      setStep(hashStep);
    } else if (
      typeof persistedStep === "number" &&
      persistedStep > 0 &&
      persistedStep < steps.length
    ) {
      setStep(persistedStep);
    }
  }, [persistedStep]);

  const progress = ((step + 1) / steps.length) * 100;

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

      const age = getAge(values.birthday);
      if (age === null) {
        toast.error("Enter a valid birthday.");
        return;
      }

      if (age < MINIMUM_AGE) {
        setUnderageBirthday(values.birthday);
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

    if (step === 2) {
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

    if (step === 3) {
      const age = getAge(values.birthday);
      const maxAllowedAge =
        age !== null && age < 21 ? UNDER_21_MATCH_MAX_AGE : MAXIMUM_MATCH_AGE;
      const minAllowedAge =
        age !== null && age >= 21 ? ADULT_MATCH_MIN_AGE : MINIMUM_AGE;
      const ageRangeMin = Number(values.ageRangeMin);
      const ageRangeMax =
        age !== null && age < 21
          ? Math.min(Number(values.ageRangeMax), UNDER_21_MATCH_MAX_AGE)
          : Number(values.ageRangeMax);

      if (age !== null && age < 21) {
        form.setFieldValue("ageRangeMax", UNDER_21_MATCH_MAX_AGE);
        if (ageRangeMin > UNDER_21_MATCH_MAX_AGE) {
          form.setFieldValue("ageRangeMin", MINIMUM_AGE);
        }
      }

      if (age !== null && age >= 21 && ageRangeMin < ADULT_MATCH_MIN_AGE) {
        form.setFieldValue("ageRangeMin", ADULT_MATCH_MIN_AGE);
      }

      if (
        Number.isNaN(ageRangeMin) ||
        Number.isNaN(ageRangeMax) ||
        ageRangeMin < minAllowedAge ||
        ageRangeMax > maxAllowedAge ||
        ageRangeMin > ageRangeMax
      ) {
        toast.error("Choose a valid match age range.");
        return;
      }

      if (!values.interestedIn || values.interestedIn.length === 0) {
        toast.error("Please select at least one option you are interested in.");
        return;
      }

      if (!values.lookingFor || values.lookingFor.length === 0) {
        toast.error("Select at least one thing you are looking for.");
        return;
      }
    }

    if (step === 4) {
      const details = values.interestDetails || {};
      const age = getAge(values.birthday);
      const categories =
        age !== null && age < 21
          ? ["Eat", "Play", "Move", "Watch", "Talk"]
          : ["Eat", "Drink", "Play", "Move", "Watch", "Talk"];
      for (const cat of categories) {
        if (getCategorySignalValues(details, cat).length === 0) {
          toast.error(
            `Please select or add at least one interest for "${cat}".`
          );
          return;
        }
      }
    }

    if (step === 5) {
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
    }

    if (step === 6) {
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
      await datingApi.saveProfileDraft({
        ...values,
        media,
      });
      toast.dismiss("finish-later");
      toast.success("Progress saved. Return anytime to finish setup.", {
        duration: 3000,
      });
      await leaveOnboarding("/me");
    } catch (error) {
      toast.dismiss("finish-later");
      toast.error(
        error instanceof Error ? error.message : "Could not save progress.",
        { duration: 4000 }
      );
    }
  };

  if (underageBirthday) {
    return (
      <UnderageGate
        birthday={underageBirthday}
        email={form.state.values.email}
        onBack={() => setUnderageBirthday("")}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-8">
      <NavigationBlocker
        description="You have onboarding setup in progress. If you leave now, you will lose unsaved step entries."
        shouldBlock={!isLeavingOnboarding && step > 0 && step < 4}
        title="Unsaved Onboarding Progress"
      />
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

      <div className="grid gap-6 lg:grid-cols-[auto_1fr] items-start">
        <nav
          className="flex flex-wrap gap-2 lg:flex-col lg:w-44 lg:shrink-0 pb-1 lg:pb-0"
          aria-label="Onboarding Steps"
        >
          {steps.map((label, index) => {
            const isCurrent = index === step;
            const isCompleted = index < step;

            return (
              <button
                className={cn(
                  "w-fit rounded-full border px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer text-left",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                    : isCompleted
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                      : "border-border/80 bg-card/60 text-muted-foreground hover:text-foreground hover:border-border-hover"
                )}
                key={label}
                onClick={() => updateStep(index)}
                type="button"
              >
                <span>{label}</span>
              </button>
            );
          })}
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
            {step === 0 && <BasicsStep form={form} onNextStep={goNext} />}
            {step === 1 && <PermissionsStep form={form} />}
            {step === 2 && <MediaStep form={form} />}
            {step === 3 && <PreferencesStep form={form} />}
            {step === 4 && <InterestsStep form={form} />}
            {step === 5 && <ValuesStep form={form} />}
            {step === 6 && <FriendsStep form={form} />}
            {step === 7 && (
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
              {step < steps.length - 1 ? (
                <>
                  <Button
                    className="rounded-full px-5 h-10 font-semibold"
                    onClick={handleFinishLater}
                    type="button"
                    variant="ghost"
                  >
                    Save for later
                  </Button>
                  <Button
                    className="rounded-full px-6 h-10 font-semibold"
                    onClick={goNext}
                    type="button"
                  >
                    Next
                    <ChevronRight className="size-4 ml-1 inline" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

function UsernameInput({ field }: { field: any }) {
  const { status } = useUsernameChecker(field.state.value || "");
  const inputStateClass =
    status === "available"
      ? "border-emerald-500 focus-visible:ring-emerald-500/35"
      : status === "taken" || status === "invalid"
        ? "border-destructive focus-visible:ring-destructive/35"
        : "";
  return (
    <Field>
      <FieldLabel htmlFor={field.name}>Username</FieldLabel>
      <div className="relative">
        <Input
          aria-invalid={status === "taken" || status === "invalid"}
          className={`h-10 rounded-full px-4 text-sm ${inputStateClass}`}
          id={field.name}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          placeholder="e.g. alex_vibe"
          value={field.state.value || ""}
        />
      </div>
      {status === "checking" ? (
        <FieldDescription className="text-[10px]">
          Checking availability...
        </FieldDescription>
      ) : null}
      {status === "available" ? (
        <FieldDescription className="text-[10px] text-emerald-600">
          Username is available.
        </FieldDescription>
      ) : null}
      {status === "taken" ? (
        <FieldDescription className="text-[10px] text-destructive">
          Username is not available.
        </FieldDescription>
      ) : null}
      {status === "invalid" ? (
        <FieldDescription className="text-[10px] text-destructive">
          Use at least 3 letters, numbers, or underscores.
        </FieldDescription>
      ) : null}
    </Field>
  );
}

function AccordionSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  isComplete,
  badge,
  children,
  sectionNumber,
}: {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  isComplete?: boolean;
  badge?: string;
  children: React.ReactNode;
  sectionNumber?: number | string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200 overflow-hidden",
        isOpen
          ? "border-primary/50 bg-background shadow-xs ring-1 ring-primary/20"
          : "border-border bg-card/60 hover:border-border-hover"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-semibold cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-3">
          {sectionNumber !== undefined && (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                isComplete
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : isOpen
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {isComplete ? <Check className="size-3.5" /> : sectionNumber}
            </span>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base text-foreground font-semibold">
                {title}
              </span>
              {badge && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  {badge}
                </Badge>
              )}
              {isComplete && (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] hidden sm:inline-flex"
                >
                  Completed
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground shrink-0 transition-transform duration-200",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 pt-0 border-t border-border/40 animate-in fade-in-50 duration-200">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function BasicsStep({
  form,
  onNextStep,
}: {
  form: OnboardingFormApi;
  onNextStep: () => void;
}) {
  const [openSection, setOpenSection] = useState<
    "contact" | "personal" | "identity"
  >("contact");
  const [area, setArea] = useState(form.state.values.area);
  const areaIsInvalid = area.length > 0 && !areaPattern.test(area.trim());

  const { values } = form.state;

  const isContactComplete = Boolean(
    values.name?.trim() &&
    values.name.trim().length >= 2 &&
    values.email?.trim() &&
    /^\S+@\S+\.\S+$/.test(values.email.trim()) &&
    (values.phone || "").replaceAll(/\D/g, "").length >= 10
  );

  const isPersonalComplete = Boolean(
    values.occupation?.trim() &&
    values.race &&
    areaPattern.test((values.area || "").trim()) &&
    values.birthday &&
    getAge(values.birthday) !== null &&
    (getAge(values.birthday) as number) >= MINIMUM_AGE
  );

  const isIdentityComplete = Boolean(
    values.sex &&
    values.sexuality &&
    values.maritalStatus &&
    values.bio?.trim() &&
    values.bio.trim().length >= 10
  );

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

      let resolvedArea = "";
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const data = await res.json();
        const city =
          data?.address?.city ||
          data?.address?.town ||
          data?.address?.village ||
          data?.address?.suburb ||
          "";
        const state = data?.address?.state_code || data?.address?.state || "";
        const stateCode = String(state).trim().slice(0, 2).toUpperCase();
        if (city && stateCode) resolvedArea = `${city}, ${stateCode}`;
      } catch (error) {
        console.error("OSM geocode error:", error);
      }

      if (!resolvedArea) {
        toast.dismiss("geo");
        toast.error("Could not determine your area. Enter it manually.", {
          duration: 4000,
        });
        return;
      }

      form.setFieldValue("area", resolvedArea);
      setArea(resolvedArea);
      toast.dismiss("geo");
      toast.success(`Location set to ${resolvedArea}`, { duration: 3000 });
    } catch (error) {
      console.error("Geolocation error:", error);
      toast.dismiss("geo");
      toast.error("Location permission denied or unavailable.", {
        duration: 4000,
      });
    }
  };

  const handleNextFromContact = () => {
    if (!values.name?.trim() || values.name.trim().length < 2) {
      toast.error("Display Name must be at least 2 characters.");
      return;
    }
    if (!values.email?.trim() || !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      toast.error("A valid email address is required.");
      return;
    }
    const cleanedPhone = (values.phone || "").replaceAll(/\D/g, "");
    if (cleanedPhone.length < 10) {
      toast.error("A valid 10-digit phone number is required.");
      return;
    }
    setOpenSection("personal");
  };

  const handleNextFromPersonal = () => {
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
    const age = getAge(values.birthday);
    if (age === null || age < MINIMUM_AGE) {
      toast.error("You must be at least 18 years old.");
      return;
    }
    setOpenSection("identity");
  };

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        eyebrow="Basics"
        title="Tell Chewbuu who is going out."
        text="Keep it clean and real. Fill out each section below to complete your basic profile."
      />

      <div className="flex flex-col gap-4">
        {/* Section 1: Contact */}
        <AccordionSection
          sectionNumber={1}
          title="Contact & Handle"
          subtitle="Display name, username, email & phone"
          isOpen={openSection === "contact"}
          onToggle={() =>
            setOpenSection(openSection === "contact" ? "personal" : "contact")
          }
          isComplete={isContactComplete}
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field name="name">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Display Name</FieldLabel>
                    <Input
                      className="rounded-full h-10 px-4 text-sm"
                      id={field.name}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="E.g. Sarah Smith"
                      value={field.state.value}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="username">
                {(field) => <UsernameInput field={field} />}
              </form.Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field name="email">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Email Address</FieldLabel>
                    <Input
                      className="rounded-full h-10 px-4 text-sm bg-muted/30"
                      id={field.name}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
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

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                className="rounded-full px-5 h-9 font-semibold gap-1 text-xs"
                onClick={handleNextFromContact}
              >
                Next: Personal Details
                <ChevronDown className="size-3.5" />
              </Button>
            </div>
          </div>
        </AccordionSection>

        {/* Section 2: Personal & Location */}
        <AccordionSection
          sectionNumber={2}
          title="Personal Details & Location"
          subtitle="Occupation, race, area & birthday"
          isOpen={openSection === "personal"}
          onToggle={() =>
            setOpenSection(openSection === "personal" ? "identity" : "personal")
          }
          isComplete={isPersonalComplete}
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field name="occupation">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Occupation / Career
                    </FieldLabel>
                    <Input
                      className="rounded-full h-10 px-4 text-sm"
                      id={field.name}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="E.g. Software Engineer, Designer"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field name="area">
                {(field) => (
                  <Field data-invalid={areaIsInvalid || undefined}>
                    <FieldLabel htmlFor={field.name}>
                      Area (City, ST)
                    </FieldLabel>
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
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      type="date"
                      value={field.state.value}
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full px-4 h-9 font-semibold text-xs"
                onClick={() => setOpenSection("contact")}
              >
                Back: Contact
              </Button>
              <Button
                type="button"
                className="rounded-full px-5 h-9 font-semibold gap-1 text-xs"
                onClick={handleNextFromPersonal}
              >
                Next: Identity & Bio
                <ChevronDown className="size-3.5" />
              </Button>
            </div>
          </div>
        </AccordionSection>

        {/* Section 3: Identity & Bio */}
        <AccordionSection
          sectionNumber={3}
          title="Identity & Bio"
          subtitle="Sex, sexuality, relationship status & bio"
          isOpen={openSection === "identity"}
          onToggle={() =>
            setOpenSection(openSection === "identity" ? "contact" : "identity")
          }
          isComplete={isIdentityComplete}
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                form={form}
                label="Relationship Status"
                name="maritalStatus"
                options={maritalStatusOptions}
                placeholder="Select relationship status"
              />
              <form.Field name="height">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Height (Optional)
                    </FieldLabel>
                    <Input
                      className="rounded-full h-10 px-4 text-sm"
                      id={field.name}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder={`E.g. 5'10"`}
                      value={field.state.value ?? ""}
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <form.Field name="bio">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Short Bio</FieldLabel>
                  <Textarea
                    className="rounded-2xl p-4 min-h-24 text-sm"
                    id={field.name}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="What should someone know before saying yes?"
                    value={field.state.value}
                  />
                  <FieldDescription>Min 10 characters.</FieldDescription>
                </Field>
              )}
            </form.Field>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full px-4 h-9 font-semibold text-xs"
                onClick={() => setOpenSection("personal")}
              >
                Back: Personal Details
              </Button>
              <Button
                type="button"
                className="rounded-full px-6 h-9 font-semibold gap-1 text-xs"
                onClick={onNextStep}
              >
                Continue to Permissions
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}

function MediaStep({ form }: { form: OnboardingFormApi }) {
  const [openSection, setOpenSection] = useState<"photo" | "video" | "extras">(
    "photo"
  );

  return (
    <form.Subscribe selector={(state) => [state.values.media]}>
      {([mediaValue]) => {
        const media = (mediaValue || []) as DatingMedia[];
        const hasProfilePhoto = Boolean(
          media.find((item) => item.kind === "profile_photo" && item.url)
        );
        const hasIntroVideo = Boolean(
          media.find((item) => item.kind === "intro_video" && item.url)
        );
        const extraPhotoCount = media.filter(
          (item) => item.kind === "photo" && item.url
        ).length;

        return (
          <div className="flex flex-col gap-6">
            <StepIntro
              eyebrow="Media"
              title="Live Capture. Real photos."
              text="A profile photo and intro video are required to date on Chewbuu. To prevent AI & fake profiles, profile media must be captured live."
            />

            <div className="flex flex-col gap-4">
              {/* Section 1: Profile Photo */}
              <AccordionSection
                sectionNumber={1}
                title="Profile Photo"
                subtitle="Live selfie capture required for identity verification"
                isOpen={openSection === "photo"}
                onToggle={() =>
                  setOpenSection(openSection === "photo" ? "video" : "photo")
                }
                isComplete={hasProfilePhoto}
                badge="Required"
              >
                <div className="flex flex-col gap-4">
                  <MediaSlot
                    accept="image/*"
                    form={form}
                    icon={Camera}
                    index={0}
                    kind="profile_photo"
                    label="Profile photo"
                  />
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      className="rounded-full px-5 h-9 font-semibold gap-1 text-xs"
                      onClick={() => setOpenSection("video")}
                    >
                      Next: Intro Video
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </AccordionSection>

              {/* Section 2: Intro Video */}
              <AccordionSection
                sectionNumber={2}
                title="Intro Video"
                subtitle="Live 60-second video with audio introduction"
                isOpen={openSection === "video"}
                onToggle={() =>
                  setOpenSection(openSection === "video" ? "extras" : "video")
                }
                isComplete={hasIntroVideo}
                badge="Required"
              >
                <div className="flex flex-col gap-4">
                  <MediaSlot
                    accept="video/*"
                    form={form}
                    icon={Video}
                    index={1}
                    kind="intro_video"
                    label="Intro video"
                  />
                  <div className="flex justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-full px-4 h-9 font-semibold text-xs"
                      onClick={() => setOpenSection("photo")}
                    >
                      Back: Profile Photo
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full px-5 h-9 font-semibold gap-1 text-xs"
                      onClick={() => setOpenSection("extras")}
                    >
                      Next: Additional Photos
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </AccordionSection>

              {/* Section 3: Additional Photos */}
              <AccordionSection
                sectionNumber={3}
                title="Additional Photos"
                subtitle={`Add up to 6 photos to enrich your profile (${extraPhotoCount}/6)`}
                isOpen={openSection === "extras"}
                onToggle={() =>
                  setOpenSection(openSection === "extras" ? "photo" : "extras")
                }
                isComplete={extraPhotoCount > 0}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-muted-foreground text-xs">
                      Upload from your gallery or snap new shots.
                    </p>
                    <Button
                      className="rounded-full px-4 h-8 font-semibold text-xs"
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
                      <Plus className="size-3.5 mr-1 inline" />
                      Add photo
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
                        />
                      ))}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-full px-4 h-9 font-semibold text-xs"
                      onClick={() => setOpenSection("video")}
                    >
                      Back: Intro Video
                    </Button>
                  </div>
                </div>
              </AccordionSection>
            </div>
          </div>
        );
      }}
    </form.Subscribe>
  );
}

function PermissionsStep({ form }: { form: OnboardingFormApi }) {
  const [cameraState, setCameraState] = useState<
    "granted" | "prompt" | "denied"
  >("prompt");
  const [micState, setMicState] = useState<"granted" | "prompt" | "denied">(
    "prompt"
  );
  const [pushState, setPushState] = useState<"granted" | "prompt" | "denied">(
    "prompt"
  );
  const [locationState, setLocationState] = useState<
    "granted" | "prompt" | "denied"
  >("prompt");
  const [isRequestingAll, setIsRequestingAll] = useState(false);
  const [hapticTested, setHapticTested] = useState(false);
  const [isHapticsSupported, setIsHapticsSupported] = useState(false);

  useEffect(() => {
    setIsHapticsSupported(
      typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0)
    );

    const notifPermission = getPushPermissionState();
    if (notifPermission === "granted") {
      setPushState("granted");
    } else if (notifPermission === "denied") {
      setPushState("denied");
    }

    if (form.state.values.latitude && form.state.values.longitude) {
      setLocationState("granted");
    }
  }, [form.state.values.latitude, form.state.values.longitude]);

  const requestCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Camera access is not supported in this browser.");
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      setCameraState("granted");
      triggerHaptic("light");
      toast.success("Camera access granted!");
      return true;
    } catch {
      setCameraState("denied");
      toast.error("Camera access was denied.");
      return false;
    }
  };

  const requestMicrophone = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Microphone access is not supported in this browser.");
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      setMicState("granted");
      triggerHaptic("light");
      toast.success("Microphone access granted!");
      return true;
    } catch {
      setMicState("denied");
      toast.error("Microphone access was denied.");
      return false;
    }
  };

  const requestPush = async () => {
    try {
      const res = await subscribeUserToPush();
      if (res.ok) {
        setPushState("granted");
        toast.success("Push notifications enabled!");
        return true;
      }
      setPushState("denied");
      toast.error(res.error || "Failed to enable push notifications.");
      return false;
    } catch {
      setPushState("denied");
      toast.error("Notification permission denied.");
      return false;
    }
  };

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser.");
      return false;
    }
    // eslint-disable-next-line promise/avoid-new
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setFieldValue("latitude", String(position.coords.latitude));
          form.setFieldValue("longitude", String(position.coords.longitude));
          setLocationState("granted");
          triggerHaptic("light");
          toast.success("Location access granted!");
          resolve(true);
        },
        () => {
          setLocationState("denied");
          toast.error("Location permission was denied.");
          resolve(false);
        },
        { timeout: 10_000 }
      );
    });
  };

  const handleEnableAll = async () => {
    setIsRequestingAll(true);
    toast.info("Requesting device permissions...");
    await requestCamera();
    await requestMicrophone();
    await requestPush();
    await requestLocation();
    triggerHaptic("success");
    setIsRequestingAll(false);
  };

  const handleTestHaptics = () => {
    const success = triggerHaptic("success");
    setHapticTested(true);
    if (success) {
      toast.success("Haptic vibration triggered! 📳");
    } else {
      toast.info(
        "Haptic feedback simulated (vibration not supported on desktop browser)."
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge
            className="bg-primary/10 text-primary border-primary/20"
            variant="outline"
          >
            Step 2 of {steps.length}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Device Permissions & Alerts
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Enable Device Access & Alerts
        </h2>
        <p className="text-sm text-muted-foreground">
          Chewbuu uses camera and microphone for live video dates, location for
          nearby restaurant matching, and notifications for instant match
          updates.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          className="rounded-full font-semibold gap-1.5 text-xs sm:text-sm"
          disabled={isRequestingAll}
          onClick={handleEnableAll}
          type="button"
          variant="secondary"
        >
          <Sparkles className="size-4" />
          {isRequestingAll
            ? "Requesting Permissions..."
            : "Enable All Permissions"}
        </Button>
      </div>

      {/* 2 columns on mobile and desktop */}
      <div className="grid grid-cols-2 gap-3">
        {/* Camera */}
        <div className="flex flex-col justify-between rounded-2xl border bg-background/50 p-3.5 sm:p-5 shadow-xs transition-colors hover:border-primary/40">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Camera className="size-4 sm:size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-foreground">
                  Camera
                </h3>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  Live selfies & video dates.
                </p>
              </div>
            </div>
            {cameraState === "granted" ? (
              <Badge
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] self-start"
                variant="outline"
              >
                <CheckCircle2 className="size-2.5 mr-0.5" />
                Granted
              </Badge>
            ) : cameraState === "denied" ? (
              <Badge variant="destructive" className="text-[10px] self-start">
                Denied
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] self-start">
                Ready
              </Badge>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t">
            <Button
              className="w-full rounded-xl text-xs h-8 sm:h-9"
              disabled={cameraState === "granted"}
              onClick={requestCamera}
              type="button"
              variant={cameraState === "granted" ? "outline" : "default"}
            >
              {cameraState === "granted" ? "Enabled" : "Allow Camera"}
            </Button>
          </div>
        </div>

        {/* Microphone */}
        <div className="flex flex-col justify-between rounded-2xl border bg-background/50 p-3.5 sm:p-5 shadow-xs transition-colors hover:border-primary/40">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mic className="size-4 sm:size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-foreground">
                  Microphone
                </h3>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  Audio during video dates.
                </p>
              </div>
            </div>
            {micState === "granted" ? (
              <Badge
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] self-start"
                variant="outline"
              >
                <CheckCircle2 className="size-2.5 mr-0.5" />
                Granted
              </Badge>
            ) : micState === "denied" ? (
              <Badge variant="destructive" className="text-[10px] self-start">
                Denied
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] self-start">
                Ready
              </Badge>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t">
            <Button
              className="w-full rounded-xl text-xs h-8 sm:h-9"
              disabled={micState === "granted"}
              onClick={requestMicrophone}
              type="button"
              variant={micState === "granted" ? "outline" : "default"}
            >
              {micState === "granted" ? "Enabled" : "Allow Mic"}
            </Button>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex flex-col justify-between rounded-2xl border bg-background/50 p-3.5 sm:p-5 shadow-xs transition-colors hover:border-primary/40">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bell className="size-4 sm:size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-foreground">
                  Push Alerts
                </h3>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  Match & date updates.
                </p>
              </div>
            </div>
            {pushState === "granted" ? (
              <Badge
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] self-start"
                variant="outline"
              >
                <CheckCircle2 className="size-2.5 mr-0.5" />
                Granted
              </Badge>
            ) : pushState === "denied" ? (
              <Badge variant="destructive" className="text-[10px] self-start">
                Denied
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] self-start">
                Ready
              </Badge>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t">
            <Button
              className="w-full rounded-xl text-xs h-8 sm:h-9"
              disabled={pushState === "granted"}
              onClick={requestPush}
              type="button"
              variant={pushState === "granted" ? "outline" : "default"}
            >
              {pushState === "granted" ? "Enabled" : "Allow Alerts"}
            </Button>
          </div>
        </div>

        {/* Location */}
        <div className="flex flex-col justify-between rounded-2xl border bg-background/50 p-3.5 sm:p-5 shadow-xs transition-colors hover:border-primary/40">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-4 sm:size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-foreground">
                  Location
                </h3>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  Nearby restaurant spots.
                </p>
              </div>
            </div>
            {locationState === "granted" ? (
              <Badge
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] self-start"
                variant="outline"
              >
                <CheckCircle2 className="size-2.5 mr-0.5" />
                Granted
              </Badge>
            ) : locationState === "denied" ? (
              <Badge variant="destructive" className="text-[10px] self-start">
                Denied
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] self-start">
                Ready
              </Badge>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t">
            <Button
              className="w-full rounded-xl text-xs h-8 sm:h-9"
              disabled={locationState === "granted"}
              onClick={requestLocation}
              type="button"
              variant={locationState === "granted" ? "outline" : "default"}
            >
              {locationState === "granted" ? "Enabled" : "Allow GPS"}
            </Button>
          </div>
        </div>
      </div>

      {/* Tactile Haptics Test */}
      <div className="rounded-2xl border bg-card/60 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="size-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                Tactile Haptic Feedback
              </h4>
              <p className="text-xs text-muted-foreground">
                {isHapticsSupported
                  ? "Test vibration patterns for match confirmations and alerts."
                  : "Vibration feedback is active on mobile devices (iOS/Android PWA)."}
              </p>
            </div>
          </div>
          {isHapticsSupported && (
            <Button
              className="rounded-full text-xs h-8 sm:h-9 px-4 self-start sm:self-auto font-semibold"
              onClick={handleTestHaptics}
              type="button"
              variant="outline"
            >
              {hapticTested ? "Vibrate Again 📳" : "Test Vibration 📳"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function UnderageGate({
  birthday,
  email,
  onBack,
}: {
  birthday: string;
  email?: string;
  onBack: () => void;
}) {
  const eligibilityDate = formatEligibilityDate(
    getDateWhenUserTurns(birthday, MINIMUM_AGE)
  );

  return (
    <main className="mx-auto flex min-h-[70svh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <Badge
        className="rounded-full px-3 py-1 font-semibold"
        variant="secondary"
      >
        18 and older
      </Badge>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-normal">
          Sorry, Chewbuu is for adults.
        </h1>
        <p className="text-muted-foreground">
          Come back on {eligibilityDate}. We will keep Chewbuu warm for you and
          notify {email?.trim() ? email : "you"} when your account can continue.
        </p>
      </div>
      <Button className="rounded-full px-6" onClick={onBack} type="button">
        Edit birthday
      </Button>
    </main>
  );
}

function PreferencesStep({ form }: { form: OnboardingFormApi }) {
  return (
    <form.Subscribe
      selector={(state) => [
        state.values.birthday,
        state.values.interestedIn,
        state.values.lookingFor,
      ]}
    >
      {([birthdayValue, interestedInValue, lookingForValue]) => {
        const interestedIn = (interestedInValue || []) as string[];
        const lookingFor = (lookingForValue || []) as string[];

        return (
          <div className="flex flex-col gap-6">
            <StepIntro
              eyebrow="Preferences"
              title="Set your match lane."
              text="Choose who can show up, what you are open to, and the age range Chewbuu should respect when matching."
            />
            <FieldGroup>
              <AgeRangeField
                birthday={(birthdayValue as string) || ""}
                form={form}
              />

              <form.Field name="distanceMiles">
                {(field) => (
                  <Field>
                    <FieldLabel>Distance range (miles)</FieldLabel>
                    <FieldDescription>
                      Limit the matches and spots Chewbuu searches for you.
                    </FieldDescription>
                    <div className="rounded-2xl border bg-background p-4 shadow-xs">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Max Distance
                        </span>
                        <Badge
                          variant="secondary"
                          className="rounded-full font-bold px-2.5 py-0.5"
                        >
                          {field.state.value || 25} miles
                        </Badge>
                      </div>
                      <Slider
                        aria-label="Distance range"
                        max={100}
                        min={5}
                        onValueChange={(value) => {
                          const nextVal = Array.isArray(value)
                            ? value[0]
                            : value;
                          field.handleChange(nextVal);
                        }}
                        value={[field.state.value || 25]}
                      />
                    </div>
                  </Field>
                )}
              </form.Field>

              <form.Field name="interestedIn">
                {(field) => (
                  <Field>
                    <FieldLabel>Interested in</FieldLabel>
                    <FieldDescription>
                      Select the people and social setups you want Chewbuu to
                      consider.
                    </FieldDescription>
                    <MultiPillSelect
                      format={formatValue}
                      onChange={field.handleChange}
                      options={["women", "men", "couples", "friends", "groups"]}
                      value={interestedIn}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="lookingFor">
                {(field) => (
                  <Field>
                    <FieldLabel>What are you looking for?</FieldLabel>
                    <FieldDescription>
                      Pick every mode that feels true right now.
                    </FieldDescription>
                    <MultiPillSelect
                      onChange={field.handleChange}
                      options={lookingForOptions}
                      value={lookingFor}
                    />
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

function AgeRangeField({
  birthday,
  form,
}: {
  birthday: string;
  form: OnboardingFormApi;
}) {
  return (
    <form.Subscribe
      selector={(state) => [state.values.ageRangeMin, state.values.ageRangeMax]}
    >
      {([ageRangeMinValue, ageRangeMaxValue]) => (
        <AgeRangeSlider
          ageRangeMax={Number(ageRangeMaxValue)}
          ageRangeMin={Number(ageRangeMinValue)}
          birthday={birthday}
          form={form}
        />
      )}
    </form.Subscribe>
  );
}

function AgeRangeSlider({
  ageRangeMax,
  ageRangeMin,
  birthday,
  form,
}: {
  ageRangeMax: number;
  ageRangeMin: number;
  birthday: string;
  form: OnboardingFormApi;
}) {
  const age = getAge(birthday);
  const isUnder21 = age !== null && age < 21;
  const isAdult = age !== null && age >= 21;
  const sliderMin = isAdult ? ADULT_MATCH_MIN_AGE : MINIMUM_AGE;
  const sliderMax = isUnder21 ? UNDER_21_MATCH_MAX_AGE : MAXIMUM_MATCH_AGE;

  // Snap out-of-band values whenever the age rules change the allowed band
  // (for example, when the birthday shows the member is 21+).
  useEffect(() => {
    if (
      Number.isNaN(ageRangeMin) ||
      ageRangeMin < sliderMin ||
      ageRangeMin > sliderMax
    ) {
      form.setFieldValue("ageRangeMin", sliderMin);
    }
    if (
      Number.isNaN(ageRangeMax) ||
      ageRangeMax > sliderMax ||
      ageRangeMax < sliderMin
    ) {
      form.setFieldValue("ageRangeMax", sliderMax);
    }
  }, [form, ageRangeMin, ageRangeMax, sliderMin, sliderMax]);

  const clampedMin = Math.min(
    Math.max(Number.isNaN(ageRangeMin) ? sliderMin : ageRangeMin, sliderMin),
    sliderMax
  );
  const clampedMax = Math.max(
    Math.min(Number.isNaN(ageRangeMax) ? sliderMax : ageRangeMax, sliderMax),
    sliderMin
  );

  const handleRangeChange = (value: number | readonly number[]) => {
    if (!Array.isArray(value) || value.length < 2) {
      return;
    }
    const [nextMin, nextMax] = value;
    form.setFieldValue(
      "ageRangeMin",
      Math.min(Math.max(nextMin, sliderMin), sliderMax)
    );
    form.setFieldValue(
      "ageRangeMax",
      Math.max(Math.min(nextMax, sliderMax), sliderMin)
    );
  };

  return (
    <Field>
      <FieldLabel>Match age range</FieldLabel>
      <FieldDescription>
        {isUnder21
          ? "For 18-20 year olds, Chewbuu limits matching to ages 18-22."
          : "Match options start at 23 and go up from there. Drag both ends to set your lane."}
      </FieldDescription>
      <div className="rounded-2xl border bg-background p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Badge variant="secondary">{clampedMin} min</Badge>
          <Badge variant="secondary">{clampedMax} max</Badge>
        </div>
        <Slider
          aria-label="Match age range"
          max={sliderMax}
          min={sliderMin}
          onValueChange={handleRangeChange}
          value={[clampedMin, clampedMax]}
        />
      </div>
    </Field>
  );
}

function MultiPillSelect({
  format = formatIdentity,
  onChange,
  options,
  value,
}: {
  format?: (value: string) => string;
  onChange: (value: string[]) => void;
  options: string[];
  value: string[];
}) {
  return (
    <div className="flex flex-wrap justify-start gap-2">
      {options.map((option) => (
        <Button
          className="rounded-full px-4 py-2 text-sm"
          key={option}
          onClick={() => {
            const next = value.includes(option)
              ? value.filter((item) => item !== option)
              : [...value, option];
            onChange(next);
          }}
          type="button"
          variant={value.includes(option) ? "default" : "outline"}
        >
          {format(option)}
        </Button>
      ))}
    </div>
  );
}

function InterestsStep({ form }: { form: OnboardingFormApi }) {
  return (
    <form.Subscribe
      selector={(state) =>
        [
          state.values.interestDetails,
          state.values.favoritePlaces,
          state.values.area,
          state.values.birthday,
        ] as const
      }
    >
      {([interestDetails, favoritePlaces, areaValue, birthdayValue]) => (
        <InterestsStepContent
          form={form}
          interestDetails={interestDetails || {}}
          favoritePlaces={favoritePlaces || {}}
          area={areaValue}
          birthday={(birthdayValue as string) || ""}
        />
      )}
    </form.Subscribe>
  );
}

interface InterestsStepContentProps {
  birthday: string;
  favoritePlaces: Record<string, FavoritePlace[]>;
  form: OnboardingFormApi;
  interestDetails: Record<string, string[]>;
  area: string;
}

function InterestsStepContent({
  birthday,
  favoritePlaces,
  form,
  interestDetails,
  area,
}: InterestsStepContentProps) {
  const age = getAge(birthday);
  const availableInterestCategories = useMemo(
    () =>
      age !== null && age < 21
        ? interestCategories.filter((category) => category.label !== "Drink")
        : interestCategories,
    [age]
  );
  const [activeCategory, setActiveCategory] = useState<
    (typeof interestCategories)[number]["label"]
  >(availableInterestCategories[0].label);
  const [customInterest, setCustomInterest] = useState("");
  const [placesByQuery, setPlacesByQuery] = useState<
    Record<string, DatePlace[]>
  >({});
  const [searchedPlaceQueries, setSearchedPlaceQueries] = useState<string[]>(
    []
  );
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [placeSearch, setPlaceSearch] = useState("");

  const active = useMemo(
    () =>
      availableInterestCategories.find(
        (category) => category.label === activeCategory
      ) ?? availableInterestCategories[0],
    [activeCategory, availableInterestCategories]
  );

  useEffect(() => {
    if (
      !availableInterestCategories.some((item) => item.label === activeCategory)
    ) {
      setActiveCategory(availableInterestCategories[0].label);
    }
  }, [activeCategory, availableInterestCategories]);

  const selected = interestDetails[active.label] ?? [];
  const canSuggestPlaces = true;
  const placeCacheKey = (query: string) =>
    `${active.label}:${area}:${query.trim().toLowerCase()}`;
  const searchedPlaceSections = searchedPlaceQueries.map((query) => ({
    places: placesByQuery[placeCacheKey(query)] ?? [],
    query,
  }));

  const toggleValue = (value: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue) return;
    const nextValues = selected.includes(normalizedValue)
      ? selected.filter((item) => item !== normalizedValue)
      : [...selected, normalizedValue];
    const nextDetails = { ...interestDetails, [active.label]: nextValues };
    const summary = getInterestSummary(nextDetails);

    form.setFieldValue("interestDetails", nextDetails);
    form.setFieldValue("favoriteThings", summary.favoriteThings);
    form.setFieldValue("interests", summary.interests);
  };

  const fetchPlacesForQuery = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !canSuggestPlaces) {
      return;
    }

    const cacheKey = placeCacheKey(trimmedQuery);
    if (!selected.includes(trimmedQuery)) {
      toggleValue(trimmedQuery);
    }
    if (placesByQuery[cacheKey]) {
      setSearchedPlaceQueries([trimmedQuery]);
      return;
    }

    setIsLoadingPlaces(true);
    try {
      const res = await datingApi.suggestPlaces({
        area,
        filters: [trimmedQuery],
        latitude: (form.state.values.latitude as string) || undefined,
        longitude: (form.state.values.longitude as string) || undefined,
        searchKind: "place",
        what: [active.label.toLowerCase() as PlaceSuggestWhat],
      });
      setPlacesByQuery((current) => ({
        ...current,
        [cacheKey]: res.places || [],
      }));
      setSearchedPlaceQueries([trimmedQuery]);
    } catch (error) {
      console.error("Failed to suggest places:", error);
      toast.error("Could not find local spots for that interest.");
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  const fetchPlacesForSelected = async () => {
    const queries = selected.filter((item) => item.trim().length > 0);
    if (queries.length === 0) {
      toast.message("Choose at least one interest first.");
      return;
    }

    setIsLoadingPlaces(true);
    try {
      const entries = await Promise.all(
        queries.map(async (query) => {
          const cacheKey = placeCacheKey(query);
          if (placesByQuery[cacheKey]) {
            return [cacheKey, placesByQuery[cacheKey]] as const;
          }
          const res = await datingApi.suggestPlaces({
            area,
            filters: [query],
            latitude: (form.state.values.latitude as string) || undefined,
            longitude: (form.state.values.longitude as string) || undefined,
            searchKind: "place",
            what: [active.label.toLowerCase() as PlaceSuggestWhat],
          });
          return [cacheKey, res.places || []] as const;
        })
      );

      setPlacesByQuery((current) => ({
        ...current,
        ...Object.fromEntries(entries),
      }));
      setSearchedPlaceQueries(queries);
    } catch (error) {
      console.error("Failed to suggest places:", error);
      toast.error("Could not find local spots for those interests.");
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  const activeFavoritePlaces = favoritePlaces[active.label] ?? [];
  const watchMedia = parseWatchSearchResults(interestDetails[WATCH_MEDIA_KEY]);

  const updateWatchSelection = (result: WatchSearchResult) => {
    const fieldKey = result.kind === "show" ? "Watch_shows" : "Watch_actors";
    const currentValues = interestDetails[fieldKey] ?? [];
    const nextValues = currentValues.includes(result.name)
      ? currentValues
      : [...currentValues, result.name];
    const nextMedia =
      result.id === 0 ||
      watchMedia.some(
        (item) => item.kind === result.kind && item.id === result.id
      )
        ? watchMedia
        : [...watchMedia, result];
    const nextDetails = {
      ...interestDetails,
      Watch: interestDetails.Watch?.includes(result.name)
        ? interestDetails.Watch
        : [...(interestDetails.Watch ?? []), result.name],
      [fieldKey]: nextValues,
      [WATCH_MEDIA_KEY]: nextMedia.map((item) => JSON.stringify(item)),
    };
    const summary = getInterestSummary(nextDetails);
    form.setFieldValue("interestDetails", nextDetails);
    form.setFieldValue("favoriteThings", summary.favoriteThings);
    form.setFieldValue("interests", summary.interests);
  };

  const removeWatchSelection = (result: WatchSearchResult) => {
    const fieldKey = result.kind === "show" ? "Watch_shows" : "Watch_actors";
    const nextDetails = {
      ...interestDetails,
      Watch: (interestDetails.Watch ?? []).filter(
        (value) => value !== result.name
      ),
      [fieldKey]: (interestDetails[fieldKey] ?? []).filter(
        (value) => value !== result.name
      ),
      [WATCH_MEDIA_KEY]: watchMedia
        .filter((item) => !(item.kind === result.kind && item.id === result.id))
        .map((item) => JSON.stringify(item)),
    };
    const summary = getInterestSummary(nextDetails);
    form.setFieldValue("interestDetails", nextDetails);
    form.setFieldValue("favoriteThings", summary.favoriteThings);
    form.setFieldValue("interests", summary.interests);
  };

  const togglePlaceFavorite = (place: DatePlace) => {
    const isSelected = activeFavoritePlaces.some(
      (favoritePlace) => favoritePlace.placeId === place.placeId
    );
    const nextPlaces = isSelected
      ? activeFavoritePlaces.filter(
          (favoritePlace) => favoritePlace.placeId !== place.placeId
        )
      : [
          ...activeFavoritePlaces,
          {
            address: place.address,
            category: active.label.toLowerCase() as PlaceSuggestWhat,
            googleMapsUri: place.googleMapsUri,
            latitude: place.latitude,
            longitude: place.longitude,
            name: place.name,
            placeId: place.placeId,
            types: place.types,
          },
        ];

    form.setFieldValue("favoritePlaces", {
      ...favoritePlaces,
      [active.label]: nextPlaces,
    });
  };

  const removeFavoritePlace = (placeId: string) => {
    form.setFieldValue("favoritePlaces", {
      ...favoritePlaces,
      [active.label]: activeFavoritePlaces.filter(
        (place) => place.placeId !== placeId
      ),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        eyebrow="Interests"
        title="Give matching more signal."
        text="Chewbuu matches you based on your activities and topics. Please select or enter at least one interest for each category below."
      />

      {/* Interest substeps */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-foreground">
            Interest step{" "}
            {availableInterestCategories.findIndex(
              (category) => category.label === active.label
            ) + 1}{" "}
            of {availableInterestCategories.length}
          </span>
          <span className="text-muted-foreground">
            {
              availableInterestCategories.filter(
                (category) =>
                  getCategorySignalValues(interestDetails, category.label)
                    .length > 0
              ).length
            }{" "}
            completed
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableInterestCategories.map((category) => {
            const count = getCategorySignalValues(
              interestDetails,
              category.label
            ).length;
            const isActive = activeCategory === category.label;
            return (
              <button
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : count > 0
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-card text-muted-foreground hover:border-border-hover hover:text-foreground"
                )}
                key={category.label}
                onClick={() => {
                  setActiveCategory(category.label);
                  setIsCategoryOpen(true);
                  setPlaceSearch("");
                  setSearchedPlaceQueries([]);
                }}
                type="button"
              >
                {category.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-5 shadow-sm flex flex-col gap-4">
        <button
          className="flex items-center justify-between gap-3 text-left"
          onClick={() => setIsCategoryOpen((open) => !open)}
          type="button"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {isCategoryOpen ? "Editing" : "Review"} {active.label}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              isCategoryOpen && "rotate-180 text-primary"
            )}
          />
        </button>
        <div className={cn("flex flex-col gap-4", !isCategoryOpen && "hidden")}>
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

          {/* Collect favorite places for every interest category */}
          {canSuggestPlaces && (
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" />
                {active.label === "Watch"
                  ? "Favorite places to watch and catch shows"
                  : `Favorite local ${active.label.toLowerCase()} spots`}
                <span className="font-semibold text-muted-foreground">
                  (Optional)
                </span>
              </h4>
              <p className="mb-3 text-muted-foreground text-xs/relaxed">
                {active.label === "Watch"
                  ? `Search cinemas, theaters, stages, sports bars, and other places you like to watch around ${area}.`
                  : `Pick the signals you like, then find places around ${area}. You can also search a specific spot, city, or state when a favorite is a little outside your usual area.`}
              </p>
              {activeFavoritePlaces.length > 0 ? (
                <div className="mb-3 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {activeFavoritePlaces.map((place) => (
                      <Badge
                        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px]"
                        key={place.placeId}
                        variant="secondary"
                      >
                        {place.name}
                        <button
                          aria-label={`Remove ${place.name}`}
                          className="rounded-full p-0.5 hover:bg-muted"
                          onClick={() => removeFavoritePlace(place.placeId)}
                          type="button"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  {selected.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selected.map((item) => (
                        <Badge
                          className="rounded-full px-2.5 py-1 text-[10px]"
                          key={item}
                          variant="secondary"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <Button
                    className="w-fit rounded-full"
                    disabled={isLoadingPlaces}
                    onClick={() => void fetchPlacesForSelected()}
                    size="sm"
                    type="button"
                  >
                    Search selected {active.label.toLowerCase()} signals
                  </Button>
                </div>
              ) : selected.length > 0 ? (
                <div className="mb-3 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {selected.map((item) => (
                      <Badge
                        className="rounded-full px-2.5 py-1 text-[10px]"
                        key={item}
                        variant="secondary"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    className="w-fit rounded-full"
                    disabled={isLoadingPlaces}
                    onClick={() => void fetchPlacesForSelected()}
                    size="sm"
                    type="button"
                  >
                    Search selected {active.label.toLowerCase()} signals
                  </Button>
                </div>
              ) : (
                <p className="mb-3 rounded-2xl border border-dashed border-border bg-muted/20 p-3 text-muted-foreground text-xs">
                  Select a chip above or add your own signal, then search for
                  local places that match it.
                </p>
              )}
              <div className="flex flex-col gap-2 mb-3 sm:flex-row">
                <Input
                  className="h-10 rounded-full border border-border bg-background px-4 text-sm"
                  onChange={(e) => setPlaceSearch(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void fetchPlacesForQuery(placeSearch);
                    }
                  }}
                  placeholder='Search a spot, city, or idea. Try "Purple Onion Cabot AR"...'
                  value={placeSearch}
                />
                <Button
                  className="rounded-full"
                  disabled={isLoadingPlaces || !placeSearch.trim()}
                  onClick={() => void fetchPlacesForQuery(placeSearch)}
                  type="button"
                  variant="outline"
                >
                  Find spots
                </Button>
              </div>
              {isLoadingPlaces ? (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Searching near you...
                </p>
              ) : searchedPlaceSections.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Search selected signals or type a specific place idea to see
                  local results.
                </p>
              ) : (
                <div className="flex flex-col gap-5">
                  {searchedPlaceSections.map(({ places, query }) => (
                    <section className="flex flex-col gap-2" key={query}>
                      <div className="flex items-center justify-between gap-3">
                        <h5 className="font-bold text-xs">
                          Results for {query}
                        </h5>
                        <Badge className="rounded-full text-[10px]">
                          Showing {Math.min(places.length, 6)} of{" "}
                          {places.length}
                        </Badge>
                      </div>
                      {places.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border bg-muted/15 p-3 text-muted-foreground text-xs">
                          No spots found for {query}. Try a named place, nearby
                          city, or broader search.
                        </p>
                      ) : (
                        <ScrollArea className="w-full pb-3">
                          <div className="flex w-max gap-2">
                            {places.slice(0, 6).map((place) => {
                              const isFav = activeFavoritePlaces.some(
                                (favoritePlace) =>
                                  favoritePlace.placeId === place.placeId
                              );
                              return (
                                <button
                                  className={`flex h-20 w-64 shrink-0 items-center justify-between rounded-xl border p-3 text-left text-xs transition duration-250 sm:w-72 ${
                                    isFav
                                      ? "border-primary bg-primary/5 font-medium text-primary-foreground"
                                      : "border-border bg-card text-foreground hover:border-border-hover"
                                  }`}
                                  key={`${query}-${place.placeId}`}
                                  onClick={() => togglePlaceFavorite(place)}
                                  type="button"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-bold text-foreground">
                                      {place.name}
                                    </p>
                                    <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                                      {place.types.slice(0, 2).join(" · ") ||
                                        "Local favorite spot"}
                                    </p>
                                  </div>
                                  <Heart
                                    className={`ml-2 size-4 shrink-0 ${isFav ? "fill-primary text-primary" : "text-muted-foreground"}`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Structured Watch search with a manual fallback */}
          {active.label === "Watch" && (
            <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
              <WatchAutocomplete
                kind="show"
                label="Favorite Shows & TV"
                onAdd={updateWatchSelection}
                onRemove={(name) => {
                  const result = watchMedia.find(
                    (item) => item.kind === "show" && item.name === name
                  );
                  if (result) removeWatchSelection(result);
                  else {
                    const nextDetails = {
                      ...interestDetails,
                      Watch: (interestDetails.Watch ?? []).filter(
                        (value) => value !== name
                      ),
                      Watch_shows: (interestDetails.Watch_shows ?? []).filter(
                        (value) => value !== name
                      ),
                    };
                    const summary = getInterestSummary(nextDetails);
                    form.setFieldValue("interestDetails", nextDetails);
                    form.setFieldValue(
                      "favoriteThings",
                      summary.favoriteThings
                    );
                    form.setFieldValue("interests", summary.interests);
                  }
                }}
                selected={interestDetails.Watch_shows ?? []}
              />
              <WatchAutocomplete
                kind="person"
                label="Favorite Actors & People"
                onAdd={updateWatchSelection}
                onRemove={(name) => {
                  const result = watchMedia.find(
                    (item) => item.kind === "person" && item.name === name
                  );
                  if (result) removeWatchSelection(result);
                  else {
                    const nextDetails = {
                      ...interestDetails,
                      Watch: (interestDetails.Watch ?? []).filter(
                        (value) => value !== name
                      ),
                      Watch_actors: (interestDetails.Watch_actors ?? []).filter(
                        (value) => value !== name
                      ),
                    };
                    const summary = getInterestSummary(nextDetails);
                    form.setFieldValue("interestDetails", nextDetails);
                    form.setFieldValue(
                      "favoriteThings",
                      summary.favoriteThings
                    );
                    form.setFieldValue("interests", summary.interests);
                  }
                }}
                selected={interestDetails.Watch_actors ?? []}
              />
              <InputList
                form={form}
                fieldKey={WATCH_TOPIC_KEY}
                placeholder="Add a topic (e.g. wrestling, movies, anime)"
              />
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
        {!isCategoryOpen ? (
          <p className="text-xs text-muted-foreground">
            {selected.length} signals and {activeFavoritePlaces.length} favorite
            places saved. Open this step to edit them.
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          className="rounded-full"
          disabled={activeCategory === availableInterestCategories[0].label}
          onClick={() => {
            const currentIndex = availableInterestCategories.findIndex(
              (category) => category.label === active.label
            );
            const previous = availableInterestCategories[currentIndex - 1];
            if (previous) {
              setActiveCategory(previous.label);
              setIsCategoryOpen(true);
              setPlaceSearch("");
              setSearchedPlaceQueries([]);
            }
          }}
          type="button"
          variant="outline"
        >
          <ChevronLeft className="mr-1 size-4" />
          Previous
        </Button>
        <Button
          className="rounded-full"
          disabled={
            activeCategory === availableInterestCategories.at(-1)?.label
          }
          onClick={() => {
            const currentIndex = availableInterestCategories.findIndex(
              (category) => category.label === active.label
            );
            const next = availableInterestCategories[currentIndex + 1];
            if (next) {
              setActiveCategory(next.label);
              setIsCategoryOpen(true);
              setPlaceSearch("");
              setSearchedPlaceQueries([]);
            }
          }}
          type="button"
        >
          Next category
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
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

    const nextDetails = {
      ...form.state.values.interestDetails,
      [fieldKey]: [...currentList, val.trim()],
    };
    const summary = getInterestSummary(nextDetails);
    form.setFieldValue("interestDetails", nextDetails);
    form.setFieldValue("favoriteThings", summary.favoriteThings);
    form.setFieldValue("interests", summary.interests);
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
                  const nextDetails = {
                    ...form.state.values.interestDetails,
                    [fieldKey]: currentList.filter(
                      (value: string) => value !== item
                    ),
                  };
                  const summary = getInterestSummary(nextDetails);
                  form.setFieldValue("interestDetails", nextDetails);
                  form.setFieldValue("favoriteThings", summary.favoriteThings);
                  form.setFieldValue("interests", summary.interests);
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
      </FieldGroup>
    </div>
  );
}

function FriendsStep({ form }: { form: OnboardingFormApi }) {
  return (
    <form.Subscribe
      selector={(state) =>
        [
          state.values.friendInvites,
          state.values.maritalStatus,
          (state.values as { membershipTier?: string }).membershipTier,
          state.values.trustedContacts,
        ] as const
      }
    >
      {([friendInvites, maritalStatus, membershipTier, trustedContacts]) => {
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
        const canStartCircle =
          membershipTier === "mingle" || membershipTier === "sugar";

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
                    Tell friends about Chewbuu
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Invite up to three friends while you sign up. Mingle and
                    Sugar members can add them to a named circle for group
                    dates; Social members still get referral credit when friends
                    join Chewbuu.
                  </p>
                </div>
              </div>
              <DynamicPeopleList
                addLabel="Add friend"
                form={form}
                items={friends}
                maxItems={3}
                path="friendInvites"
                relationship="friend"
                showName={false}
              />
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/25 p-4 text-muted-foreground text-sm">
                {canStartCircle
                  ? "Your friend invites can become circle members after they create an account and finish onboarding."
                  : "You can be added to someone else's circle on Social. Upgrade later to create your own circle and move referred friends into it."}
              </div>
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

interface StripeUpgradeActions {
  stripe: {
    upgrade: (input: {
      priceId: string;
      callbackURL: string;
    }) => Promise<{ error: { message: string } | null }>;
  };
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
  const [selectedTier, setSelectedTier] =
    useState<MembershipPlan["tier"]>("mingle");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const planDetails: Record<
    MembershipPlan["tier"],
    {
      tagline: string;
      highlight: boolean;
      badge?: string;
      features: string[];
    }
  > = {
    social: {
      tagline: "Solo dating, standard speed",
      highlight: false,
      badge: "Free Forever",
      features: [
        "Create solo date requests (1 person)",
        "Max 2 booked dates per day",
        "100% verified real video intros",
        "Standard matchmaking pool",
        "Direct chat with confirmed matches",
      ],
    },
    mingle: {
      tagline: "Group hangs, parties & social circles",
      highlight: true,
      badge: "Most Popular",
      features: [
        "Go on group dates (up to 4 people)",
        "Invite friends & build social circles",
        "Match with other groups and parties",
        "Book up to 8 dates per day",
        "Unlock circle matching signals & priority discovery",
      ],
    },
    sugar: {
      tagline: "Cover dates and direct match requests",
      highlight: false,
      badge: "VIP Premium",
      features: [
        "Send direct requests to specific people",
        "Pay & cover date costs (Dutch optional)",
        "Bypass public search/fan-out pool",
        "Book up to 24 dates per day",
        "Includes all Mingle features + VIP badge",
      ],
    },
  };

  const currentPlan = plans.find((p) => p.tier === selectedTier) || {
    active: true,
    annualPriceCents: 19_000,
    annualStripePriceId: "price_mingle_annual",
    dailyDateLimit: 8,
    id: "mingle",
    monthlyPriceCents: 1900,
    name: "Mingle",
    stripePriceId: "price_mingle_monthly",
    tier: "mingle" as const,
  };

  const currentDetail = planDetails[selectedTier];

  const getPriceDisplay = (tier: MembershipPlan["tier"]) => {
    const p = plans.find((item) => item.tier === tier);
    if (tier === "social") return "Free";
    const cents = p?.monthlyPriceCents ?? (tier === "mingle" ? 1900 : 4900);
    if (billingPeriod === "monthly") {
      return `$${Math.round(cents / 100)}/mo`;
    }
    const annualPrice = Math.round((cents * 10) / 100);
    return `$${annualPrice}/yr`;
  };

  const handleFinishWithPlan = async () => {
    setIsSubmitting(true);
    if (selectedTier === "social") {
      void form.handleSubmit();
      return;
    }

    const priceId =
      billingPeriod === "monthly"
        ? currentPlan.stripePriceId
        : currentPlan.annualStripePriceId;

    if (!priceId) {
      toast.info(`Completing onboarding with ${currentPlan.name} tier.`);
      void form.handleSubmit();
      return;
    }

    try {
      toast.loading("Redirecting to checkout...", { id: "checkout" });
      const res = await (
        authClient as unknown as StripeUpgradeActions
      ).stripe.upgrade({
        priceId,
        callbackURL: `${window.location.origin}/me`,
      });
      if (res.error) {
        toast.dismiss("checkout");
        toast.error(res.error.message, { duration: 4000 });
        setIsSubmitting(false);
      }
    } catch (error) {
      toast.dismiss("checkout");
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout",
        { duration: 4000 }
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <StepIntro
          eyebrow="Upgrade Chewbuu"
          title="Pick your dating mode."
          text="Social is completely free. Upgrade to Mingle for group dates and circles, or Sugar to cover dates and send direct requests."
        />

        {/* Billing Period Toggle */}
        <div className="flex items-center self-start sm:self-end bg-muted p-1 rounded-full border border-border shadow-inner">
          <button
            type="button"
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
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
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              billingPeriod === "annual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setBillingPeriod("annual")}
          >
            Annual
            <span className="bg-primary/10 text-primary px-1 py-0.2 rounded-full text-[9px] font-bold">
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Features Box Above Selector */}
      <div className="rounded-3xl border-2 border-primary/40 bg-primary/5 p-5 sm:p-6 shadow-sm transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/15 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {currentPlan.name} Plan
              </h3>
              {currentDetail.badge && (
                <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold">
                  {currentDetail.badge}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
              {currentDetail.tagline}
            </p>
          </div>
          <div className="text-right self-start sm:self-auto">
            <span className="text-xl sm:text-2xl font-black text-primary">
              {getPriceDisplay(selectedTier)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {currentDetail.features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 text-xs sm:text-sm text-foreground"
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Check className="size-2.5" />
              </span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Compact Plan Selector Buttons / Pills */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {(["social", "mingle", "sugar"] as const).map((tier) => {
          const isSelected = selectedTier === tier;
          const planName =
            tier === "social"
              ? "Social"
              : tier === "mingle"
                ? "Mingle"
                : "Sugar";
          const priceStr = getPriceDisplay(tier);

          return (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTier(tier)}
              className={cn(
                "flex flex-col items-center justify-between rounded-2xl border-2 p-3 sm:p-4 text-center transition-all duration-200 cursor-pointer",
                isSelected
                  ? "border-primary bg-background shadow-md ring-2 ring-primary/20 scale-102"
                  : "border-border bg-card/60 hover:border-border-hover hover:bg-card"
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full border text-[9px]",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {isSelected && <Check className="size-2.5" />}
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-foreground">
                    {planName}
                  </span>
                </div>
                {tier === "mingle" && (
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wide">
                    Popular
                  </span>
                )}
              </div>
              <span className="mt-2 text-xs sm:text-sm font-semibold text-muted-foreground">
                {priceStr}
              </span>
            </button>
          );
        })}
      </div>

      {/* Completion Actions */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={handleFinishWithPlan}
          className="w-full sm:w-auto rounded-full px-8 h-11 font-bold text-sm bg-primary text-primary-foreground shadow-md hover:bg-primary/95"
        >
          <Sparkles className="size-4 mr-2" />
          {selectedTier === "social"
            ? "Finish Onboarding (Free)"
            : `Get ${currentPlan.name} & Finish (${getPriceDisplay(selectedTier)})`}
        </Button>

        {selectedTier !== "social" && (
          <button
            type="button"
            onClick={() => {
              setSelectedTier("social");
              void form.handleSubmit();
            }}
            className="text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-4 cursor-pointer bg-transparent border-0"
          >
            Or finish onboarding with Free Social
          </button>
        )}

        <button
          onClick={onFinishLater}
          className="w-fit text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0"
          type="button"
        >
          Save progress for later
        </button>
      </div>
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
            value={field.state.value || ""}
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
}: {
  accept: string;
  form: OnboardingFormApi;
  icon: typeof Camera;
  index: number;
  kind: DatingMedia["kind"];
  label: string;
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
      const url = await uploadProfileMedia(file, kind);

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
            <video
              src={value}
              controls
              playsInline
              className="w-full h-full object-cover"
            >
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
            <Button
              className="rounded-full font-semibold"
              disabled={isUploading}
              onClick={() => setIsCaptureOpen(true)}
              size="sm"
              type="button"
            >
              <Camera className="size-3.5 mr-1 inline" />
              Take Photo
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
  const mediaCaptureRef = useRef<MediaCaptureSession | null>(null);
  const recordingStopRef = useRef<(() => Promise<Blob>) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
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

  const refreshVideoDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        const activeTrackDeviceId = streamRef.current
          ?.getVideoTracks()[0]
          ?.getSettings().deviceId;
        setSelectedDeviceId(activeTrackDeviceId ?? videoInputs[0].deviceId);
      }
    } catch (error) {
      console.error("Error refreshing camera devices:", error);
    }
  }, [selectedDeviceId]);

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
      await refreshVideoDevices();
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (cameraError) {
      console.error("Camera access error:", cameraError);
      setError(
        "Camera and Microphone access are required. Please check your browser permissions."
      );
    }
  }, [clearTimer, mode, refreshVideoDevices, selectedDeviceId, stopStream]);

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

  const handleStartRecording = async () => {
    const activeStream = streamRef.current;
    if (!activeStream || isFinalizing) return;
    setRecordedUrl(null);
    setCapturedFile(null);
    setError(null);
    setCountdown(60);

    try {
      const mediaCapture = await createMediaCaptureSession(activeStream);
      mediaCaptureRef.current = mediaCapture;
      recordingStopRef.current = mediaCapture.stop;
      const monitorCapture = async () => {
        try {
          await mediaCapture.errorPromise;
        } catch (captureError: unknown) {
          if (recordingStopRef.current === mediaCapture.stop) {
            setError(
              captureError instanceof Error
                ? captureError.message
                : "Media capture failed."
            );
          }
        }
      };
      void monitorCapture();
    } catch {
      // MediaBunny relies on WebCodecs. Keep MediaRecorder as a compatibility
      // fallback for browsers that do not expose the required encoders.
      let mimeType = "";
      for (const type of [
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ]) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(activeStream, { mimeType })
        : new MediaRecorder(activeStream);
      const chunks: Blob[] = [];
      let resolveStopped: (blob: Blob) => void = () => {};
      let rejectStopped: (error: unknown) => void = () => {};
      // MediaRecorder exposes completion through events, so a promise is
      // required to make finalization awaitable.
      // eslint-disable-next-line promise/avoid-new
      const blobPromise = new Promise<Blob>((resolve, reject) => {
        resolveStopped = resolve;
        rejectStopped = reject;
      });
      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      mediaRecorder.addEventListener("error", () =>
        rejectStopped(new Error("Recording failed."))
      );
      mediaRecorder.addEventListener("stop", () => {
        if (chunks.length === 0) {
          rejectStopped(new Error("No video data was recorded."));
          return;
        }
        resolveStopped(
          new Blob(chunks, { type: mediaRecorder.mimeType || "video/webm" })
        );
      });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      recordingStopRef.current = async () => {
        if (mediaRecorder.state === "recording") mediaRecorder.stop();
        return blobPromise;
      };
    }

    setIsRecording(true);
    timerRef.current = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          void handleStopRecording();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  };

  const handleStopRecording = async () => {
    const stopRecording = recordingStopRef.current;
    if (!stopRecording) return;
    recordingStopRef.current = null;
    mediaCaptureRef.current = null;
    clearTimer();
    setIsRecording(false);
    setIsFinalizing(true);
    try {
      const blob = await stopRecording();
      if (mode === "video" && !(await hasAudioTrack(blob))) {
        throw new Error(
          "No microphone audio was captured. Check microphone permissions and try again."
        );
      }
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      setCapturedFile(createMediaFile(blob));
      stopStream();
    } catch (recordingError) {
      setError(
        recordingError instanceof Error
          ? recordingError.message
          : "No video data was recorded. Please try again."
      );
    } finally {
      setIsFinalizing(false);
    }
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

        <div className="relative mx-auto mt-4 aspect-[3/4] w-full max-w-80 overflow-hidden rounded-2xl border border-border bg-black flex items-center justify-center">
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
                playsInline
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
              onClick={() => void handleStopRecording()}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold px-6"
            >
              Stop Recording
            </Button>
          ) : (
            <Button
              onClick={handleStartRecording}
              disabled={!!error || !stream || isFinalizing}
              className="rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6"
            >
              {isFinalizing ? "Processing…" : "Start Recording"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
