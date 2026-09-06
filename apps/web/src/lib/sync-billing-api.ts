import { authClient } from "./auth-client";
import {
  subscriptionBillingApi,
  type SubscriptionSummary,
} from "./subscription-billing-api";

export const SYNC_PLAN_CODES = [
  "sync_50",
  "sync_100",
  "sync_enterprise",
] as const;

export type SyncPlanCode = (typeof SYNC_PLAN_CODES)[number];
export type SyncBillingInterval = "annual" | "monthly";

interface OrganizationSubscriptionActions {
  subscription: {
    upgrade: (input: {
      annual?: boolean;
      cancelUrl: string;
      customerType: "organization";
      plan: SyncPlanCode;
      referenceId: string;
      successUrl: string;
    }) => Promise<{
      data?: { redirect?: boolean; url?: string };
      error?: { message: string } | null;
    }>;
  };
}

export const syncBillingApi = {
  cancel: async (organizationId: string, returnPath = "/sync") =>
    subscriptionBillingApi.cancel({
      customerType: "organization",
      referenceId: organizationId,
      returnPath,
    }),
  getSubscription: async (
    organizationId: string
  ): Promise<SubscriptionSummary | null> => {
    const subscriptions = await subscriptionBillingApi.list({
      customerType: "organization",
      referenceId: organizationId,
    });
    return (
      subscriptions.find((subscription) =>
        ["active", "trialing"].includes(subscription.status)
      ) ?? null
    );
  },
  upgrade: async (
    organizationId: string,
    plan: SyncPlanCode = "sync_50",
    interval: SyncBillingInterval = "monthly",
    returnPath = "/sync"
  ) => {
    const client = authClient as unknown as OrganizationSubscriptionActions;
    const encodedReturnPath = returnPath.startsWith("/") ? returnPath : "/sync";
    return client.subscription.upgrade({
      annual: interval === "annual",
      cancelUrl: `${window.location.origin}${encodedReturnPath}?billing=cancelled`,
      customerType: "organization",
      plan,
      referenceId: organizationId,
      successUrl: `${window.location.origin}${encodedReturnPath}?billing=success`,
    });
  },
};
