import { createStripeClient, stripeIdempotencyKey } from "@chewbuu/stripe";
import type Stripe from "stripe";
import { z } from "zod";

import { getDb, jsonb } from "./database";
import { calculateSettlement } from "./stripe-settlement";

const experienceKindSchema = z.enum(["date", "dine_in", "pickup"]);
const tipBeneficiaryKindSchema = z.enum(["cook", "house", "server"]);
const tipAllocationInputSchema = z.object({
  amountCents: z.number().int().positive(),
  beneficiaryKind: tipBeneficiaryKindSchema,
  beneficiaryUserId: z.string().min(1).optional(),
});

export type ExperienceKind = z.infer<typeof experienceKindSchema>;
export type TipAllocationInput = z.infer<typeof tipAllocationInputSchema>;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const getStripeClient = () => {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return createStripeClient(key);
};

const stripeWebhookDefinitions = [
  {
    connect: false,
    events: [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.deleted",
      "customer.subscription.updated",
      "invoice.paid",
      "invoice.payment_failed",
    ] as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
    path: "/webhooks/stripe/billing",
    purpose: "billing",
  },
  {
    connect: false,
    events: [
      "charge.dispute.closed",
      "charge.dispute.created",
      "charge.refunded",
      "checkout.session.async_payment_failed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.completed",
      "payment_intent.payment_failed",
      "payment_intent.succeeded",
    ] as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
    path: "/webhooks/stripe/commerce",
    purpose: "commerce",
  },
  {
    connect: true,
    events: [
      "account.application.authorized",
      "account.application.deauthorized",
      "account.updated",
      "capability.updated",
      "payout.failed",
      "payout.paid",
    ] as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
    path: "/webhooks/stripe/connect",
    purpose: "connect",
  },
] as const;

export const syncStripeWebhookEndpoints = async () => {
  const stripe = getStripeClient();
  const mode = process.env.STRIPE_SECRET_KEY?.includes("_live_")
    ? "live"
    : "test";
  const baseUrl = (
    process.env.STRIPE_WEBHOOK_BASE_URL ??
    process.env.VENUE_APP_URL ??
    "https://chewbuu.com"
  ).replace(/\/$/, "");
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const db = await getDb();
  const results = [];
  for (const definition of stripeWebhookDefinitions) {
    const url = `${baseUrl}${definition.path}`;
    const existing = endpoints.data.find((endpoint) => endpoint.url === url);
    const endpoint = existing
      ? await stripe.webhookEndpoints.update(existing.id, {
          enabled_events: definition.events,
          url,
        })
      : await stripe.webhookEndpoints.create(
          {
            connect: definition.connect,
            enabled_events: definition.events,
            url,
          },
          {
            idempotencyKey: stripeIdempotencyKey(
              "webhook-endpoint",
              mode,
              definition.purpose
            ),
          }
        );
    await db
      .insertInto("stripe_webhook_endpoint")
      .values({
        connect: definition.connect,
        created_at: new Date(),
        enabled_events: jsonb([...definition.events]),
        id: crypto.randomUUID(),
        last_verified_at: new Date(),
        mode,
        purpose: definition.purpose,
        secret_configured: Boolean(
          definition.purpose === "billing"
            ? (process.env.STRIPE_BILLING_WEBHOOK_SECRET ??
                process.env.STRIPE_WEBHOOK_SECRET)
            : definition.purpose === "commerce"
              ? process.env.STRIPE_COMMERCE_WEBHOOK_SECRET
              : process.env.STRIPE_CONNECT_WEBHOOK_SECRET
        ),
        status: endpoint.status ?? "enabled",
        stripe_endpoint_id: endpoint.id,
        updated_at: new Date(),
        url,
      })
      .onConflict((conflict) =>
        conflict.columns(["purpose", "mode"]).doUpdateSet({
          connect: definition.connect,
          enabled_events: jsonb([...definition.events]),
          last_verified_at: new Date(),
          secret_configured: Boolean(
            definition.purpose === "billing"
              ? (process.env.STRIPE_BILLING_WEBHOOK_SECRET ??
                  process.env.STRIPE_WEBHOOK_SECRET)
              : definition.purpose === "commerce"
                ? process.env.STRIPE_COMMERCE_WEBHOOK_SECRET
                : process.env.STRIPE_CONNECT_WEBHOOK_SECRET
          ),
          status: endpoint.status ?? "enabled",
          stripe_endpoint_id: endpoint.id,
          updated_at: new Date(),
          url,
        })
      )
      .execute();
    results.push({
      connect: definition.connect,
      purpose: definition.purpose,
      status: endpoint.status ?? "enabled",
      url,
    });
  }
  return { mode, endpoints: results };
};

export const getStripeIntegrationHealth = async () => {
  const db = await getDb();
  const [plans, syncPlans, endpoints, failedEvents, connectedAccounts] =
    await Promise.all([
      db
        .selectFrom("membership_plan")
        .select(["id", "stripe_sync_status"])
        .execute(),
      db.selectFrom("sync_plan").select(["id", "stripe_sync_status"]).execute(),
      db.selectFrom("stripe_webhook_endpoint").selectAll().execute(),
      db
        .selectFrom("stripe_event")
        .select("id")
        .where("status", "=", "failed")
        .execute(),
      db
        .selectFrom("stripe_connected_account")
        .select(["id", "account_kind", "transfer_capability_status"])
        .execute(),
    ]);
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return {
    catalog: {
      failed: [...plans, ...syncPlans].filter(
        (plan) => plan.stripe_sync_status === "failed"
      ).length,
      pending: [...plans, ...syncPlans].filter(
        (plan) => plan.stripe_sync_status !== "synced"
      ).length,
      synced: [...plans, ...syncPlans].filter(
        (plan) => plan.stripe_sync_status === "synced"
      ).length,
    },
    connectedAccounts: {
      total: connectedAccounts.length,
      transferReady: connectedAccounts.filter(
        (account) => account.transfer_capability_status === "active"
      ).length,
    },
    configured: Boolean(key),
    failedWebhookEvents: failedEvents.length,
    mode: key?.includes("_live_") ? "live" : key ? "test" : null,
    webhooks: endpoints.map((endpoint) => ({
      purpose: endpoint.purpose,
      secretConfigured: endpoint.secret_configured,
      status: endpoint.status,
      url: endpoint.url,
    })),
  };
};

