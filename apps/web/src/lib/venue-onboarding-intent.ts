const SYNC_ONBOARDING_INTENT_KEY = "chewbuu.sync.onboarding-intent";

export const markSyncOnboardingIntent = () => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(SYNC_ONBOARDING_INTENT_KEY, "true");
  }
};

export const hasSyncOnboardingIntent = () =>
  typeof window !== "undefined" &&
  window.sessionStorage.getItem(SYNC_ONBOARDING_INTENT_KEY) === "true";

export const consumeSyncOnboardingIntent = () => {
  const hasIntent = hasSyncOnboardingIntent();
  if (hasIntent) {
    window.sessionStorage.removeItem(SYNC_ONBOARDING_INTENT_KEY);
  }
  return hasIntent;
};

export const getAuthCallbackUrl = (baseURL: string, redirectTo: string) =>
  `${baseURL}${hasSyncOnboardingIntent() ? "/venue-portal" : redirectTo}`;
