# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
