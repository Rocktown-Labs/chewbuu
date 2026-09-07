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
  values: {
    politics: string;
    religion: string;
    kids: string;
    familyPlans: string;
  };
  friends: {
    trustedName: string;
    trustedContact: string;
    friendInvite: string;
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
  values: {
    politics: "",
    religion: "",
    kids: "",
    familyPlans: "",
  },
  friends: {
    trustedName: "",
    trustedContact: "",
    friendInvite: "",
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
      friends: { ...DEFAULT_ONBOARDING_DATA.friends, ...parsed.friends },
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
      values: { ...DEFAULT_ONBOARDING_DATA.values, ...parsed.values },
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
    trustedContacts:
      data.friends.trustedName.trim() && data.friends.trustedContact.trim()
        ? [
            {
              name: data.friends.trustedName.trim(),
              contact: data.friends.trustedContact.trim(),
            },
          ]
        : [],
    friendInvites: data.friends.friendInvite.trim()
      ? [{ contact: data.friends.friendInvite.trim() }]
      : [],
    values: data.values,
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
    points += 15;
  }
  if (data.values.politics.trim().length > 0) points += 3;
  if (data.friends.trustedName.trim().length > 0) points += 2;
  return Math.min(points, 100);
}
