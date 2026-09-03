# Stripe billing and marketplace payments

Chewbuu has two Stripe products with separate money flows:

- **Platform subscriptions:** Mingle, Sugar, and Chewbuu Sync are Better Auth Stripe subscriptions. Sync provides headcount-based organization plans: `sync_50` ($69/month or $59/month annual for up to 50 active staff), `sync_100` ($139/month or $119/month annual for up to 100 active staff with 1 free monthly Spotlight), and `sync_enterprise` ($249/month or $219/month annual for unlimited active staff and multi-branch controls).
- **Advertising & Promotions:** Chewbuu Spotlight provides venue promotional packages: Spotlight Venue ($49/week), Spotlight Event ($29/event or $89/month 4-pack), and Special Boost ($19/3 days).
- **Venue commerce:** date, dine-in, and pickup payments are platform charges. Venues and eligible workers are Connect recipient accounts. The platform retains its configured 5% fee (`STRIPE_PLATFORM_FEE_BPS = 500`) solely on the food & beverage subtotal, and passes through 100% of tips and taxes fee-free. Separate transfers are created for the venue, house tip, cook tip, and server tip allocations.

## Environment

The backend requires `STRIPE_SECRET_KEY`. Webhook signing secrets are separate:

- `STRIPE_BILLING_WEBHOOK_SECRET`
- `STRIPE_COMMERCE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_BASE_URL`
- `STRIPE_PLATFORM_FEE_BPS` (default: `500`, or 5%)

`STRIPE_WEBHOOK_SECRET` remains a temporary compatibility fallback for Better Auth billing. Stripe secret keys and signing secrets must be injected by the runtime or deployment secret manager; they must never be submitted by an admin form or committed to the repository.

## Webhook endpoints

The admin API can reconcile these endpoints without creating duplicates:

- `POST /webhooks/stripe/billing`
- `POST /webhooks/stripe/commerce`
- `POST /webhooks/stripe/connect`

Webhook handlers verify the raw body, persist the Stripe event ID before work, ignore duplicate deliveries, and process commerce/Connect events asynchronously. Better Auth remains responsible for subscription lifecycle updates.

## Venue payment flow

1. The authenticated customer or venue staff creates an order through the existing venue APIs.
2. The server reuses the persisted order total and canonical menu items, checks the venue recipient capability, validates tip allocations, and creates a hosted Checkout Session on the platform account.
3. The Checkout Session and PaymentIntent carry local order/payment/transfer group metadata and use a stable idempotency key.
4. A successful PaymentIntent marks the order paid and creates idempotent transfers from the platform balance.
5. Refunds use `reverse_transfer: true` by default. Disputes and reversals are retained in the local ledger for reconciliation.

A payment can have one venue transfer plus any number of worker tip transfers. The platform fee is calculated against the order subtotal and is excluded from tips and tax by default. Change this policy only with an accounting review.

## Connect onboarding

Venue and worker recipients use Express accounts with the recipient transfer capability. The server creates single-use hosted Account Links. Web clients may later use Account Sessions for embedded management; native iPad clients should open hosted links and rely on the status API.

Stripe Connect onboarding is separate from Stripe Identity. Identity verification cannot be treated as proof that a recipient can receive transfers.

## Local testing

Use Stripe CLI to forward events to the local raw routes, then run the catalog and webhook reconciliation operations from the admin control room. Never use a Checkout success redirect as proof of payment; use webhook-backed state.

Before enabling live commerce, confirm tax collection, tip/payout employment rules, dispute policy, worker KYC/tax reporting, and the platform merchant-of-record responsibilities with counsel and Stripe.