const assertTipAllocations = (
  tipCents: number,
  input: unknown
): TipAllocationInput[] => {
  const allocations = z.array(tipAllocationInputSchema).parse(input ?? []);
  const total = allocations.reduce(
    (sum, allocation) => sum + allocation.amountCents,
    0
  );
  if (tipCents === 0 && allocations.length === 0) return [];
  if (total !== tipCents) {
    throw new Error("Tip allocations must equal the order tip.");
  }
  const workerIds = allocations.filter(
    (allocation) => allocation.beneficiaryKind !== "house"
  );
  if (workerIds.some((allocation) => !allocation.beneficiaryUserId)) {
    throw new Error("Worker tip allocations require a staff member.");
  }
  return allocations;
};

const assertOrderAccess = async (
  orderId: string,
  userId: string,
  isAdmin: boolean
) => {
  const db = await getDb();
  const order = await db
    .selectFrom("venue_order")
    .innerJoin("venue_location", "venue_location.id", "venue_order.location_id")
    .select([
      "venue_location.name as location_name",
      "venue_location.organization_id",
      "venue_location.stripe_account_id",
      "venue_order.assigned_staff_user_id",
      "venue_order.currency",
      "venue_order.experience_kind",
      "venue_order.id",
      "venue_order.location_id",
      "venue_order.payment_status",
      "venue_order.platform_fee_cents",
      "venue_order.service_customer_id",
      "venue_order.status",
      "venue_order.stripe_payment_intent_id",
      "venue_order.stripe_transfer_group",
      "venue_order.subtotal_cents",
      "venue_order.tax_cents",
      "venue_order.tip_cents",
      "venue_order.total_cents",
      "venue_order.user_id",
    ])
    .where("venue_order.id", "=", orderId)
    .executeTakeFirst();
  if (!order) throw new Error("Order not found.");

  if (isAdmin || order.user_id === userId) return order;
  const access = await db
    .selectFrom("venue_member_location")
    .select("role")
    .where("location_id", "=", order.location_id)
    .where("user_id", "=", userId)
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!access) throw new Error("Venue access required.");
  return order;
};

const getVenueRecipient = async (locationId: string) => {
  const db = await getDb();
  const recipient = await db
    .selectFrom("stripe_connected_account")
    .selectAll()
    .where("location_id", "=", locationId)
    .where("account_kind", "=", "venue")
    .where("account_status", "=", "active")
    .executeTakeFirst();
  if (!recipient) throw new Error("Venue payouts are not configured.");
  if (recipient.transfer_capability_status !== "active") {
    throw new Error("Venue payout onboarding is not complete.");
  }
  return recipient;
};

const getWorkerRecipient = async (
  organizationId: string,
  userId: string,
  locationId: string
) => {
  const db = await getDb();
  const member = await db
    .selectFrom("venue_member_location")
    .select("user_id")
    .where("location_id", "=", locationId)
    .where("user_id", "=", userId)
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!member) throw new Error("Worker is not active at this location.");
  const recipient = await db
    .selectFrom("stripe_connected_account")
    .selectAll()
    .where("organization_id", "=", organizationId)
    .where("user_id", "=", userId)
    .where("account_kind", "=", "worker")
    .where("account_status", "=", "active")
    .where((expression) =>
      expression.or([
        expression("location_id", "=", locationId),
        expression("location_id", "is", null),
      ])
    )
    .executeTakeFirst();
  if (!recipient) throw new Error("Worker payout onboarding is not complete.");
  if (recipient.transfer_capability_status !== "active") {
    throw new Error("Worker payout onboarding is not complete.");
  }
  return recipient;
};

const buildCheckoutLineItems = async (orderId: string) => {
  const db = await getDb();
  const items = await db
    .selectFrom("venue_order_item")
    .select(["name", "quantity", "unit_price_cents"])
    .where("order_id", "=", orderId)
    .orderBy("created_at", "asc")
    .execute();
  if (!items.length) throw new Error("Order has no items.");
  return items.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: { name: item.name },
      unit_amount: item.unit_price_cents,
    },
    quantity: item.quantity,
  }));
};

