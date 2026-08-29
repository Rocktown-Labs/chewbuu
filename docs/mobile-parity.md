# Consumer mobile parity notes

## Issue #116: date request action window and dating availability

Web and consumer native now share the same product rules:

- **Ready to date is opt-in.** It is stored as `profile.dating_enabled`, defaults to `false`, and can only be enabled after onboarding is complete.
- **Incoming requests have a two-minute action window.** Web and native hide expired or already-opened incoming requests locally. The server record is retained for history and moderation; expiry is not a destructive delete.
- **Date planning is gated.** The web and native `/date/new` routes show onboarding/readiness actions instead of opening the form when the member is not eligible.
- **Place selection remains canonical.** The selected Google Place ID and display fields are kept in the form state through submission.

The source of truth for the API contract is `packages/aws-blocks/src/types.ts`; clients should use `setDatingAvailability` rather than writing local-only readiness flags.
