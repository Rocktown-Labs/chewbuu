# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added pinned Portless development routing for the web, dating Expo, Sync Expo, and email preview apps with named URLs and a Vite proxy to the fixed Blocks API.
- Added automatic local Postgres startup and readiness gating to `bun run dev:blocks`.
- Added API-backed mobile dating parity across Home, Dates, Google Maps spots, chats, profile, onboarding media, reviews, and Recaps; calendar is now a secondary Dates view and Recaps is the primary recap destination.
- Added server support for image-only recaps with attached date media and idempotent pending spot/menu contribution submissions.
- Added server-only Stripe billing and marketplace foundations: Better Auth organization subscriptions with the Chewbuu Sync $60/50-seat plan, idempotent catalog and webhook reconciliation, Connect onboarding for venues/workers/referrers, platform Checkout, multi-recipient tip settlement, refund/dispute reversal ledgers, admin Stripe health visibility, and hosted iPad checkout handoff.
- Added the authenticated Expo Sync mobile workspace under `apps/sync` with grouped Operations, People, Business, and Account navigation; mobile Overview, Tables, Orders, Shifts, Tips, Reservations, Kitchen, Clock In, Guests, Work Chat, Menu, Specials, Jobs, Settings, and detail/create workflows.
- Refined the native Sync iPad workspace with a burgundy-first theme, direct order taking, multi-guest parties, sectioned table picking, adaptive panes, simple creation sheets, menu-linked specials, job applicants, and expanded venue settings.
- Refined the native Sync iPad cockpit with Chewbuu burgundy/yellow branding, a quiet overview, grouped operations navigation, reservations, closable inspectors, table-state filters, guest contact capture, menu item metadata editing, and explicit close-out confirmation.
- Added guided rounded venue onboarding with Stripe Identity representative verification, storefront asset uploads, venue-owned menu items, item-linked food photos, and PostgreSQL menu modifier groups/options.
- Added venue operational timeline events for arrival, cooking start, food served, date ended, order/reservation stages, deterministic venue analytics, public aggregate metrics with sample gating, filterable specials, public spot detail pages, and native specials discovery.
- Added Better Auth Organizations as the canonical venue organization boundary with a non-destructive bridge from existing venue memberships.
- Added deployment-managed Stripe Connect health, recipient onboarding, multi-recipient settlement, refund/dispute handling, and webhook reconciliation; raw Stripe credentials are not accepted from browser forms.
- Added branded Chewbuu Sync venue and Crew workflows with admin Sugar/Sync test entitlements, reserved brand handles, styled community metadata, people invitations, venue staff invitations, lifecycle emails, venue operations pages, and the branded-community migration.
- Added debounced Google venue lookup with Place ID retention, editable prefill, Chewbuu-hosted menu planning, and public Sync-verified spot listings and detail pages.
- Added the platform-neutral Sync service operations API for location-scoped staff assignments, shift attendance, breaks/lunches, daily-code and optional geofence clock-in, late/ETA reporting, service boards, tables, service customers, staff orders with modifiers, kitchen/payment state, shared Sync channels, staff removal, and location job listings.
- Added the authenticated `/sync` web workspace with responsive manager/iPad service controls, staff clock-in and attendance fallback, order/customer/table operations, team and schedule management, service settings, public hiring controls, and location-scoped work chat.
- Added full-featured mobile authentication and multi-step onboarding in \`apps/native\` with **Basics**, **Device Permissions**, **Media Check**, **Dating Preferences**, and **Interests & Category Spots**, plus an explicit **Save for Later** action that persists drafts via \`expo-secure-store\` and enables immediate home tab exploration with top-feed resumption banners.
- Built branded liquid glass mobile Login and Sign-Up screens (\`apps/native/app/auth/login.tsx\`, \`apps/native/app/auth/sign-up.tsx\`) and connected them to Better Auth and onboarding navigation.
- Built React Native mobile app in \`apps/native\` with Expo Liquid Glass UI, floating \`LiquidGlassTabBar\` with \`expo-blur\` and gradient sheen, and 5 core tab screens: **Discover** (video profile cards, 3-min vibe check, quick matching), **Spots** (category filtering, Firecrawl menu highlights, date spot proposal), **Dates** (active date itinerary, Safety Beacon trusted circle status, \`.ics\` calendar export), **Chats** (realtime messaging threads, speed dating room queue), and **Profile** (media gallery, Safety Circle management, Sugar VIP Crews & Events manager).
- Added React Native Reusables UI primitives in \`apps/native/components/ui/\` (\`GlassView\`, \`Button\` with haptics, \`Card\`, \`Badge\`, \`Avatar\`, \`Input\`).
- Added reactive client-side database layer with `@tanstack/react-db`, `@tanstack/db`, and `@tanstack/query-db-collection` covering realtime Chat & Messaging collections (`chatRooms`, `chatMessages`, `chatReadStates`), Discovery & Matches (`matches`, `matchDecisions`), Date Spots (`dateSpots`, `savedSpots`), Date Lifecycle (`dateBookings`, `dateRequests`), Notifications (`notifications`), and Onboarding Drafts (`onboardingDrafts`).

- Added Web Push Notification infrastructure in AWS Blocks with `push-subscriptions` DistributedTable, VAPID key signing, and instant push delivery on dating match, chat, and lifecycle events.
- Added a Progressive Web App (PWA) manifest (`manifest.json`) and Service Worker (`sw.js`) supporting standalone mode, interactive notification CTAs ("View Now" & "Dismiss"), and custom haptic vibration patterns (`vibrate: [200, 100, 200]`).
- Added mobile haptic feedback utility (`triggerHaptic`) with preset patterns (`success`, `warning`, `error`, `light`, `medium`, `heavy`) and graceful browser fallback.
- Added a dedicated "Device Permissions & Alerts" step to the onboarding flow with interactive permission requests for Camera, Microphone, Push Notifications, and Location, plus tactile haptics testing.
- Added an admin route (`/admin`) featuring tabbed navigation for Better Auth user administration (role updates, banning, unbanning, impersonation, user deletion), Stripe catalog synchronization, and operational observability tools.
- Added an idempotent `syncPricingPlans` API method in AWS Blocks that automatically discovers or creates Stripe products and monthly/annual recurring prices for Mingle and Sugar membership tiers, persisting their IDs into PostgreSQL.
- Added dynamic subscription plan resolution in `@chewbuu/auth` querying active Stripe price IDs from the `membership_plan` table with fallbacks to environment variables.
- Added AWS Blocks `CronJob` (`date-lifecycle-cron`) scheduled at `rate(1 minute)` and `AsyncJob`s (`notification-delivery`, `media-processing`) for background job orchestration.
- Documented Google OAuth Authorized JavaScript origins and redirect URIs in `README.md`.
- Added PlanetScale Postgres support with pooled runtime connectivity, direct migration connections, and a transactional SQL migration runner with baseline detection.
- Added SEO metadata for the Chewbuu landing page with canonical tags, FAQ/Organization/WebSite JSON-LD, robots.txt, sitemap.xml, and the branded homepage screenshot as the OG/Twitter image.
- Added a React Email workspace package with branded auth and lifecycle templates, plus Resend-backed Better Auth verification and password reset emails.
- Added a signed Resend webhook endpoint at `/api/resend/webhook` for delivery, engagement, bounce, complaint, and inbound event configuration.
- Added an AWS Blocks backend package with CDK/Lambda deployment entrypoints, local development, typed API calls, and production WebSocket realtime support for chat.
- Introspected the existing Neon PostgreSQL schema with `bb-data`, added Blocks Database/Kysely access, a DynamoDB room projection, a DynamoDB KV room-list cache, and a migration for the legacy chat read-state key.
- Added AWS Blocks `Hosting` construct in `packages/aws-blocks/aws-blocks/index.cdk.ts` and enabled `DEPLOY_FRONTEND_TO_AWS` in GitHub Actions for full AWS frontend + backend deployments.
- Added a bottom-anchored `Sheet` drawer component (`packages/ui/src/components/sheet.tsx`) built on the Base UI dialog primitive with slide-up/down animation, a drag handle, and a scrollable body.
- Added AWS Blocks observability with structured backend logs, CloudWatch EMF metrics, X-Ray tracing, API and SSR dashboards, and an admin dashboard link.

### Fixed

- Provisioned the Sync attendance signing secret as platform-managed production configuration and passed it into the AWS Blocks runtime, so venues and staff never need to configure it.
- Added the missing `venue_location.style` migration, required venue contact details in the venue portal, and removed the ordinary-member Chewbuu Sync brand shortcut. The portal now explains that any signed-in member can submit a venue, while venue operations require an approved claim, team invitation, or admin access.

### Changed

- Reworked venue onboarding around Find → Claim → Verify → Build → Launch, with role selection, Google prefill, menu destination choices, clearer progress, and a public verified-spot path.
- Added a Stripe Identity tab and verification gate to personal onboarding, surfaced identity in the home readiness rail, and replaced fabricated dashboard cards with real counts or honest empty states.
- Reworked completed-user profile editing into closed-by-default accordions with independently dirty-only saves, persisted media previews/playback, and the same age-range slider rules used by onboarding.
- Made existing usernames read-only and added a bloom-filter-assisted, email-verified, rate-limited username change queue with admin approval and notification emails.
- Made Stripe Identity a required gate in venue onboarding before profile media, and added venue profile picture, intro video, and multi-select additional photo uploads to the media step.
- Compacted onboarding step navigation pills to dynamic fit-to-text widths across mobile and desktop, removing empty spacing and checkmark icons while styling completed steps with a clean green accent.
- Redesigned onboarding Basics step into a 2-column mobile layout with 3 expandable accordion sections (Contact & Handle, Personal Details & Location, Identity & Bio) and embedded navigation.
- Redesigned onboarding Permissions step into a 2-column mobile card grid with client-side mobile haptics capability detection.
- Redesigned onboarding Media step into 3 expandable accordion sections (Profile Photo live capture, Intro Video live recording, Additional Photos gallery).
- Redesigned onboarding Premium step with dynamic top-level feature matrix and 3 compact selectable plan pills (Social Free, Mingle Best Value, Sugar VIP) with direct Stripe checkout.
- Filtered out username from initial sign-up form so handle validation against the bloom filter happens exclusively in the onboarding flow.

### Fixed

- Fixed venue creation failing when `venue_location.description` was written before the column existed by adding an idempotent PostgreSQL migration.
- Fixed configured Google-authenticated administrators being denied at `/admin` when existing accounts had not yet received their admin role, and added visible Admin navigation plus an account-menu entry.
- Fixed `NavigationBlocker` erroneously triggering the "Unsaved Onboarding Progress" modal when navigating backward or switching between onboarding steps by ignoring intra-route/same-pathname transitions.

- Fixed React hydration error #418 during onboarding by initializing SSR step to 0 and mounting persisted/hash state client-side.
- Fixed date spot search (`suggestPlaces`) failing during onboarding by accepting request coordinates/area before a profile row exists in PostgreSQL and adding rich fallback places when Google Places API is unconfigured.
- Fixed video recording missing audio tracks during playback by specifying audio codecs (`opus`/`mp4a`) and `playsInline` attributes on preview video elements.
- Fixed onboarding 'Save for later' draft saving failing with Zod validation errors on partial or empty profiles by decoupling draft validation (`profileDraftInputSchema`) from full profile submission requirements (`profileInputSchema`).

- Fixed mandatory onboarding bypass by strictly redirecting non-onboarded users to `/onboarding` from all protected `/_auth` routes, index `/`, and sign-up completion.
- Fixed Better Auth core and plugin field mappings against the snake_case PlanetScale schema, resolving password-reset 500s caused by the verification table's `created_at` column.
- Fixed forgot-password email input styling and added CloudWatch SSR request/auth-failure widgets for diagnosing web auth errors.
- Repaired the Better Auth database rate-limit table and mapped its model to the existing snake_case PlanetScale schema, preventing auth 500s after the connection fix.
- Fixed AWS production authentication 500s caused by shell-quoted PlanetScale database URLs, and set the production Better Auth origin explicitly to `https://chewbuu.com`.
- Removed the Vercel image CDN flag from recap photos now that production hosting runs on AWS.
- Fixed the Better Auth username input in the signup form so it matches the rounded pill styling of the other auth fields.
- Fixed React SSR dual-module bundling in `apps/web/vite.config.ts` by removing React from `ssr.noExternal`.
- Switched the AWS Blocks `Hosting` construct to `framework: "nitro"` with `buildOutputDir: ".output"` so the TanStack Start SSR bundle (`.output/server` + `.output/public`) deploys as a Lambda instead of being treated as a static SPA.
- Wired `DATABASE_URL` and `BETTER_AUTH_SECRET` (plus `BETTER_AUTH_URL`/`CORS_ORIGIN`/`VITE_BLOCKS_API_URL` pass-through) into the SSR Lambda via `Hosting.ssrFunction.addEnvironment`, fixing the Lambda 502 caused by `@t3-oss/env-core` rejecting missing env vars at module load.
- Defaulted `BETTER_AUTH_URL` and `CORS_ORIGIN` in `packages/env/src/server.ts` to the `chewbuu.com` origin when running outside Vercel, so the SSR Lambda no longer crashes without them.
- Added `*.cloudfront.net` to Better Auth `allowedHosts` and `trustedOrigins` so sessions work on the deployed CloudFront distribution pending a custom domain.
- Fixed the `getServerUrl` path collapse in `apps/web/src/lib/auth-client.ts` so a same-origin `VITE_SERVER_URL` (e.g. `/`) resolves against the request origin instead of throwing `Invalid URL`.
- Set `VITE_SERVER_URL: "/"` and `BETTER_AUTH_SECRET` in the AWS Blocks deploy workflow so the production browser bundle targets the deployed origin and the SSR Lambda receives the auth secret.
- Wired the full runtime env set (Stripe, Google Places/Gemini/Client, R2, Upstash Redis, Stream, Resend, Neon Auth URL, CHIME, and more) into both the Blocks API Lambda and the SSR Lambda via `Hosting.ssrFunction.addEnvironment` in `packages/aws-blocks/aws-blocks/index.cdk.ts`, skipping empty values, and pass each through the deploy workflow so functionality works once keys are set in GitHub.
- Set `NITRO_PRESET: "aws-lambda"` in the AWS Blocks deploy workflow so the SSR Lambda bundle exports a real AWS Lambda `handler` (the default `node-server` preset exported none, causing every origin invocation to 502).
- Fixed `react`/`react-dom`/`scheduler` being missing from the SSR Lambda bundle (resolved `__require("react")` crash) by copying them into `.output/server/node_modules` after the build via `apps/web/scripts/copy-ssr-deps.ts`.
- Enabled Lambda response streaming (`awsLambda.streaming: true`) in `apps/web/nitro.config.ts` so the SSR handler emits the `streamifyResponse` shape the API Gateway `ResponseTransferMode.STREAM` integration expects, fixing the remaining CloudFront 502 after direct-invoke returned 200.
- Fixed profile saves failing with `column "contribution_score" of relation "profile" does not exist` by applying the pending raw migrations to the production Neon database and wiring `db:migrate:raw` into the AWS Blocks deploy workflow (main only) and the Neon preview workflow so migrations run automatically.
- Replaced the centered "Plan a Date" dialog on `/me` with the bottom `Sheet` drawer so the date wizard slides up full-width instead of rendering as a squashed modal.
- Rendered a full chat layout (room list + message pane) with per-tab empty-state guidance and a "Browse matches" CTA when a user has no conversations, instead of a bare "No chats yet." text, and surfaced `getRooms()` failures with an inline error and "Try again" instead of silently showing an empty state.
- Required profile photos and intro videos before marking onboarding complete, added profile media uploads to settings, refreshed expiring media URLs when records are read, narrowed full-view navigation to chats and matches, and added persisted friend invites to the empty chat state.
- Redirected signed-in incomplete users to `/onboarding` from auth entry routes and restored a local branded hero visual for the landing page.
- Fixed onboarding "Save for later" (and all profile/date-request/review/plan writes) failing on jsonb columns: the `pg-client` engine handed non-empty JS arrays to node-postgres as Postgres array literals (e.g. `{solo}`), which is invalid jsonb input. Added a `jsonb()` serializer used at every jsonb write site.
- Fixed toast notifications (Save for later, location detect, checkout redirect) persisting forever after a success/error update by dismissing the loading toast before showing the final toast with an explicit duration.
- Removed the decorative sun icon from the `/me` weather badge so the weather condition icon and location text render cleanly without wrapping.
- Expanded the landing hero background grid from six mirrored images to twelve distinct date and friends photos.
- Fixed the header nav shifting on first load by only rendering the user-menu skeleton when a session cookie is present and sizing it to match the avatar button, instead of showing a wide placeholder for every visitor.
- Fixed AWS-hosted document SSR route guards to read Better Auth sessions through the server API with forwarded request headers instead of using the browser auth client during Lambda rendering.