export const createVenueCheckoutSession = async (input: {
  cancelUrl: string;
  experienceKind?: ExperienceKind;
  isAdmin: boolean;
  orderId: string;
  successUrl: string;
  tipAllocations?: TipAllocationInput[];
  userId: string;
}) => {
  const body = {
    ...input,
    experienceKind: experienceKindSchema.parse(
      input.experienceKind ?? "dine_in"
    ),
  };
  const order = await assertOrderAccess(
    body.orderId,
    body.userId,
    body.isAdmin
  );
  if (
    order.payment_status === "paid" ||
    (order.payment_status === "processing" && order.stripe_payment_intent_id)
  ) {
    throw new Error("This order already has a payment in progress.");
  }
  if (order.status === "cancelled")
    throw new Error("Cancelled orders cannot be paid.");
  if (order.total_cents <= 0) throw new Error("Order total must be positive.");
  if (order.currency.toLowerCase() !== "usd") {
    throw new Error("Only USD venue payments are currently supported.");
  }

  const db = await getDb();
  const savedTipAllocations =
    body.tipAllocations === undefined
      ? await db
          .selectFrom("venue_tip_allocation")
          .selectAll()
          .where("order_id", "=", order.id)
          .orderBy("created_at", "asc")
          .execute()
      : [];
  const tipAllocations = assertTipAllocations(
    order.tip_cents,
    body.tipAllocations ??
      (savedTipAllocations.length
        ? savedTipAllocations.map((allocation) => ({
            amountCents: allocation.amount_cents,
            beneficiaryKind: tipBeneficiaryKindSchema.parse(
              allocation.beneficiary_kind
            ),
            ...(allocation.beneficiary_user_id
              ? { beneficiaryUserId: allocation.beneficiary_user_id }
              : {}),
          }))
        : order.tip_cents
          ? [
              {
                amountCents: order.tip_cents,
                beneficiaryKind: "house",
              },
            ]
          : [])
  );
  await getVenueRecipient(order.location_id);
  const feeBps = Math.trunc(
    Number(process.env.STRIPE_PLATFORM_FEE_BPS ?? "500")
  );
  const settlement = calculateSettlement({
    feeBps,
    subtotalCents: order.subtotal_cents,
    taxCents: order.tax_cents,
    tipAllocations,
  });
  if (settlement.venueCents < 0) {
    throw new Error("Platform fee exceeds the venue settlement amount.");
  }

  const transferGroup = order.stripe_transfer_group ?? `order:${order.id}`;
  const paymentId = crypto.randomUUID();
  const existingPayment = await db
    .selectFrom("stripe_payment")
    .selectAll()
    .where("order_id", "=", order.id)
    .executeTakeFirst();
  const payment = existingPayment ?? {
    amount_cents: order.total_cents,
    charge_id: null,
    checkout_session_id: null,
    created_at: new Date(),
    currency: order.currency.toLowerCase(),
    id: paymentId,
    livemode: process.env.STRIPE_SECRET_KEY?.includes("_live_") ?? false,
    order_id: order.id,
    payment_intent_id: null,
    platform_fee_cents: settlement.platformFeeCents,
    status: "pending",
    transfer_group: transferGroup,
    updated_at: new Date(),
  };

  if (!existingPayment) {
    await db.transaction().execute(async (tx) => {
      await tx.insertInto("stripe_payment").values(payment).execute();
      await tx
        .updateTable("venue_order")
        .set({
          experience_kind: body.experienceKind,
          payment_status: "processing",
          platform_fee_cents: settlement.platformFeeCents,
          stripe_transfer_group: transferGroup,
          updated_at: new Date(),
        })
        .where("id", "=", order.id)
        .execute();
      await tx
        .deleteFrom("venue_tip_allocation")
        .where("order_id", "=", order.id)
        .execute();
      if (tipAllocations.length) {
        await tx
          .insertInto("venue_tip_allocation")
          .values(
            tipAllocations.map((allocation) => ({
              amount_cents: allocation.amountCents,
              beneficiary_kind: allocation.beneficiaryKind,
              beneficiary_user_id: allocation.beneficiaryUserId ?? null,
              created_at: new Date(),
              id: crypto.randomUUID(),
              order_id: order.id,
              reversal_id: null,
              settled_at: null,
              status: "recorded",
              stripe_transfer_id: null,
            }))
          )
          .execute();
      }
    });
  }

  const workerAllocations = tipAllocations.filter(
    (allocation) => allocation.beneficiaryKind !== "house"
  );
  const workers = new Map<
    string,
    Awaited<ReturnType<typeof getWorkerRecipient>>
  >();
  for (const allocation of workerAllocations) {
    const workerId = allocation.beneficiaryUserId as string;
    workers.set(
      workerId,
      await getWorkerRecipient(
        order.organization_id,
        workerId,
        order.location_id
      )
    );
  }

  const lineItems = await buildCheckoutLineItems(order.id);
  if (order.tax_cents > 0) {
    lineItems.push({
      price_data: {
        currency: order.currency.toLowerCase(),
        product_data: { name: "Sales tax" },
        unit_amount: order.tax_cents,
      },
      quantity: 1,
    });
  }
  if (order.tip_cents > 0) {
    lineItems.push({
      price_data: {
        currency: order.currency.toLowerCase(),
        product_data: { name: "Tip" },
        unit_amount: order.tip_cents,
      },
      quantity: 1,
    });
  }

  const stripe = getStripeClient();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        cancel_url: body.cancelUrl,
        line_items: lineItems,
        metadata: {
          app: "chewbuu",
          experience_kind: body.experienceKind,
          order_id: order.id,
          payment_id: payment.id,
          transfer_group: transferGroup,
          venue_location_id: order.location_id,
        },
        mode: "payment",
        payment_intent_data: {
          metadata: {
            app: "chewbuu",
            order_id: order.id,
            payment_id: payment.id,
            transfer_group: transferGroup,
          },
          transfer_group: transferGroup,
        },
        success_url: body.successUrl,
      },
      { idempotencyKey: stripeIdempotencyKey("checkout", order.id) }
    );
  } catch (error) {
    await db
      .updateTable("stripe_payment")
      .set({ status: "failed", updated_at: new Date() })
      .where("id", "=", payment.id)
      .execute();
    await db
      .updateTable("venue_order")
      .set({ payment_status: "unpaid", updated_at: new Date() })
      .where("id", "=", order.id)
      .execute();
    throw error;
  }
  if (!session.url || !session.payment_intent) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  await db
    .updateTable("stripe_payment")
    .set({
      checkout_session_id: session.id,
      payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id,
      updated_at: new Date(),
    })
    .where("id", "=", payment.id)
    .execute();
  await db
    .updateTable("venue_order")
    .set({
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id,
      updated_at: new Date(),
    })
    .where("id", "=", order.id)
    .execute();

  return {
    checkoutSessionId: session.id,
    checkoutUrl: session.url,
    orderId: order.id,
    paymentId: payment.id,
    recipientCount: workers.size + 1,
    transferGroup,
  };
};

const syncConnectedAccount = async (account: Stripe.V2.Core.Account) => {
  const recipient = account.configuration?.recipient;
  const transferStatus =
    recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ??
    "inactive";
  const db = await getDb();
  const existing = await db
    .selectFrom("stripe_connected_account")
    .select(["id", "location_id", "user_id"])
    .where("stripe_account_id", "=", account.id)
    .executeTakeFirst();
  if (!existing) return;
  await db
    .updateTable("stripe_connected_account")
    .set({
      account_status: account.closed ? "closed" : "active",
      dashboard_type: account.dashboard ?? null,
      livemode: account.livemode,
      onboarding_status:
        transferStatus === "active" ? "complete" : "requires_input",
      requirements: jsonb(asRecord(account.requirements)),
      transfer_capability_status: transferStatus,
      updated_at: new Date(),
    })
    .where("id", "=", existing.id)
    .execute();
  if (existing.location_id) {
    await db
      .updateTable("venue_location")
      .set({
        stripe_account_id: account.id,
        stripe_account_updated_at: new Date(),
        stripe_onboarding_status:
          transferStatus === "active" ? "complete" : "requires_input",
        stripe_requirements: jsonb(asRecord(account.requirements)),
        stripe_transfer_capability_status: transferStatus,
        updated_at: new Date(),
      })
      .where("id", "=", existing.location_id)
      .execute();
  }
};

