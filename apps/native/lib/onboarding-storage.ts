import * as SecureStore from "expo-secure-store";

export interface OnboardingData {
  step: number;
  isComplete: boolean;
  basics: {
    name: string;
    handle: string;
    age: number;
    gender: string;
    city: string;
    bio: string;
  };
  permissions: {
    camera: boolean;
    microphone: boolean;
    push: boolean;
    location: boolean;
  };
  media: {
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
    age: 24,
    gender: "Woman",
    city: "Washington, DC",
    bio: "",
  },
  permissions: {
    camera: false,
    microphone: false,
    push: false,
    location: false,
  },
  media: {
    selfieVerified: false,
    videoIntroDurationSeconds: 0,
    videoIntroUrl: null,
  },
  preferences: {
    interestedIn: ["Men", "Everyone"],
    minAge: 21,
    maxAge: 35,
    maxDistanceMiles: 25,
  },
  interests: {
    eatSpots: ["Daikaya Ramen"],
    drinkSpots: ["Silver Lyan"],
    playActivities: ["Mini Golf", "Board Games"],
    moveActivities: ["Rock Climbing", "Running"],
    watchFavorites: ["A24 Films", "Succession"],
    talkTopics: ["Architecture", "Music", "Food"],
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
    return { ...DEFAULT_ONBOARDING_DATA, ...JSON.parse(stored) };
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
