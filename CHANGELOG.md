# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
