# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.4] - 2026-07-19

### Added

- Added date request scheduling overlap validation to block booking dates within 2 hours of existing ones.

### Changed

- Updated Calendar view to integrate shadcn/ui interactive Calendar component.
- Updated calendar days to render avatars of scheduled date partners.
- Redesigned date history and request list to slim cards showing partner avatars, yellow date type badges, and clean mapped statuses.
- Aligned sidebar navigation links to place the Feed option next to the Calendar title.

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
