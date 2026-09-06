import { authClient } from "./auth-client";

export type SubscriptionCustomerType = "organization" | "user";

export interface SubscriptionSummary {
  cancelAtPeriodEnd?: boolean;
  periodEnd?: string;
  plan: string;
  referenceId: string;
  status: string;
}

export interface BillingPortalSession {
  redirect: boolean;
  url: string;
}

interface SubscriptionResult<T> {
  data?: T;
  error?: { message?: string } | null;
}

interface SubscriptionClient {
  subscription: {
    cancel: (input: {
      customerType: SubscriptionCustomerType;
      disableRedirect: boolean;
      referenceId?: string;
      returnUrl: string;
    }) => Promise<SubscriptionResult<BillingPortalSession>>;
    list: (input?: {
      query?: {
        customerType?: SubscriptionCustomerType;
        referenceId?: string;
      };
    }) => Promise<SubscriptionResult<SubscriptionSummary[]>>;
  };
}

const client = authClient as unknown as SubscriptionClient;

const getReturnUrl = (returnPath: string) => {
  const safePath = returnPath.startsWith("/") ? returnPath : "/me";
  return `${window.location.origin}${safePath}`;
};

const getErrorMessage = (error: { message?: string } | null | undefined) =>
  error?.message ?? "Could not update the subscription.";

export const subscriptionBillingApi = {
  cancel: async (input: {
    customerType: SubscriptionCustomerType;
    referenceId?: string;
    returnPath: string;
  }) => {
    const result = await client.subscription.cancel({
      customerType: input.customerType,
      disableRedirect: true,
      ...(input.referenceId ? { referenceId: input.referenceId } : {}),
      returnUrl: getReturnUrl(input.returnPath),
    });
    if (result.error) throw new Error(getErrorMessage(result.error));
    return result.data;
  },
  list: async (input: {
    customerType: SubscriptionCustomerType;
    referenceId?: string;
  }) => {
    const result = await client.subscription.list({
      query: {
        customerType: input.customerType,
        ...(input.referenceId ? { referenceId: input.referenceId } : {}),
      },
    });
    if (result.error) throw new Error(getErrorMessage(result.error));
    return result.data ?? [];
  },
};