const createRecipientAccount = async (input: {
  accountKind: "referrer" | "venue" | "worker";
  email: string;
  locationId?: string;
  name: string;
  organizationId: string;
  userId?: string;
}) => {
  const db = await getDb();
  const existing = await db
    .selectFrom("stripe_connected_account")
    .selectAll()
    .where("account_kind", "=", input.accountKind)
    .where("organization_id", "=", input.organizationId)
    .$if(Boolean(input.locationId), (query) =>
      query.where("location_id", "=", input.locationId ?? "")
    )
    .$if(Boolean(input.userId), (query) =>
      query.where("user_id", "=", input.userId ?? "")
    )
    .executeTakeFirst();
  const stripe = getStripeClient();
  if (existing) {
    const account = await stripe.v2.core.accounts.retrieve(
      existing.stripe_account_id,
      { include: ["configuration.recipient", "requirements"] }
    );
    await syncConnectedAccount(account);
    return account;
  }

  const account = await stripe.v2.core.accounts.create(
    {
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      contact_email: input.email,
      dashboard: "express",
      defaults: {
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      display_name: input.name,
      metadata: {
        app: "chewbuu",
        account_kind: input.accountKind,
        organization_id: input.organizationId,
        ...(input.locationId ? { location_id: input.locationId } : {}),
        ...(input.userId ? { user_id: input.userId } : {}),
      },
    },
    {
      idempotencyKey: stripeIdempotencyKey(
        "connect-account",
        input.accountKind,
        input.organizationId,
        input.userId ?? input.locationId ?? ""
      ),
    }
  );
  await db
    .insertInto("stripe_connected_account")
    .values({
      account_kind: input.accountKind,
      account_status: "active",
      created_at: new Date(),
      dashboard_type: account.dashboard ?? "express",
      id: crypto.randomUUID(),
      livemode: account.livemode,
      location_id: input.locationId ?? null,
      metadata: jsonb({ app: "chewbuu" }),
      onboarding_status: "requires_input",
      organization_id: input.organizationId,
      requirements: jsonb(asRecord(account.requirements)),
      stripe_account_id: account.id,
      transfer_capability_status:
        account.configuration?.recipient?.capabilities?.stripe_balance
          ?.stripe_transfers?.status ?? "pending",
      updated_at: new Date(),
      user_id: input.userId ?? null,
    })
    .onConflict((conflict) => conflict.column("stripe_account_id").doNothing())
    .execute();
  await syncConnectedAccount(account);
  return account;
};

const createAccountLink = async (accountId: string, returnPath: string) => {
  const baseUrl = (process.env.VENUE_APP_URL ?? "https://chewbuu.com").replace(
    /\/$/,
    ""
  );
  const buildReturnUrl = (state: string) => {
    const url = new URL(returnPath, baseUrl);
    url.searchParams.set("stripe", state);
    return url.toString();
  };
  const stripe = getStripeClient();
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: buildReturnUrl("refresh"),
        return_url: buildReturnUrl("complete"),
      },
      type: "account_onboarding",
    },
  });
  return { expiresAt: link.expires_at, url: link.url };
};

const accountResponse = (account: Stripe.V2.Core.Account) => ({
  accountId: account.id,
  dashboard: account.dashboard ?? null,
  livemode: account.livemode,
  requirements: asRecord(account.requirements),
  transferCapabilityStatus:
    account.configuration?.recipient?.capabilities?.stripe_balance
      ?.stripe_transfers?.status ?? "inactive",
});

export const createReferrerConnectOnboarding = async (input: {
  actorUserId: string;
  isAdmin: boolean;
  locationId: string;
}) => {
  const db = await getDb();
  const referral = await db
    .selectFrom("venue_referral")
    .innerJoin(
      "venue_location",
      "venue_location.id",
      "venue_referral.location_id"
    )
    .innerJoin("user", "user.id", "venue_referral.referrer_user_id")
    .select([
      "user.email",
      "user.name",
      "venue_location.organization_id",
      "venue_referral.location_id",
      "venue_referral.referrer_user_id",
    ])
    .where("venue_referral.location_id", "=", input.locationId)
    .where("venue_referral.referrer_user_id", "=", input.actorUserId)
    .executeTakeFirst();
  if (!referral && !input.isAdmin) {
    throw new Error("Referral access required.");
  }
  const referralForAdmin =
    referral ??
    (await db
      .selectFrom("venue_referral")
      .innerJoin(
        "venue_location",
        "venue_location.id",
        "venue_referral.location_id"
      )
      .innerJoin("user", "user.id", "venue_referral.referrer_user_id")
      .select([
        "user.email",
        "user.name",
        "venue_location.organization_id",
        "venue_referral.location_id",
        "venue_referral.referrer_user_id",
      ])
      .where("venue_referral.location_id", "=", input.locationId)
      .executeTakeFirst());
  if (!referralForAdmin) throw new Error("Referral not found.");
  const account = await createRecipientAccount({
    accountKind: "referrer",
    email: referralForAdmin.email,
    locationId: referralForAdmin.location_id,
    name: referralForAdmin.name,
    organizationId: referralForAdmin.organization_id,
    userId: referralForAdmin.referrer_user_id,
  });
  const link = await createAccountLink(
    account.id,
    `/venues?referralLocationId=${encodeURIComponent(input.locationId)}`
  );
  return { ...accountResponse(account), ...link };
};