### Changed

- Added separate admin actions and a redirect route for the API and web SSR CloudWatch dashboards.
- Documented the redacted production provider/API-key checklist and feature impact in `docs/production-environment.md`.
- Removed Drizzle ORM, schema generation, and database studio tooling; Better Auth now uses its built-in PostgreSQL/Kysely adapter.
- Migrated chat room reads and message writes from Hono/Upstash realtime to AWS Blocks while consolidating the database runtime and migration history on PlanetScale/Kysely.
- Kept Vercel for TanStack Start builds and previews, with `VITE_BLOCKS_API_URL` connecting the frontend to the AWS Blocks API.
- Updated AWS Blocks PR previews to publish a GitHub deployment URL, keep a single preview comment current, and mark preview deployments inactive when the PR closes.

## [0.7.0] - 2026-07-20

### Added

- Added a Postgres-backed chat persistence foundation with Upstash Redis Streams/SSE realtime delivery for friend DMs and date rooms.

### Fixed

- Added an idempotent production hotfix migration for private profile fields and tightened date dashboard/chat decision UI spacing.
- Added Kibo UI-inspired `StoriesBar` component (`apps/web/src/components/ui/stories.tsx`) featuring unread gradient rings for creator food recaps.
- Added Kibo UI-inspired `ReelPlayer` full-screen vertical video modal (`apps/web/src/components/ui/reel.tsx`) for watching recaps and video replies, complete with venue badge, creator avatar, and instant "Plan Date at Spot" CTA.
- Re-architected Home Dashboard (`/me`) featuring a horizontal schedule ribbon, live location weather forecast badge (`☀️ 76°F · Clear & Sunny`), upcoming date itinerary card, date stats metrics (streak, monthly bookings, fav spots, recaps), and AI recommendation queue prompt.
- Added top header notification bell navigation to open `/me?tab=notifications`.
- Added in-workspace New Date Drawer modal dialog that lets users plan dates with `DateWizard` directly inside `/me` without navigating away.
- Added mobile-first `HorizontalStepper` component (`Request` -> `Matcher` -> `Choice` -> `Date`) with status badges, step locking, and URL route search param persistence (`/me?tab=matches&dateId=...&step=...`).
- Added interactive spot search on `DateConfirmScreen` (`Choice` step) powered by live Google Places API searches (`datingApi.suggestPlaces`).
- Added requester video intro play overlay button (`▶`) on date request cards and a full-screen video player modal.
- Added requester profile overlay modal with easy back-navigation ("← Back to Date Feed").
- Added filter pills (`All`, `Received`, `Sent`, `Active`) with count badges to the `Dates & Requests` feed hub.
- Added Tinder-style "I'm Interested" / "Accept" feed card CTAs for received requests and "Review Candidate Rooms" for sent requests that transition directly into step 2 (`Matcher`).
- Added TanStack Router `NavigationBlocker` integration across form creation flows (`/date/new`, onboarding, and recap forms).

