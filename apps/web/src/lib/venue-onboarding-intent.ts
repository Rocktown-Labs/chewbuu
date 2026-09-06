import type { SyncBillingInterval, SyncPlanCode } from "./sync-billing-api";

const SYNC_ONBOARDING_INTENT_KEY = "chewbuu.sync.onboarding-intent";

export interface SyncOnboardingIntent {
  cadence?: SyncBillingInterval;
  plan?: SyncPlanCode;
}

const isSyncPlanCode = (value: unknown): value is SyncPlanCode =>
  value === "sync_50" || value === "sync_100" || value === "sync_enterprise";

const isCadence = (value: unknown): value is SyncBillingInterval =>
  value === "monthly" || value === "annual";

export const markSyncOnboardingIntent = (intent: SyncOnboardingIntent = {}) => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      SYNC_ONBOARDING_INTENT_KEY,
      JSON.stringify(intent)
    );
  }
};

export const getSyncOnboardingIntent = (): SyncOnboardingIntent | null => {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(SYNC_ONBOARDING_INTENT_KEY);
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return {};
    const intent = parsed as Record<string, unknown>;
    return {
      ...(isCadence(intent.cadence) ? { cadence: intent.cadence } : {}),
      ...(isSyncPlanCode(intent.plan) ? { plan: intent.plan } : {}),
    };
  } catch {
    return {};
  }
};

export const clearSyncOnboardingIntent = () => {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SYNC_ONBOARDING_INTENT_KEY);
  }
};

export const hasSyncOnboardingIntent = () => getSyncOnboardingIntent() !== null;

export const consumeSyncOnboardingIntentDetails = () => {
  const intent = getSyncOnboardingIntent();
  clearSyncOnboardingIntent();
  return intent;
};

export const consumeSyncOnboardingIntent = () =>
  consumeSyncOnboardingIntentDetails() !== null;

export const getAuthCallbackUrl = (baseURL: string, redirectTo: string) =>
  `${baseURL}${hasSyncOnboardingIntent() ? "/venue-portal" : redirectTo}`;
