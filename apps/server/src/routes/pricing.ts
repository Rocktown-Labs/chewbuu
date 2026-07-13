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

export const defaultMembershipPlans: MembershipPlan[] = [
  {
    active: true,
    annualPriceCents: 0,
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
      tier: plan.tier as MembershipPlan["tier"],
    }))
    .toSorted((a, b) => a.sortOrder - b.sortOrder);
};

const updatePlans = async (plans: z.infer<typeof planSchema>[]) => {
  if (isTestRuntime()) {
    memory.plans = plans.map((plan) => ({
      ...plan,
      id: `plan-${plan.tier}`,
      stripePriceId: plan.stripePriceId ?? "",
    }));
    return memory.plans.toSorted((a, b) => a.sortOrder - b.sortOrder);
  }

  for (const plan of plans) {
    await db
      .insert(membershipPlan)
      .values({
        ...plan,
        id: `plan-${plan.tier}`,
        stripePriceId: plan.stripePriceId || null,
      })
      .onConflictDoUpdate({
        set: {
          active: plan.active,
          annualPriceCents: plan.annualPriceCents,
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

    return c.json({
      message: env.STRIPE_SECRET_KEY
        ? "Pricing plans are ready for Stripe price syncing."
        : "Stripe secret is not configured yet. Saved Chewbuu pricing locally.",
      plans,
      stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
    });
  });

export default router;
