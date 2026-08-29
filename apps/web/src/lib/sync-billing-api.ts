import { authClient } from "./auth-client";

interface OrganizationSubscriptionActions {
  subscription: {
    upgrade: (input: {
      cancelUrl: string;
      customerType: "organization";
      plan: string;
      referenceId: string;
      successUrl: string;
    }) => Promise<{
      data?: { redirect?: boolean; url?: string };
      error?: { message: string } | null;
    }>;
  };
}

export const syncBillingApi = {
  upgrade: async (organizationId: string) => {
    const client = authClient as unknown as OrganizationSubscriptionActions;
    return client.subscription.upgrade({
      cancelUrl: `${window.location.origin}/sync?billing=cancelled`,
      customerType: "organization",
      plan: "sync",
      referenceId: organizationId,
      successUrl: `${window.location.origin}/sync?billing=success`,
    });
  },
};