export const createVenueConnectOnboarding = async (input: {
  email: string;
  isAdmin: boolean;
  locationId: string;
  name: string;
  userId: string;
}) => {
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select(["id", "organization_id", "submitted_by_user_id"])
    .where("id", "=", input.locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found.");
  if (!input.isAdmin && location.submitted_by_user_id !== input.userId) {
    const member = await db
      .selectFrom("venue_member_location")
      .select("role")
      .where("location_id", "=", input.locationId)
      .where("user_id", "=", input.userId)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!member || !["lead", "manager", "owner"].includes(member.role)) {
      throw new Error("Venue manager access required.");
    }
  }
  const account = await createRecipientAccount({
    accountKind: "venue",
    email: input.email,
    locationId: location.id,
    name: input.name,
    organizationId: location.organization_id,
  });
  const link = await createAccountLink(
    account.id,
    `/venue-portal?locationId=${encodeURIComponent(location.id)}`
  );
  return { ...accountResponse(account), ...link };
};

export const createWorkerConnectOnboarding = async (input: {
  actorUserId: string;
  isAdmin: boolean;
  locationId: string;
  workerUserId: string;
}) => {
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select(["id", "organization_id"])
    .where("id", "=", input.locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found.");
  if (!input.isAdmin && input.actorUserId !== input.workerUserId) {
    const manager = await db
      .selectFrom("venue_member_location")
      .select("role")
      .where("location_id", "=", input.locationId)
      .where("user_id", "=", input.actorUserId)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!manager || !["lead", "manager", "owner"].includes(manager.role)) {
      throw new Error("Venue manager access required.");
    }
  }
  const worker = await db
    .selectFrom("user")
    .select(["email", "name"])
    .where("id", "=", input.workerUserId)
    .executeTakeFirst();
  if (!worker) throw new Error("Worker not found.");
  const account = await createRecipientAccount({
    accountKind: "worker",
    email: worker.email,
    locationId: location.id,
    name: worker.name,
    organizationId: location.organization_id,
    userId: input.workerUserId,
  });
  const link = await createAccountLink(
    account.id,
    `/sync?locationId=${encodeURIComponent(location.id)}`
  );
  return { ...accountResponse(account), ...link };
};

export const getVenueConnectStatus = async (input: {
  isAdmin: boolean;
  locationId: string;
  userId: string;
}) => {
  const db = await getDb();
  const location = await db
    .selectFrom("venue_location")
    .select(["id", "organization_id", "stripe_account_id"])
    .where("id", "=", input.locationId)
    .executeTakeFirst();
  if (!location) throw new Error("Venue not found.");
  if (!input.isAdmin) {
    const member = await db
      .selectFrom("venue_member_location")
      .select("role")
      .where("location_id", "=", input.locationId)
      .where("user_id", "=", input.userId)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!member) throw new Error("Venue access required.");
  }
  const account = await db
    .selectFrom("stripe_connected_account")
    .selectAll()
    .where("location_id", "=", location.id)
    .where("account_kind", "=", "venue")
    .executeTakeFirst();
  return {
    accountId: account?.stripe_account_id ?? location.stripe_account_id ?? null,
    onboardingStatus: account?.onboarding_status ?? "not_started",
    requirements: account?.requirements ?? {},
    transferCapabilityStatus: account?.transfer_capability_status ?? "inactive",
  };
};

export const getStripePayment = async (
  orderId: string,
  userId: string,
  isAdmin: boolean
) => {
  await assertOrderAccess(orderId, userId, isAdmin);
  const db = await getDb();
  const payment = await db
    .selectFrom("stripe_payment")
    .selectAll()
    .where("order_id", "=", orderId)
    .executeTakeFirst();
  if (!payment) return null;
  const transfers = await db
    .selectFrom("stripe_transfer")
    .selectAll()
    .where("payment_id", "=", payment.id)
    .orderBy("created_at", "asc")
    .execute();
  return { payment, transfers };
};

const reverseTransfers = async (input: {
  amountCents: number;
  paymentId: string;
  reason: string;
}) => {
  const db = await getDb();
  const stripe = getStripeClient();
  const transfers = await db
    .selectFrom("stripe_transfer")
    .selectAll()
    .where("payment_id", "=", input.paymentId)
    .where("status", "in", ["created", "partially_reversed"])
    .orderBy("created_at", "asc")
    .execute();
  let remaining = input.amountCents;
  for (const transfer of transfers) {
    if (remaining <= 0 || !transfer.stripe_transfer_id) break;
    const reversals = await db
      .selectFrom("stripe_transfer_reversal")
      .select("amount_cents")
      .where("transfer_id", "=", transfer.id)
      .execute();
    const reversedCents = reversals.reduce(
      (total, reversal) => total + reversal.amount_cents,
      0
    );
    const available = transfer.amount_cents - reversedCents;
    if (available <= 0) continue;
    const amount = Math.min(remaining, available);
    const reversal = await stripe.transfers.createReversal(
      transfer.stripe_transfer_id,
      {
        amount,
        metadata: {
          app: "chewbuu",
          payment_id: input.paymentId,
          reason: input.reason,
          transfer_id: transfer.id,
        },
      },
      {
        idempotencyKey: stripeIdempotencyKey(
          "transfer-reversal",
          input.reason,
          transfer.id,
          String(amount)
        ),
      }
    );
    await db
      .insertInto("stripe_transfer_reversal")
      .values({
        amount_cents: amount,
        created_at: new Date(),
        id: crypto.randomUUID(),
        reason: input.reason,
        stripe_reversal_id: reversal.id,
        transfer_id: transfer.id,
      })
      .onConflict((conflict) =>
        conflict.column("stripe_reversal_id").doNothing()
      )
      .execute();
    const nextStatus = amount >= available ? "reversed" : "partially_reversed";
    await db
      .updateTable("stripe_transfer")
      .set({
        reversal_id: reversal.id,
        status: nextStatus,
        updated_at: new Date(),
      })
      .where("id", "=", transfer.id)
      .execute();
    if (transfer.tip_allocation_id && amount >= available) {
      await db
        .updateTable("venue_tip_allocation")
        .set({
          reversal_id: reversal.id,
          status: "reversed",
        })
        .where("id", "=", transfer.tip_allocation_id)
        .execute();
    }
    remaining -= amount;
  }
  return { remaining };
};

