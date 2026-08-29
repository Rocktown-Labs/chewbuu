import Stripe from "stripe";

export type StripeMode = "live" | "test";

export const STRIPE_API_VERSION = Stripe.API_VERSION;

export const getStripeMode = (secretKey: string): StripeMode => {
  if (secretKey.includes("_live_")) return "live";
  if (secretKey.includes("_test_")) return "test";
  throw new Error("Stripe secret key must be a test or live key.");
};

export const createStripeClient = (secretKey: string): Stripe => {
  getStripeMode(secretKey);
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    appInfo: {
      name: "Chewbuu",
      url: "https://chewbuu.com",
      version: "0.1.0",
    },
  });
};

export const stripeIdempotencyKey = (...parts: string[]) =>
  `chewbuu:${parts.map((part) => part.trim()).join(":")}`;

export const stripeSecretKeySchema = /^(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+$/;
export const stripeWebhookSecretSchema = /^whsec_[A-Za-z0-9]+$/;

export const stripeRequestId = (error: unknown) => {
  if (typeof error !== "object" || error === null) return;
  if (!("requestId" in error)) return;
  const { requestId } = error;
  return typeof requestId === "string" ? requestId : undefined;
};

export { Stripe };
