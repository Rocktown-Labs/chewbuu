export const MEMBERSHIP_TIERS = {
  mingle: {
    canCoverDutchDates: false,
    dailyDateLimit: 8,
    id: "mingle",
    name: "Mingle",
    partyLimit: 4,
  },
  social: {
    canCoverDutchDates: false,
    dailyDateLimit: 2,
    id: "social",
    name: "Social",
    partyLimit: 1,
  },
  sugar: {
    canCoverDutchDates: true,
    dailyDateLimit: 24,
    id: "sugar",
    name: "Sugar",
    partyLimit: 4,
  },
} as const;

export type MembershipTierId = keyof typeof MEMBERSHIP_TIERS;

export const DEFAULT_MEMBERSHIP_TIER = MEMBERSHIP_TIERS.social;
export const ADMIN_MEMBERSHIP_TIER = MEMBERSHIP_TIERS.sugar;

export const parseAdminEmails = (value: string | undefined) =>
  new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