export const createVenueRefund = async (input: {
  amountCents?: number;
  isAdmin: boolean;
  orderId: string;
  reason?: string;
  userId: string;
}) => {
  const order = await assertOrderAccess(
    input.orderId,
    input.userId,
    input.isAdmin
  );
  if (!input.isAdmin) {
    const db = await getDb();
    const manager = await db
      .selectFrom("venue_member_location")
      .select("role")
      .where("location_id", "=", order.location_id)
      .where("user_id", "=", input.userId)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!manager || !["lead", "manager", "owner"].includes(manager.role)) {
      throw new Error("Venue manager access required to issue refunds.");
    }
  }
  const db = await getDb();
  const payment = await db
    .selectFrom("stripe_payment")
    .selectAll()
    .where("order_id", "=", input.orderId)
    .executeTakeFirst();
  if (!payment?.payment_intent_id) throw new Error("No Stripe payment found.");
  if (payment.status !== "succeeded")
    throw new Error("Payment is not refundable.");
  const amountCents = input.amountCents ?? payment.amount_cents;
  const refunds = await db
    .selectFrom("stripe_refund")
    .select("amount_cents")
    .where("payment_id", "=", payment.id)
    .execute();
  const alreadyRefundedCents = refunds.reduce(
    (total, refund) => total + refund.amount_cents,
    0
  );
  if (
    amountCents <= 0 ||
    amountCents > payment.amount_cents - alreadyRefundedCents
  ) {
    throw new Error("Refund amount is invalid.");
  }
  const stripe = getStripeClient();
  const refund = await stripe.refunds.create(
    {
      amount: amountCents,
      metadata: {
        app: "chewbuu",
        order_id: order.id,
        payment_id: payment.id,
        reason: input.reason ?? "requested",
      },
      payment_intent: payment.payment_intent_id,
      refund_application_fee: false,
    },
    {
      idempotencyKey: stripeIdempotencyKey(
        "refund",
        payment.id,
        String(amountCents)
      ),
    }
  );
  await db
    .insertInto("stripe_refund")
    .values({
      amount_cents: amountCents,
      created_at: new Date(),
      id: crypto.randomUUID(),
      payment_id: payment.id,
      refund_application_fee: false,
      reverse_transfer: false,
      status: refund.status ?? "pending",
      stripe_refund_id: refund.id,
      updated_at: new Date(),
    })
    .onConflict((conflict) => conflict.column("stripe_refund_id").doNothing())
    .execute();
  const transferReversal = await reverseTransfers({
    amountCents,
    paymentId: payment.id,
    reason: `refund:${refund.id}`,
  });
  return {
    amountCents,
    refundId: refund.id,
    status: refund.status,
    transferReversalRemaining: transferReversal.remaining,
  };
};

export const settleSyncReferralReward = async (event: Stripe.Event) => {
  if (event.type !== "invoice.paid") return;
  const object = getStripeObject(event);
  const stripeSubscriptionId = getStripeString(object.subscription);
  const stripeCustomerId = getStripeString(object.customer);
  if (!stripeSubscriptionId && !stripeCustomerId) return;
  const db = await getDb();
  let subscription = stripeSubscriptionId
    ? await db
        .selectFrom("subscription")
        .select(["reference_id"])
        .where("stripe_subscription_id", "=", stripeSubscriptionId)
        .where("plan", "=", "sync")
        .executeTakeFirst()
    : undefined;
  if (!subscription && stripeCustomerId) {
    subscription = await db
      .selectFrom("subscription")
      .select(["reference_id"])
      .where("stripe_customer_id", "=", stripeCustomerId)
      .where("plan", "=", "sync")
      .executeTakeFirst();
  }
  if (!subscription) return;
  const referral = await db
    .selectFrom("venue_referral")
    .innerJoin(
      "venue_location",
      "venue_location.id",
      "venue_referral.location_id"
    )
    .select([
      "venue_referral.id",
      "venue_referral.referrer_user_id",
      "venue_referral.reward_amount_cents",
      "venue_referral.status",
    ])
    .where("venue_location.organization_id", "=", subscription.reference_id)
    .where("venue_referral.paid_at", "is", null)
    .where("venue_referral.status", "in", ["referred", "payable"])
    .orderBy("venue_referral.created_at", "asc")
    .executeTakeFirst();
  if (!referral) return;
  const account = await db
    .selectFrom("stripe_connected_account")
    .select(["id", "stripe_account_id", "transfer_capability_status"])
    .where("account_kind", "=", "referrer")
    .where("user_id", "=", referral.referrer_user_id)
    .where("account_status", "=", "active")
    .executeTakeFirst();
  if (!account || account.transfer_capability_status !== "active") {
    await db
      .updateTable("venue_referral")
      .set({ status: "payable", updated_at: new Date() })
      .where("id", "=", referral.id)
      .execute();
    return;
  }
  const transfer = await getStripeClient().transfers.create(
    {
      amount: referral.reward_amount_cents,
      currency: "usd",
      destination: account.stripe_account_id,
      metadata: {
        app: "chewbuu",
        kind: "venue_referral_reward",
        referral_id: referral.id,
      },
      transfer_group: `referral:${referral.id}`,
    },
    { idempotencyKey: stripeIdempotencyKey("referral-reward", referral.id) }
  );
  await db
    .updateTable("venue_referral")
    .set({
      paid_at: new Date(),
      reward_payout_id: transfer.id,
      status: "paid",
      updated_at: new Date(),
    })
    .where("id", "=", referral.id)
    .where("paid_at", "is", null)
    .execute();
};

const getStripeObject = (event: Stripe.Event) => asRecord(event.data.object);

const getStripeString = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const findPaymentByStripeId = async (input: {
  chargeId?: string;
  paymentIntentId?: string;
}) => {
  const db = await getDb();
  let query = db.selectFrom("stripe_payment").selectAll();
  if (input.paymentIntentId) {
    query = query.where("payment_intent_id", "=", input.paymentIntentId);
  } else if (input.chargeId) {
    query = query.where("charge_id", "=", input.chargeId);
  } else {
    return;
  }
  return query.executeTakeFirst();
};

