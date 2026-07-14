# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
