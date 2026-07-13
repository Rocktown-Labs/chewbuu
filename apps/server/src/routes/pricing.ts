import { db } from "@chewbuu/db";
import { eq } from "@chewbuu/db/orm";
import { membershipPlan } from "@chewbuu/db/schema/dating";
import { env } from "@chewbuu/env/server";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { getAdminUser } from "../lib/admin";
import { createRouter } from "../lib/create-app";

const planSchema = z.object({
  active: z.boolean().default(true),
  annualPriceCents: z.number().int().min(0),
  annualStripePriceId: z.string().optional().or(z.literal("")),
  cta: z.string().trim().min(1),
  description: z.string().trim().min(1),
  features: z.array(z.string().trim().min(1)).default([]),
  monthlyPriceCents: z.number().int().min(0),
  name: z.string().trim().min(1),
  sortOrder: z.number().int().min(0),
  stats: z.array(z.string().trim().min(1)).default([]),
  stripePriceId: z.string().optional().or(z.literal("")),
  tier: z.enum(["social", "mingle", "sugar"]),
});

const updatePlansSchema = z.object({
  plans: z.array(planSchema).min(1),
});

type MembershipPlan = z.infer<typeof planSchema> & { id: string };
type PaidMembershipPlan = MembershipPlan & { tier: "mingle" | "sugar" };
type StripeListResponse<T> = {
  data: T[];
};
type StripeProduct = {
  id: string;
};
type StripePrice = {
  id: string;
  recurring?: {
    interval?: string;
  };
  unit_amount?: number;
};

export const defaultMembershipPlans: MembershipPlan[] = [
  {
    active: true,
    annualPriceCents: 0,
    annualStripePriceId: "",
    cta: "Keep Social",
    description: "Solo dates, Dutch by default, and two booked dates per day.",
    features: ["Solo dating", "2 booked dates daily", "Video-first matches"],
    id: "plan-social",
    monthlyPriceCents: 0,
    name: "Social",
    sortOrder: 0,
    stats: ["Free", "Solo only", "2/day"],
    stripePriceId: "",
    tier: "social",
  },
  {
    active: true,
    annualPriceCents: 19_000,
    annualStripePriceId: env.STRIPE_MINGLE_ANNUAL_PRICE_ID ?? "",
    cta: "Unlock Mingle",
    description: "Bring friends, build circles, and match with other parties.",
    features: [
      "Group dates up to 4",
      "Friend invites",
      "Circle matching signals",
    ],
    id: "plan-mingle",
    monthlyPriceCents: 1900,
    name: "Mingle",
    sortOrder: 1,
    stats: ["Groups", "Circles", "Priority matches"],
    stripePriceId: env.STRIPE_MINGLE_PRICE_ID ?? "",
    tier: "mingle",
  },
  {
    active: true,
    annualPriceCents: 39_000,
    annualStripePriceId: env.STRIPE_SUGAR_ANNUAL_PRICE_ID ?? "",
    cta: "Go Sugar",
    description:
      "Cover dates, request premium matches, and unlock every social mode.",
    features: [
      "Requester-covers dates",
      "Premium match pool",
      "All Mingle features",
    ],
    id: "plan-sugar",
    monthlyPriceCents: 3900,
    name: "Sugar",
    sortOrder: 2,
    stats: ["Highest tier", "Cover dates", "All modes"],
    stripePriceId: env.STRIPE_SUGAR_PRICE_ID ?? "",
    tier: "sugar",
  },
];

const memory = {
  plans: [...defaultMembershipPlans],
};

const isTestRuntime = () => env.NODE_ENV === "test";
const isPaidPlan = (plan: MembershipPlan): plan is PaidMembershipPlan =>
  plan.tier === "mingle" || plan.tier === "sugar";

const stripeApiFetch = async <T>(
  path: string,
  init: { body?: URLSearchParams; method?: "GET" | "POST" } = {}
) => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret is not configured.");
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    body: init.body,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(init.body
        ? { "content-type": "application/x-www-form-urlencoded" }
        : {}),
    },
    method: init.method ?? "GET",
  });
  const data = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Stripe request failed.");
  }

  return data as T;
};