### Changed

- Redesigned the Request Summary View into a visual Date Itinerary Timeline stepper showing stop numbers, categories, scheduled time, and area.
- Enforced strict itinerary venue privacy: senders see full venue details, while receivers see category placeholders with lock badges until a match choice is confirmed.
- Fixed Date Detail back arrow `←` navigation to cleanly clear search params (`dateId`, `step`) and return seamlessly to the date request feed without getting stuck.
- Redesigned Date Feed cards to feature a large hero video/photo preview thumbnail on the left, date details, and horizontal footer layout inspired by modern card designs.
- Updated Date Feed card avatar logic: "Sent" requests display the logged-in user's profile avatar so users instantly know they sent it, while "Received" requests display the sender's avatar and match score.
- Enforced strict URL route state persistence on browser refresh so users stay on their current tab (`/me?tab=...`), date ID, step, and filter without defaulting back to feed.
- Refactored Date Feed cards to enforce strict venue privacy: venue names and images are kept private until a match choice is confirmed.
- Updated Date step progression so completed step inputs lock as users progress.
- Enhanced Date Confirmation flow to lock finalized date details and trigger success toast and calendar schedule updates.

- Added hideable/collapsible venue check-in QR code widget with transparent Chewbuu logo state, partner scanning camera view, and `/dating/check-in` server API check-in integration.
- Added multi-spot and multi-person Accordion review views with photo/video recap attachments and rating/comment validation.
- Added full-screen single-page Profile & Onboarding Settings screen (`/me/profile`) allowing users to view and update all onboarding fields.
- Added mobile sidebar navigation drawer overlay triggered by tapping the header logo on mobile screen sizes.
- Redesigned Chats and Date rooms for Chewbuu’s dating flow: video-first intro exchange, 3-reply unlock, pick/friend/continue/block CTAs, shadcn Message/Bubble/Attachment/Marker/MessageScroller composition, and real camera/mic capture.
- Added three walkable demo date scenarios (sent request, received request, friend path) with nested matcher chats and a pre-date confirm screen (sender/receiver POVs, spot adjust/suggest, DiceUI QR check-in, reschedule/cancel penalty dialogs, Open-Meteo weather + Maps directions).
- Added `@diceui/qr-code` to `@chewbuu/ui` for venue check-in codes with Chewbuu logo overlay.
- Added Sentry error monitoring and tracing for `apps/web` (TanStack Start React) with client-side Session Replay, server-side error capture via `wrapFetchWithSentry`, TanStack Router browser tracing, and global middleware instrumentation.
- Added Sentry error monitoring, tracing, and profiling for `apps/server` (Hono) via `@sentry/hono/node` with the `sentry()` middleware and `nodeProfilingIntegration`.
- Added `instrument.client.ts`, `client.tsx`, `server.ts`, `start.ts`, and `instrument.server.mjs` entry files for the web app's Sentry integration.
- Added `instrument.ts` for the Hono server's Sentry initialization.
- Added `sentryTanstackStart` Vite plugin configured for the `chewbuu-web` project.
- Added `/debug-sentry` test route on the Hono server for manual Sentry validation.
- Added `/api/sentry-example` test route on the web app for manual Sentry tracing validation.
- Added `SENTRY_DSN` and `SENTRY_AUTH_TOKEN` to the server env schema.