const createPendingTransfers = async (paymentId: string) => {
  const db = await getDb();
  const payment = await db
    .selectFrom("stripe_payment")
    .selectAll()
    .where("id", "=", paymentId)
    .executeTakeFirst();
  if (!payment) throw new Error("Stripe payment not found.");
  const order = await db
    .selectFrom("venue_order")
    .selectAll()
    .where("id", "=", payment.order_id)
    .executeTakeFirstOrThrow();
  const venueRecipient = await getVenueRecipient(order.location_id);
  const location = await db
    .selectFrom("venue_location")
    .select("organization_id")
    .where("id", "=", order.location_id)
    .executeTakeFirstOrThrow();
  const allocations = await db
    .selectFrom("venue_tip_allocation")
    .selectAll()
    .where("order_id", "=", order.id)
    .orderBy("created_at", "asc")
    .execute();
  const feeBps = Math.trunc(
    Number(process.env.STRIPE_PLATFORM_FEE_BPS ?? "500")
  );
  const settlement = calculateSettlement({
    feeBps,
    subtotalCents: order.subtotal_cents,
    taxCents: order.tax_cents,
    tipAllocations: allocations.map((allocation) => ({
      amountCents: allocation.amount_cents,
      beneficiaryKind: tipBeneficiaryKindSchema.parse(
        allocation.beneficiary_kind
      ),
      ...(allocation.beneficiary_user_id
        ? { beneficiaryUserId: allocation.beneficiary_user_id }
        : {}),
    })),
  });
  const transferRows: {
    amount_cents: number;
    connected_account_id: string;
    created_at: Date;
    currency: string;
    id: string;
    idempotency_key: string;
    kind: string;
    payment_id: string;
    reversal_id: null;
    status: string;
    stripe_transfer_id: null;
    tip_allocation_id: string | null;
    updated_at: Date;
  }[] = [];
  if (settlement.venueCents > 0) {
    transferRows.push({
      amount_cents: settlement.venueCents,
      connected_account_id: venueRecipient.id,
      created_at: new Date(),
      currency: payment.currency,
      id: crypto.randomUUID(),
      idempotency_key: stripeIdempotencyKey("transfer", payment.id, "venue"),
      kind: "venue_settlement",
      payment_id: payment.id,
      reversal_id: null,
      status: "pending",
      stripe_transfer_id: null,
      tip_allocation_id: null,
      updated_at: new Date(),
    });
  }
  for (const allocation of allocations) {
    if (allocation.beneficiary_kind === "house") continue;
    const userId = allocation.beneficiary_user_id;
    if (!userId) throw new Error("Worker tip allocation is missing a user.");
    const recipient = await getWorkerRecipient(
      location.organization_id,
      userId,
      order.location_id
    );
    transferRows.push({
      amount_cents: allocation.amount_cents,
      connected_account_id: recipient.id,
      created_at: new Date(),
      currency: payment.currency,
      id: crypto.randomUUID(),
      idempotency_key: stripeIdempotencyKey(
        "transfer",
        payment.id,
        allocation.id
      ),
      kind: "worker_tip",
      payment_id: payment.id,
      reversal_id: null,
      status: "pending",
      stripe_transfer_id: null,
      tip_allocation_id: allocation.id,
      updated_at: new Date(),
    });
  }
  for (const row of transferRows) {
    await db
      .insertInto("stripe_transfer")
      .values(row)
      .onConflict((conflict) => conflict.column("idempotency_key").doNothing())
      .execute();
  }
  return {
    payment,
    transferRows: await db
      .selectFrom("stripe_transfer")
      .selectAll()
      .where("payment_id", "=", payment.id)
      .orderBy("created_at", "asc")
      .execute(),
  };
};

export const settleStripePayment = async (paymentId: string) => {
  const db = await getDb();
  const payment = await db
    .selectFrom("stripe_payment")
    .selectAll()
    .where("id", "=", paymentId)
    .executeTakeFirst();
  if (!payment) throw new Error("Stripe payment not found.");
  if (!payment.payment_intent_id) throw new Error("PaymentIntent is missing.");
  const stripe = getStripeClient();
  const intent = await stripe.paymentIntents.retrieve(
    payment.payment_intent_id
  );
  if (intent.status !== "succeeded") {
    await db
      .updateTable("stripe_payment")
      .set({ status: intent.status, updated_at: new Date() })
      .where("id", "=", payment.id)
      .execute();
    return { status: intent.status, transferCount: 0 };
  }
  const chargeId = getStripeString(intent.latest_charge);
  await db
    .updateTable("stripe_payment")
    .set({
      charge_id: chargeId ?? payment.charge_id,
      status: "succeeded",
      updated_at: new Date(),
    })
    .where("id", "=", payment.id)
    .execute();
  await db
    .updateTable("venue_order")
    .set({ payment_status: "paid", updated_at: new Date() })
    .where("id", "=", payment.order_id)
    .execute();

  const { transferRows } = await createPendingTransfers(payment.id);
  for (const row of transferRows) {
    if (row.status === "created") continue;
    const recipient = await db
      .selectFrom("stripe_connected_account")
      .select("stripe_account_id")
      .where("id", "=", row.connected_account_id)
      .executeTakeFirstOrThrow();
    const transfer = await stripe.transfers.create(
      {
        amount: row.amount_cents,
        currency: row.currency,
        destination: recipient.stripe_account_id,
        metadata: {
          app: "chewbuu",
          kind: row.kind,
          payment_id: payment.id,
          transfer_group: payment.transfer_group,
        },
        ...(chargeId ? { source_transaction: chargeId } : {}),
        transfer_group: payment.transfer_group,
      },
      { idempotencyKey: row.idempotency_key }
    );
    await db
      .updateTable("stripe_transfer")
      .set({
        status: "created",
        stripe_transfer_id: transfer.id,
        updated_at: new Date(),
      })
      .where("id", "=", row.id)
      .execute();
    if (row.tip_allocation_id) {
      await db
        .updateTable("venue_tip_allocation")
        .set({
          settled_at: new Date(),
          status: "settled",
          stripe_transfer_id: transfer.id,
        })
        .where("id", "=", row.tip_allocation_id)
        .execute();
    }
  }
  return { status: "succeeded", transferCount: transferRows.length };
};