const stripeProductId = (tier: PaidMembershipPlan["tier"]) =>
  `prod_chewbuu_${tier}`;

const stripeLookupKey = (
  tier: PaidMembershipPlan["tier"],
  interval: "annual" | "monthly",
  amount: number
) => {
  const base = `chewbuu_${tier}_${interval}`;

  return amount > 0 ? `${base}_${amount}` : base;
};

const stripeFallbackLookupKey = (
  tier: PaidMembershipPlan["tier"],
  interval: "annual" | "monthly"
) => `chewbuu_${tier}_${interval}`;

const ensureStripeProduct = async (plan: PaidMembershipPlan) => {
  const productId = stripeProductId(plan.tier);

  try {
    return await stripeApiFetch<StripeProduct>(`/products/${productId}`);
  } catch {
    const body = new URLSearchParams({
      description: plan.description,
      id: productId,
      name: `Chewbuu ${plan.name}`,
      "metadata[tier]": plan.tier,
    });

    return stripeApiFetch<StripeProduct>("/products", {
      body,
      method: "POST",
    });
  }
};

const findStripePriceByLookupKey = async (lookupKey: string) => {
  const params = new URLSearchParams();
  params.append("active", "true");
  params.append("lookup_keys[]", lookupKey);
  params.append("limit", "1");
  const result = await stripeApiFetch<StripeListResponse<StripePrice>>(
    `/prices?${params.toString()}`
  );

  return result.data[0] ?? null;
};

const findStripePriceById = async (
  priceId: string | undefined,
  interval: "month" | "year",
  amount: number
) => {
  if (!priceId) {
    return null;
  }

  try {
    const price = await stripeApiFetch<StripePrice>(`/prices/${priceId}`);
    const priceMatches =
      price.unit_amount === amount && price.recurring?.interval === interval;

    return priceMatches ? price : null;
  } catch {
    return null;
  }
};

const ensureStripePrice = async ({
  amount,
  existingPriceId,
  interval,
  intervalLabel,
  plan,
}: {
  amount: number;
  existingPriceId?: string;
  interval: "month" | "year";
  intervalLabel: "annual" | "monthly";
  plan: PaidMembershipPlan;
}) => {
  const existing = await findStripePriceById(existingPriceId, interval, amount);

  if (existing) {
    return existing;
  }

  const fallbackPrice = await findStripePriceByLookupKey(
    stripeFallbackLookupKey(plan.tier, intervalLabel)
  );

  if (
    fallbackPrice?.unit_amount === amount &&
    fallbackPrice.recurring?.interval === interval
  ) {
    return fallbackPrice;
  }

  const lookupKey = stripeLookupKey(plan.tier, intervalLabel, amount);
  const foundPrice = await findStripePriceByLookupKey(lookupKey);

  if (foundPrice) {
    return foundPrice;
  }

  const body = new URLSearchParams({
    currency: "usd",
    lookup_key: lookupKey,
    "metadata[billing]": intervalLabel,
    "metadata[tier]": plan.tier,
    product: stripeProductId(plan.tier),
    "recurring[interval]": interval,
    unit_amount: String(amount),
  });

  return stripeApiFetch<StripePrice>("/prices", { body, method: "POST" });
};

const syncStripePlans = async (plans: MembershipPlan[]) => {
  const syncedPlans: MembershipPlan[] = [];

  for (const plan of plans) {
    if (!isPaidPlan(plan)) {
      syncedPlans.push(plan);
      continue;
    }

    await ensureStripeProduct(plan);
    const monthlyPrice = await ensureStripePrice({
      amount: plan.monthlyPriceCents,
      existingPriceId: plan.stripePriceId,
      interval: "month",
      intervalLabel: "monthly",
      plan,
    });
    const annualPrice = await ensureStripePrice({
      amount: plan.annualPriceCents,
      existingPriceId: plan.annualStripePriceId,
      interval: "year",
      intervalLabel: "annual",
      plan,
    });

    syncedPlans.push({
      ...plan,
      annualStripePriceId: annualPrice.id,
      stripePriceId: monthlyPrice.id,
    });
  }

  return updatePlans(syncedPlans);
};