### Changed

- Expanded full-view layout on Date details and Chat routes by completely hiding the right sidebar and auto-collapsing the left sidebar to icon width (`lg:col-span-11`).
- Simplified mobile bottom tab bar to exact 5 tabs: Feed, Spots, Dates, Chats, and Calendar.
- Removed duplicate top header bar on Chats view to let inner chat room header serve as primary header.
- Updated Dating Readiness checklist to require Better Auth `username`, turning the Profile Details dot red until set.
- Replaced the X-style sky-blue chat pane with a mobile-first Friends / Date rooms experience, active-date banners that deep-link back to the date page, and no unused call buttons.

## [0.6.4] - 2026-07-19

### Added

- Integrated client-side probabilistic `BloomFilter` data structure and `@tanstack/react-pacer`'s `useDebouncedValue` hook for instant username availability validation during onboarding.
- Added `username` and `displayUsername` columns to `user` database schema and configured Better Auth `username()` server and client plugins.
- Added date request scheduling overlap validation to block booking dates within 2 hours of existing ones.
- Added Vercel Workflow SDK durable workflow scaffolding (`onboardingWorkflow`, `dateMatchingWorkflow`, `recapProcessingWorkflow`, `reviewProcessingWorkflow`) with a `/workflows` Hono router for async invite dispatch, match expiry, recap fan-out, and review aggregation.
- Added a virtualized `DateRecapFeed` component with infinite-query pagination and Vercel Blob responsive images for the `/me` feed.
- Added Better Auth `passkey()` server plugin and client passkey support, including a passkey sign-in button on auth views and a passkey management card in profile settings.
- Added better-auth-ui plugin configuration wiring the username sign-up field, passkey auth button, and Google social provider into the app's auth screens.
- Added lefthook pre-push hooks that run typechecks and the full test suite before code reaches GitHub.

