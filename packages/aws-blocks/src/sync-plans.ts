import type { Kysely } from "kysely";

import type { BlocksDatabase } from "./database";

export const SYNC_PLAN_CODES = [
  "sync_50",
  "sync_100",
  "sync_enterprise",
] as const;

export type SyncPlanCode = (typeof SYNC_PLAN_CODES)[number];

export interface SyncPlanEntitlement {
  code: SyncPlanCode;
  freeSpotlightsPerMonth: number;
  maxStaff: number;
}

export const DEFAULT_SYNC_PLANS: Record<SyncPlanCode, SyncPlanEntitlement> = {
  sync_50: { code: "sync_50", freeSpotlightsPerMonth: 0, maxStaff: 50 },
  sync_100: { code: "sync_100", freeSpotlightsPerMonth: 1, maxStaff: 100 },
  sync_enterprise: {
    code: "sync_enterprise",
    freeSpotlightsPerMonth: 0,
    maxStaff: 999_999,
  },
};

export const normalizeSyncPlanCode = (
  plan?: string | null
): SyncPlanCode | null => {
  if (plan === "sync") return "sync_50";
  return SYNC_PLAN_CODES.includes(plan as SyncPlanCode)
    ? (plan as SyncPlanCode)
    : null;
};

export const getSyncPlanEntitlement = async (
  db: Kysely<BlocksDatabase>,
  organizationId: string
): Promise<SyncPlanEntitlement | null> => {
  const [syncPlans, organizationSubscriptions, legacySubscriptions] =
    await Promise.all([
      db
        .selectFrom("sync_plan")
        .select(["code", "max_staff"])
        .where("active", "=", true)
        .execute()
        .catch(() => []),
      db
        .selectFrom("subscription")
        .select(["created_at", "plan", "status"])
        .where("reference_id", "=", organizationId)
        .where("status", "in", ["active", "trialing"])
        .orderBy("created_at", "desc")
        .execute()
        .catch(() => []),
      db
        .selectFrom("sync_subscription")
        .select(["created_at", "plan", "status"])
        .where("organization_id", "=", organizationId)
        .where("status", "in", ["active", "trialing"])
        .orderBy("created_at", "desc")
        .execute()
        .catch(() => []),
    ]);

  const planByCode = new Map<SyncPlanCode, SyncPlanEntitlement>(
    SYNC_PLAN_CODES.map((code) => [code, DEFAULT_SYNC_PLANS[code]])
  );
  for (const plan of syncPlans) {
    const code = normalizeSyncPlanCode(plan.code);
    if (!code) continue;
    planByCode.set(code, {
      ...DEFAULT_SYNC_PLANS[code],
      maxStaff: plan.max_staff,
    });
  }

  const subscriptions = [
    ...organizationSubscriptions,
    ...legacySubscriptions,
  ].toSorted((first, second) => {
    const firstTime = new Date(first.created_at).getTime();
    const secondTime = new Date(second.created_at).getTime();
    return secondTime - firstTime;
  });
  for (const subscription of subscriptions) {
    const code = normalizeSyncPlanCode(subscription.plan);
    if (!code) continue;
    return planByCode.get(code) ?? DEFAULT_SYNC_PLANS[code];
  }

  return null;
};