const seedPlans = async (): Promise<MembershipPlan[]> => {
  if (isTestRuntime()) {
    memory.plans = [...defaultMembershipPlans];
    return memory.plans;
  }

  for (const plan of defaultMembershipPlans) {
    await db
      .insert(membershipPlan)
      .values(plan)
      .onConflictDoUpdate({
        set: {
          active: plan.active,
          annualPriceCents: plan.annualPriceCents,
          annualStripePriceId: plan.annualStripePriceId || null,
          cta: plan.cta,
          description: plan.description,
          features: plan.features,
          monthlyPriceCents: plan.monthlyPriceCents,
          name: plan.name,
          sortOrder: plan.sortOrder,
          stats: plan.stats,
          stripePriceId: plan.stripePriceId || null,
          updatedAt: new Date(),
        },
        target: membershipPlan.tier,
      });
  }

  return listPlans();
};

const listPlans = async (): Promise<MembershipPlan[]> => {
  if (isTestRuntime()) {
    return memory.plans
      .filter((plan) => plan.active)
      .toSorted((a, b) => a.sortOrder - b.sortOrder);
  }

  const plans = await db
    .select()
    .from(membershipPlan)
    .where(eq(membershipPlan.active, true));

  if (plans.length === 0) {
    return seedPlans();
  }

  return plans
    .map((plan) => ({
      ...plan,
      stripePriceId: plan.stripePriceId ?? "",
      annualStripePriceId: plan.annualStripePriceId ?? "",
      tier: plan.tier as MembershipPlan["tier"],
    }))
    .toSorted((a, b) => a.sortOrder - b.sortOrder);
};

const updatePlans = async (plans: z.infer<typeof planSchema>[]) => {
  if (isTestRuntime()) {
    memory.plans = plans.map((plan) => ({
      ...plan,
      id: `plan-${plan.tier}`,
      annualStripePriceId: plan.annualStripePriceId ?? "",
      stripePriceId: plan.stripePriceId ?? "",
    }));
    return memory.plans.toSorted((a, b) => a.sortOrder - b.sortOrder);
  }

  for (const plan of plans) {
    await db
      .insert(membershipPlan)
      .values({
        ...plan,
        annualStripePriceId: plan.annualStripePriceId || null,
        id: `plan-${plan.tier}`,
        stripePriceId: plan.stripePriceId || null,
      })
      .onConflictDoUpdate({
        set: {
          active: plan.active,
          annualPriceCents: plan.annualPriceCents,
          annualStripePriceId: plan.annualStripePriceId || null,
          cta: plan.cta,
          description: plan.description,
          features: plan.features,
          monthlyPriceCents: plan.monthlyPriceCents,
          name: plan.name,
          sortOrder: plan.sortOrder,
          stats: plan.stats,
          stripePriceId: plan.stripePriceId || null,
          updatedAt: new Date(),
        },
        target: membershipPlan.tier,
      });
  }

  return listPlans();
};

const router = createRouter()
  .get("/pricing/plans", async (c) => {
    const plans = await listPlans();

    return c.json({ plans });
  })
  .get("/admin/pricing/plans", async (c) => {
    await getAdminUser(c.req.raw.headers);
    const plans = await listPlans();

    return c.json({ plans });
  })
  .post("/admin/pricing/seed", async (c) => {
    await getAdminUser(c.req.raw.headers);
    const plans = await seedPlans();

    return c.json({ plans }, HttpStatusCodes.CREATED);
  })
  .put("/admin/pricing/plans", async (c) => {
    await getAdminUser(c.req.raw.headers);
    const body = updatePlansSchema.parse(await c.req.json());
    const plans = await updatePlans(body.plans);

    return c.json({ plans });
  })
  .post("/admin/pricing/sync", async (c) => {
    await getAdminUser(c.req.raw.headers);
    const plans = await listPlans();

    if (!env.STRIPE_SECRET_KEY) {
      return c.json({
        message:
          "Stripe secret is not configured yet. Saved Chewbuu pricing locally.",
        plans,
        stripeConfigured: false,
      });
    }

    const syncedPlans = await syncStripePlans(plans);

    return c.json({
      message: "Stripe products and prices are synced.",
      plans: syncedPlans,
      stripeConfigured: true,
    });
  });

export default router;