### Fixed

- Fixed the `/me` route crash (`Can't find variable: tier`) by deriving the `tier` alias from the resolved membership tier.
- Fixed the dating profile save flow so media-based `canDate` state is computed correctly alongside the new onboarding gates.
- Fixed the `@tanstack/react-pacer` debouncer options call signature in the username availability checker.

### Changed

- Configured Better Auth session cookie caching (`session.cookieCache`), rate limiting (`rateLimit`), and Google OAuth social provider setup.
- Added synchronous `beforeLoad` redirects from `/`, `/auth/sign-in`, and `/auth/sign-up` to `/me` for authenticated users.
- Redesigned the Calendar view to a full-width Month Grid calendar with navigation controls, view selector, today action, and meal-type banner coloring (breakfast, lunch, dinner).
- Filtered calendar events and date cards list to only show confirmed, review-due, and completed dates.
- Redesigned date cards below the calendar to simple, flat row dividers featuring large partner avatars, calendar and map pin icons, and badges for location spots.
- Aligned sidebar navigation links to place the Feed option next to the Calendar title.
- Restructured the date history detail view into a clean step-by-step navigation tab bar (Setup Details, Match Candidates, Places & Recap) to simplify dating state progression.
- Implemented a premium custom Video-DM Chat Room component featuring a nested active conversations sidebar, side-by-side intro video mockups, simulated 2-minute video response recorder with timer and pulsing recording indicator, and structured choose/decline CTA prompts.
- Onboarding readiness now requires a Better Auth username and a safety contact before a profile is marked complete or allowed to date.
- Sign-in now accepts an email address or a username when the username plugin is enabled.
- Onboarding now persists the collected username to Better Auth and seeds the field from the session user.
- Expanded `bun run check-types` coverage to the web app via a new `check-types` script so the pre-push gate type-checks every app and package.

