# Chewbuu Sync venue platform

## Product direction

Chewbuu uses one account and three modes: Dating, Dining, and Venue. A person can start in any mode and enable another later. Venue capabilities are organization and location based so a single independent restaurant and a multi-location enterprise use the same model.

## Venue lifecycle

1. **Discovered** — a Google Places result is used for transient discovery.
2. **Seeded** — a user contributes photos, menu links, hours, notes, or feedback.
3. **Claim requested** — a venue owner or manager asks to manage the location.
4. **Claimed** — ownership is approved and venue members can edit the workspace.
5. **Verified** — business details and operating contacts are confirmed.
6. **Connected** — the venue completes Stripe Connect onboarding for enabled money flows.
7. **Live** — reservations, dining sessions, ordering, specials, and notifications are enabled.

Google response content remains discovery data. Durable venue content comes from users, venue operators, or explicitly sourced menu previews and is labeled with provenance and verification status.

## Cold-start and referral loop

```text
User finds a favorite venue
→ contributes a useful photo, menu link, or correction
→ refers the venue to Chewbuu
→ venue claims and activates
→ venue publishes accurate information and specials
→ users follow, reserve, dine, order, and review
→ the venue becomes more valuable to the next user
```

A referral is payable only after the referred venue completes onboarding and its first paid invoice clears. The initial reward is $50, with a short refund or
chargeback hold. A future experiment may split the reward into $25 at activation and $25 after 30 days active.

The contribution system should reject duplicates, blurry or unusable media, and spam. Uploaded media needs consent, moderation, attribution, and takedown support.

## Pricing hypothesis

Pricing is per location and capability, not per staff seat:

- **Founding Venue: $59/location/month** — unlimited staff, schedules, shift swaps, venue profile, menu, hours, reservations, follows, and basic specials.
- **Venue Commerce: $149/location/month** — ordering, payment workflows, advanced promotions, operational analytics, and commerce support.
- **Enterprise: custom** — multi-location controls, centralized reporting, SSO, integrations, support, and contractual requirements.

The $59 offer is a founding-partner price, not an enterprise ceiling. Transaction
fees must be modeled separately because Stripe processing costs, refunds, disputes,
taxes, and the $50 referral reward affect margin.

## Pre-date menu preview

When a user selects a place, Chewbuu may use a transient official website URL to request a Firecrawl structured menu extraction. The preview is labeled:

> Found online — not verified by the venue.

The preview is useful for date planning and can expire. Once the venue claims the location, the operator can import the draft into an editable menu version and publish corrections. Firecrawl is an ingestion assistant, not the canonical source of truth.

## Guided vendor setup

The venue portal uses a progressive setup flow: basics, representative verification, brand and storefront assets, the venue-owned menu, then staff and launch readiness. Stripe Identity uses a Stripe-hosted redirect for document and matching-selfie checks; Chewbuu stores the session ID, status, and verified representative name only, never document images or the short-lived session URL.

Venue-owned menu items live in PostgreSQL and can include an item-linked food photo plus modifier groups and options (for example, side choices, add-ons, and preparation preferences). Firecrawl menu rows remain temporary and unverified, and cannot overwrite the operator's catalog.

## Venue operations

Better Auth Organizations is the canonical organization boundary. Venue locations remain the location-level resource, while `member` provides organization membership and `venue_member` retains location role metadata during the non-destructive bridge. This supports independent restaurants and enterprise groups without allowing a member of one organization to see another.

The first operational workflow should cover:

- organization and location records
- owner/manager/host/server/staff roles
- staff availability and shifts
- shift swap requests with manager approval
- reservation requests and table labels
- dine-now sessions with explicit user check-in
- pickup and dine-in order states
- venue follows and specials
- public feedback plus operational feedback for the venue
- immutable timing checkpoints for arrival, cooking start, food served, date ended, reservation stages, and order stages
- deterministic venue analytics from PostgreSQL event timestamps
- venue-published specials with public filtering

Location tracking must be explicit and opt-in. The product should support “I’m dining here” without requiring a date reservation.

## Timing and analytics

`venue_operational_event` is an append-only PostgreSQL ledger. Every checkpoint stores its location, optional entity references, actor, source, timestamp, and non-PII metadata. The Sync dashboard derives average arrival-to-food wait, kitchen time, date duration, completed-order cost, covers, tips, and event counts from the ledger.

Public metrics are disabled by default. A venue must opt in and meet its minimum sample threshold before average wait or cost is shown. Raw events, guest identity, staff identity, and small cohorts remain private.

Embeddings are deliberately not used for timestamp or cost analytics. A future qualitative feedback search can use a governed Postgres/vector index for redacted text themes; Upstash is not part of the architecture.

## Payments and tips

Stripe Connect onboarding is a venue capability, not an automatic side effect of claiming a listing. The initial payment architecture should support one venue per checkout, application fees, webhook-driven fulfillment, refunds, disputes, and payout readiness.

For tipping, the first version records the customer tip and a venue-configured allocation ledger (house, kitchen, service, or a tip pool). The venue can export or settle the allocation through its existing payroll process. Direct payouts to each chef or server require additional identity verification, tax, payout, dispute, and consent handling, so they remain a later capability.

Chewbuu-branded cards through Stripe Issuing/Treasury are a later financial-product track. They are not required for reservations, ordering, or venue onboarding.

## Activation metrics

### Users

- first venue followed
- first useful contribution accepted
- first menu preview opened
- first reservation or dine-now session
- first order or feedback submission
- venues referred per active contributor

### Venues

- claim started and completed
- menu published
- hours and tables configured
- staff invited
- Stripe Connect onboarding completed
- first reservation accepted
- first order paid
- first special published
- 30-day venue retention

## Shared community and brand setup

Crews and Circles intentionally use the same lifecycle as a venue:

```text
Create → add metadata and style → invite people → operate the space
```

The admin test account `camstewart7@gmail.com` is provisioned on first authenticated API use with an active Sugar test subscription and an active Sync test subscription. The grant has no Stripe IDs and is clearly a test entitlement; live billing still requires Stripe Checkout and webhook confirmation.

The official brand handles are reserved:

- Crew: `@chewbuu`
- Chewbuu Sync venue: `@chewbuusync`

These tokens cannot be claimed by ordinary user accounts, Circles, or venues. Admin-only branded creation is supported so the complete official flows can be exercised. Community and venue style metadata currently includes accent color, background color, logo URL, and tagline.

Invitations are email-backed, tokenized, and email-matched on acceptance. Existing Chewbuu users are added immediately; new recipients can accept after signing in. Venue invitations grant the configured staff role, while Circle invitations create active Circle membership.

## Rollout

1. Venue discovery, contribution, temporary menu preview, claim request, referral tracking.
2. Venue workspace with menu, media, hours, staff, shifts, and shift swaps.
3. Reservations, dine-now sessions, table labels, feedback, and specials.
4. Timing event capture, operational analytics, and public metrics.
5. Stripe Connect onboarding, ordering, tips ledger, refunds, and payouts.
6. Multi-location enterprise controls, integrations, featured listings, and Crew events.