export type StripeWebhookKind = "billing" | "commerce" | "connect";

export const ingestStripeWebhookEvent = async (input: {
  body: string;
  kind: StripeWebhookKind;
  secret: string;
  signature: string;
}) => {
  const stripe = getStripeClient();
  const event = stripe.webhooks.constructEvent(
    input.body,
    input.signature,
    input.secret
  );
  const db = await getDb();
  const now = new Date();
  const inserted = await db
    .insertInto("stripe_event")
    .values({
      attempt_count: 0,
      created_at: now,
      error_message: null,
      event_type: event.type,
      id: crypto.randomUUID(),
      livemode: event.livemode,
      payload: jsonb(event),
      processed_at: null,
      received_at: now,
      status: "received",
      stripe_account_id: event.account ?? null,
      stripe_event_id: event.id,
      updated_at: now,
      webhook_kind: input.kind,
    })
    .onConflict((conflict) => conflict.column("stripe_event_id").doNothing())
    .returning("id")
    .executeTakeFirst();
  const existing = inserted
    ? undefined
    : await db
        .selectFrom("stripe_event")
        .select(["id", "status"])
        .where("stripe_event_id", "=", event.id)
        .executeTakeFirst();
  return {
    duplicate: Boolean(existing),
    event,
    eventId: inserted?.id ?? existing?.id,
    status: inserted ? "received" : existing?.status,
  };
};

export const processStripeWebhookEvent = async (eventId: string) => {
  const db = await getDb();
  const stored = await db
    .selectFrom("stripe_event")
    .selectAll()
    .where("id", "=", eventId)
    .executeTakeFirstOrThrow();
  if (stored.status === "processed") return;
  const event = stored.payload as unknown as Stripe.Event;
  try {
    const object = getStripeObject(event);
    if (stored.webhook_kind === "billing") {
      await settleSyncReferralReward(event);
    }
    if (stored.webhook_kind === "commerce") {
      const paymentId =
        getStripeString(object.payment_id) ??
        getStripeString(
          object.metadata && asRecord(object.metadata).payment_id
        );
      if (
        paymentId &&
        [
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
          "payment_intent.succeeded",
        ].includes(event.type)
      ) {
        await settleStripePayment(paymentId);
      }
      if (
        paymentId &&
        [
          "checkout.session.async_payment_failed",
          "payment_intent.payment_failed",
        ].includes(event.type)
      ) {
        const payment = await db
          .selectFrom("stripe_payment")
          .select("order_id")
          .where("id", "=", paymentId)
          .executeTakeFirst();
        await db
          .updateTable("stripe_payment")
          .set({ status: "failed", updated_at: new Date() })
          .where("id", "=", paymentId)
          .execute();
        if (payment) {
          await db
            .updateTable("venue_order")
            .set({ payment_status: "unpaid", updated_at: new Date() })
            .where("id", "=", payment.order_id)
            .execute();
        }
      }
      if (event.type === "charge.refunded") {
        const payment = await findPaymentByStripeId({
          chargeId: getStripeString(object.id),
          paymentIntentId: getStripeString(object.payment_intent),
        });
        if (payment) {
          const amountRefunded =
            typeof object.amount_refunded === "number"
              ? object.amount_refunded
              : payment.amount_cents;
          await db
            .updateTable("stripe_payment")
            .set({
              status:
                amountRefunded >= payment.amount_cents
                  ? "refunded"
                  : "partially_refunded",
              updated_at: new Date(),
            })
            .where("id", "=", payment.id)
            .execute();
        }
      }
      if (event.type === "charge.dispute.closed") {
        const disputeId = getStripeString(object.id);
        if (disputeId) {
          await db
            .updateTable("stripe_dispute")
            .set({
              status: getStripeString(object.status) ?? "closed",
              updated_at: new Date(),
            })
            .where("stripe_dispute_id", "=", disputeId)
            .execute();
        }
      }
      if (event.type === "charge.dispute.created") {
        const payment = await findPaymentByStripeId({
          chargeId: getStripeString(object.id),
        });
        const disputeId = getStripeString(object.id) ?? event.id;
        await db
          .insertInto("stripe_dispute")
          .values({
            amount_cents: typeof object.amount === "number" ? object.amount : 0,
            created_at: new Date(),
            due_by:
              typeof object.evidence_details === "object" &&
              object.evidence_details !== null
                ? new Date(
                    String(asRecord(object.evidence_details).due_by ?? "")
                  )
                : null,
            id: crypto.randomUUID(),
            payment_id: payment?.id ?? null,
            reason: getStripeString(object.reason) ?? null,
            status: getStripeString(object.status) ?? "needs_response",
            stripe_dispute_id: disputeId,
            updated_at: new Date(),
          })
          .onConflict((conflict) =>
            conflict.column("stripe_dispute_id").doNothing()
          )
          .execute();
        if (payment) {
          await reverseTransfers({
            amountCents:
              typeof object.amount === "number"
                ? object.amount
                : payment.amount_cents,
            paymentId: payment.id,
            reason: `dispute:${disputeId}`,
          });
        }
      }
    }
    if (
      stored.webhook_kind === "connect" &&
      ["account.updated", "capability.updated"].includes(event.type)
    ) {
      const accountId = event.account ?? getStripeString(object.account);
      if (accountId) {
        const account = await getStripeClient().v2.core.accounts.retrieve(
          accountId,
          { include: ["configuration.recipient", "requirements"] }
        );
        await syncConnectedAccount(account);
      }
    }
    await db
      .updateTable("stripe_event")
      .set({
        processed_at: new Date(),
        status: "processed",
        updated_at: new Date(),
      })
      .where("id", "=", eventId)
      .execute();
  } catch (error) {
    await db
      .updateTable("stripe_event")
      .set({
        attempt_count: stored.attempt_count + 1,
        error_message:
          error instanceof Error
            ? error.message
            : "Unknown Stripe webhook error.",
        status: "failed",
        updated_at: new Date(),
      })
      .where("id", "=", eventId)
      .execute();
    throw error;
  }
};