## [0.6.3] - 2026-07-18

### Added

- Added a two-step end-of-date review flow with person/place criteria, comments, and a dedicated reviews API.
- Added a mock Dates detail view showing date request history, match decisions, date-room history, review entry, and recap content.
- Added review storage fields and reliability scoring counters for future match ranking penalties on cancels, reschedules, and flakes.
- Added real Stream friend DM bootstrapping from the Chats route for preview testing live messages between users.
- Added authenticated private Vercel Blob profile media upload and streaming routes.
- Added `/me` as the primary authenticated social app route, with `/dashboard` kept as a compatibility redirect.
- Added active date-request cards and unread request badges to the feed/Dates navigation.
- Expanded Spots with photo-led sections, richer Google Places metadata, and a protected Google Places photo proxy.
- Added an authenticated R2 media fallback route for uploaded profile media when no public R2 URL is configured.
- Added circle and referral tracking storage so onboarding friend invites can feed future free-premium and restaurant-referral rewards.
- Added first-class `/me` social routes for chats, date details, spots categories, calendar, notifications, and profile.
- Added a draft profile save endpoint so onboarding progress can persist before required media is ready.

### Changed

- Updated authenticated navigation and auth/onboarding redirects to use `/me`.
- Updated profile media uploads to use Vercel Blob client uploads for longer intro videos.
- Updated onboarding media uploads to use the Vercel Blob route in hosted previews.
- Reframed chat copy around persistent friend DMs and date-request match rooms.
- Reframed feed and Spots copy around friend recaps, active date requests, and future spot partners.
- Updated onboarding Friends & Safety so Social users can invite friends as referrals while premium users can turn friend invites into circle members.
- Updated Stream chat loading to run client-side from the `/me` shell so previews do not SSR-crash on the Stream bundle.

### Fixed

- Fixed uploaded media fallback URLs so attachments no longer save with the dead `storage.chewbuu.local` placeholder.
- Fixed the Chats route to let Stream own active channel selection so the full message list and composer render.
- Fixed private Blob video uploads by stripping recorder codec parameters before storage.
- Fixed Google Places photo loading to proxy media without exposing the server API key.
- Fixed coordinate-biased Places suggestions so filters and spot searches still shape the results.
- Fixed the dating summary API to include each request's selected places so the feed's upcoming dates widget no longer crashes on `places.slice`.
- Linked dashboard readiness checklist items back to the relevant onboarding steps.
- Removed the duplicate sidebar Chewbuu wordmark from the authenticated app shell.

