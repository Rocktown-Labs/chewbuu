import * as SecureStore from "expo-secure-store";

export interface OnboardingData {
  step: number;
  isComplete: boolean;
  basics: {
    name: string;
    handle: string;
    age: number;
    birthday: string;
    gender: string;
    sexuality: string;
    city: string;
    bio: string;
  };
  permissions: {
    camera: boolean;
    microphone: boolean;
    push: boolean;
    location: boolean;
  };
  safetyOptIn: boolean;
  media: {
    profilePhotoUrl: string | null;
    selfieVerified: boolean;
    videoIntroDurationSeconds: number;
    videoIntroUrl: string | null;
  };
  preferences: {
    interestedIn: string[];
    minAge: number;
    maxAge: number;
    maxDistanceMiles: number;
  };
  interests: {
    eatSpots: string[];
    drinkSpots: string[];
    playActivities: string[];
    moveActivities: string[];
    watchFavorites: string[];
    talkTopics: string[];
  };
  lastSavedAt: string;
}

const STORAGE_KEY = "chewbuu_native_onboarding_draft";

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  step: 1,
  isComplete: false,
  basics: {
    name: "",
    handle: "",
    age: 0,
    birthday: "",
    gender: "",
    sexuality: "",
    city: "",
    bio: "",
  },
  permissions: {
    camera: false,
    microphone: false,
    push: false,
    location: false,
  },
  safetyOptIn: false,
  media: {
    profilePhotoUrl: null,
    selfieVerified: false,
    videoIntroDurationSeconds: 0,
    videoIntroUrl: null,
  },
  preferences: {
    interestedIn: [],
    minAge: 18,
    maxAge: 99,
    maxDistanceMiles: 25,
  },
  interests: {
    eatSpots: [],
    drinkSpots: [],
    playActivities: [],
    moveActivities: [],
    watchFavorites: [],
    talkTopics: [],
  },
  lastSavedAt: new Date().toISOString(),
};

export async function saveOnboardingDraft(
  data: Partial<OnboardingData>
): Promise<void> {
  try {
    const existing = await loadOnboardingDraft();
    const merged: OnboardingData = {
      ...existing,
      ...data,
      lastSavedAt: new Date().toISOString(),
    };
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.warn("Failed to persist onboarding draft:", error);
  }
}

export async function loadOnboardingDraft(): Promise<OnboardingData> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_ONBOARDING_DATA;
    }
    const parsed = JSON.parse(stored) as Partial<OnboardingData>;
    return {
      ...DEFAULT_ONBOARDING_DATA,
      ...parsed,
      basics: { ...DEFAULT_ONBOARDING_DATA.basics, ...parsed.basics },
      interests: { ...DEFAULT_ONBOARDING_DATA.interests, ...parsed.interests },
      media: { ...DEFAULT_ONBOARDING_DATA.media, ...parsed.media },
      permissions: {
        ...DEFAULT_ONBOARDING_DATA.permissions,
        ...parsed.permissions,
      },
      preferences: {
        ...DEFAULT_ONBOARDING_DATA.preferences,
        ...parsed.preferences,
      },
    };
  } catch (error) {
    console.warn("Failed to load onboarding draft:", error);
    return DEFAULT_ONBOARDING_DATA;
  }
}

export async function clearOnboardingDraft(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear onboarding draft:", error);
  }
}

export function toProfilePayload(data: OnboardingData) {
  const media = [
    data.media.profilePhotoUrl
      ? {
          isPrimary: true,
          kind: "profile_photo" as const,
          sortOrder: 0,
          url: data.media.profilePhotoUrl,
        }
      : null,
    data.media.videoIntroUrl
      ? {
          isPrimary: false,
          kind: "intro_video" as const,
          sortOrder: 1,
          url: data.media.videoIntroUrl,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    ageRangeMax: data.preferences.maxAge,
    ageRangeMin: data.preferences.minAge,
    area: data.basics.city,
    bio: data.basics.bio,
    birthday: data.basics.birthday,
    datingModes: ["one_on_one"],
    distanceMiles: data.preferences.maxDistanceMiles,
    favoriteThings: [
      ...data.interests.eatSpots,
      ...data.interests.drinkSpots,
      ...data.interests.playActivities,
    ],
    favoritePlaces: {},
    friendInvites: [],
    interestedIn: data.preferences.interestedIn,
    interests: [
      ...data.interests.eatSpots,
      ...data.interests.drinkSpots,
      ...data.interests.playActivities,
      ...data.interests.moveActivities,
      ...data.interests.watchFavorites,
      ...data.interests.talkTopics,
    ],
    lookingFor: ["meaningful_connection"],
    media,
    name: data.basics.name,
    safetyOptIn: data.safetyOptIn,
    sex: data.basics.gender,
    sexuality: data.basics.sexuality,
    trustedContacts: [],
    username: data.basics.handle,
  };
}

export function calculateCompletionPercentage(data: OnboardingData): number {
  if (data.isComplete) return 100;
  let points = 0;
  if (data.basics.name.trim().length > 0) points += 20;
  if (data.basics.bio.trim().length > 0) points += 10;
  if (data.permissions.camera || data.permissions.location) points += 15;
  if (data.media.selfieVerified) points += 20;
  if (data.preferences.interestedIn.length > 0) points += 15;
  if (
    data.interests.eatSpots.length > 0 ||
    data.interests.drinkSpots.length > 0
  ) {
    points += 20;
  }
  return Math.min(points, 100);
}