## [0.6.2] - 2026-07-18

### Added

- Added an editable "Distance range (miles)" slider to onboarding step 3 (PreferencesStep) mapping to the profile's `distanceMiles`.
- Implemented "Dutch | Me" pay-choice buttons under Payment in the Date Wizard for Sugar members.
- Added a search filter and chip/badge selection flow to invite guests from the user's circle in the Date Wizard.
- Added a "Save & Exit" button to the onboarding form steps if the user has already onboarded.

### Fixed

- Updated the server schema and validator to allow between 1 and 3 selected places, preventing combo places from blocking form submission.
- Changed the submit button in the spots selection step to dynamically check if all active categories are satisfied by combo places.
- Removed the unneeded "Area" text input from the Date Wizard.
- Standardized Card components in the Date Wizard to use rounded corners (`rounded-2xl`).
- Replaced the hardcoded `rounded-none` size variants in the Button component to support full custom rounding.
- Renamed the Matches tab to "Dates" and the Profile sub-header "Requests" to "Friends".

## [0.6.1] - 2026-07-17

### Added

- Redesigned the Date Wizard step 1 booking form into a unified, compact single-card view using pill-shaped inline activity toggles and circular friend avatars for guest selection from the user's Circle.
- Configured Places suggestion scroll areas in step 2 to remain horizontal scrollers on all devices, and integrated rating-based 'Featured' and cross-category 'Combo' badges.

## [0.6.0] - 2026-07-17

### Added

- Reworked the Date Wizard into a streamlined 3-step form (Plan, Places, Matches).
- Grouped activity toggles, date/time pickers, guest counts, and Dutch payment checkbox into the initial date booking form step.
- Hidden the "Drink" activity option from onboarding and date planning for users under 21.
- Updated onboarding age selection to a single dual-thumb range slider, enforcing match limits: locked to 18-22 for under-21s, and starting at 23 for users 21 and older.
- Redesigned the authenticated dashboard shell to be fully responsive and mobile-friendly.
- Integrated a Stream-powered Chat screen/tab into the mobile-friendly dashboard.
- Normalized Google Places results to include latitude and longitude coordinates, enabling location chaining to recommend subsequent spots nearby.
- Integrated automatic invite processing to auto-join a user to pending friend/spouse invites when their onboarding completes.
- Added comprehensive unit tests for the updated date wizard constraints, onboarding age sliders, Places coordinates, and invite join rules.

### Fixed

- Fixed linting and formatting issues including modernizing sorting with `toSorted` and removing dynamic property deletions.
- Fixed Testing Library assertions for custom Base UI checkbox and hidden slider range inputs.

## [0.5.0] - 2026-07-14

- Added launch-draft Privacy Policy and Terms of Service pages linked from the homepage footer.
- Added AI overview and acknowledgement controls for Privacy and Terms pages, plus required policy acceptance during signup.
- Added Stream-backed match rooms with server-issued Stream tokens, deterministic chat channels, video call setup, staged video-reply prompts, and recap feed draft posting.
- Added a dedicated onboarding Values step for politics, religion, kids, future kids, and what users are looking for.
- Added a public homepage pricing section backed by the pricing API and a footer with public navigation.
- Added a dashboard Matches tab for date requests, chat/save/decline actions, and honest empty states.
- Added relationship status collection during onboarding with spouse/partner invite capture for applicable users.
- Added provider-ready onboarding invite notifications through Resend email and Sent.dm SMS adapters.
- Added persistent Zustand onboarding store to save form progress across page refreshes.
- Added live photo capture preview stage in camera dialog so users can review the photo before uploading.
- Extended live video recording countdown limit to 60 seconds and displayed helpful prompt tips.
- Integrated reverse geocoding to automatically resolve city and state names from browser GPS coordinates.
- Stylized sign-in and sign-up page cards, inputs, and buttons with on-brand rounded pill designs.
- Added unit tests for onboarding store, theme store, dating API URL resolution, and additional dating route readiness edge cases.
- Added Vercel Analytics and Speed Insights to the root layout.
- Added automatic Drizzle schema push to the server build so Neon preview branches get their tables on every deploy.
- Expanded Google Places category support to include eat, drink, play, move, watch, and talk with category-specific search keywords.
- Added locationBias and includedType parameters to Google Places Text Search for more relevant results.
- Added tests for move-category place suggestions and updated text query assertions.
- Added explicit per-interest local spot searches in onboarding so Places results load only after a selected signal or manual query.
- Added an onboarding Preferences step for match age range, interested-in choices, and looking-for choices.
- Added an under-18 onboarding stop screen with a return date and under-21 match range limits.

### Fixed

- Split the Stream match-room route into a lazy route chunk to reduce the default app bundle.
- Fixed onboarding media uploads saving invalid fallback URLs when the upload provider does not return a public base URL.
- Fixed onboarding multi-select pills for interested-in and looking-for fields.
- Fixed circle friend invites so Social users can join circles by invite but cannot start one during onboarding.
- Changed dashboard readiness indicators to red/green status dots and hide the readiness widget after the profile is date-ready.
- Fixed authenticated header navigation to center app menu items and remove duplicate sign-in actions.
- Fixed public navigation so logged-out users see marketing/auth routes and logged-in users no longer see app/admin routes on the homepage.
- Replaced fake homepage trending couples, dashboard recaps, ratings, and compatibility placeholders with real profile/request/recap data or clear empty states.
- Updated dashboard dating readiness to reflect complete profile values, media, location, and safety contacts instead of partially complete onboarding.
- Fixed onboarding redirection loop by relaxing the gateway middleware to only check for completed basics profile fields.
- Fixed dynamic inputs rendering delay in Friends & Safety tab by using store-level React state subscriptions.
- Fixed missing assertion in the Google Places text query test.
- Fixed lint and formatting issues in the onboarding form (exhaustive-deps, catch parameter naming, zero-fractions).
- Fixed Google Places 502 errors by falling back to mock suggestions when the API rejects a request instead of breaking the UI.
- Fixed undefined `contacts` variable in the dashboard readiness checklist.
- Replaced deprecated `maxResultCount` parameter with `pageSize` in Google Places Text Search requests.

## [0.4.0] - 2026-07-14

### Added

- Redesigned the non-authenticated homepage `/` into a stunning, dark-themed Netflix-style landing page with couple date card highlights, grid image overlays, a detailed features overview, and interactive FAQ accordions.
- Added video inputs camera device selector allowing users to switch hardware video inputs in `LiveCaptureDialog`.
- Embedded a local place search input box in the onboarding Interests step to let users query and select spots near them.

### Fixed

- Fixed capitalization of Sex and Sexuality option values to ensure clean presentation.
- Fixed layout alignment, padding, borders, and drop shadow styles for the shadcn select dropdown components to avoid position shifting.
- Fixed Camera permission and shutter buttons lock by binding disabled states to React stream state instead of static refs.
- Fixed upload error in Safari/Chrome by wrapping URL construction in a robust try/catch helper block.
- Fixed typing delay in dynamic list fields (Friends list inputs) by tracking active focus state and avoiding stale resets.
- Fixed Pricing step crash by resolving undefined parent scope `handleFinishLater` callback variable reference.

## [0.3.0] - 2026-07-14

### Added

- Redesigned the authenticated `/dashboard` as a three-column social application (X/Instagram/DoorDash hybrid layout) featuring Feed, Spots, and My Profile views.
- Added a social feed tab showing scrollable date recaps (reels) with place reviews, compatibility scores, photos, and partner ratings.
- Integrated an "Upload Date Recap" form allowing users to publish custom date reels with ratings and photos live.
- Embedded a DoorDash-style local place explorer (Eat, Drink, Play) with card layout, ratings, tags, and a one-click "Plan Date Here" action.
- Added Instagram-style profile statistics (recaps count, verified compatibility score, circle friends size), intro video player, and recap grid.
- Added a right sidebar listing dating readiness checklists, daily limit progress bars, and circle status widgets.
- Updated favicon to the transparent branding logo `/brand/chewbuu-logo-500-trans.png`.
- Added open graph, twitter card, and search keyword meta tags to `__root.tsx` for SEO optimization.
- Updated landing page `/` to automatically check for active sessions and redirect users to `/dashboard`.

## [0.2.0] - 2026-07-14

### Added

- Added private `race` and `occupation` collections to profiles schema and database.
- Integrated background geolocation permission triggers and reverse coordinate resolution.
- Embedded a debounced place search querying real Google Places near the user for Eat, Drink, Play, and Move interests.
- Added lists for Watch (genres, shows, actors) and Talk (topics, hobbies) interest categories.
- Added automatic progress saving to the "Finish later" button.

### Fixed

- Fixed phone formatting to format input live as `(xxx) xxx-xxxx` and reject non-digits.
- Fixed Media step upload reactivity issues by subscribing media slots to TanStack Form's state.
- Fixed webcam permissions fallbacks to work reliably across hardware and platforms.
- Fixed input latency in dynamic people lists using state-debounced local fields.
- Fixed layout alignment for trusted contacts and delete triggers on mobile and desktop.

## [0.1.0] - 2026-07-14

### Added

- Added `phone` validation and database storage to profiles schema.
- Integrated live media capture flow for profile photo and intro video via browser webcam/recording APIs.
- Added support for category-specific interest options and multi-select "interested in" setups.
- Redesigned Mingle and Sugar membership tier pricing cards with annual toggle and Stripe checkout hooks.
- Configured at least one safety contact requirement before submitting onboarding.

### Fixed

- Fixed Vitest unit test suite to mock `getProfile` and expect new live capture actions instead of standard upload options.
- Resolved all formatting, linting, and accessibility requirements across the codebase.
