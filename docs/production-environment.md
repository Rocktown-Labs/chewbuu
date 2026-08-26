# Production environment checklist

This is a redacted checklist for the GitHub `production` environment. It lists names and feature impact only; never commit or print secret values.

The deployment workflow is `.github/workflows/aws-blocks.yml`. Secrets are injected into both the AWS Blocks API Lambda and the web SSR Lambda when they are present.

## Confirmed configured

Verified from GitHub Environment metadata on 2026-08-25:

- `AWS_ROLE_ARN` — GitHub Actions OIDC deployment role
- `BETTER_AUTH_SECRET` — Better Auth signing/encryption secret
- `BETTER_AUTH_URL` — public auth base URL
- `BLOCKS_DB_URL` — PlanetScale pooled runtime URL (`6432`)
- `BLOCKS_MIGRATION_DB_URL` — PlanetScale direct migration URL (`5432`)
- `RESEND_API_KEY` — transactional email provider credential
- `RESEND_WEBHOOK_SECRET` — Resend webhook verification credential

Configured production variables:

- `AWS_REGION`
- `VITE_NEON_AUTH_URL` — stale and unused by the current runtime; remove it from the GitHub environment

## Missing or needing confirmation

These workflow inputs were not present in the GitHub `production` secret list when this checklist was created:

| Key | Feature impact |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google sign-in will use placeholder credentials and fail in production |
| `GOOGLE_CLIENT_SECRET` | Google sign-in will use placeholder credentials and fail in production |
| `FIRECRAWL_API_KEY` | Venue menu previews and menu capture are unavailable |
| `GOOGLE_GENERATIVE_AI_API_KEY` | AI responses are unavailable |
| `GOOGLE_PLACES_API_KEY` | Place search and place-photo proxy are unavailable |
| `R2_ACCESS_KEY_ID` | No current AWS Blocks source usage found; legacy/pass-through configuration |
| `R2_ACCOUNT_ID` | No current AWS Blocks source usage found; legacy/pass-through configuration |
| `R2_BUCKET_NAME` | No current AWS Blocks source usage found; legacy/pass-through configuration |
| `R2_SECRET_ACCESS_KEY` | No current AWS Blocks source usage found; legacy/pass-through configuration |
| `REDIS_URL` | No current active source usage found; Better Auth rate limiting uses PostgreSQL |
| `STREAM_API_KEY` | No current active source usage found; video uses Amazon Chime |
| `STREAM_API_SECRET` | No current active source usage found; video uses Amazon Chime |
| `STRIPE_SECRET_KEY` | Billing plugin remains disabled unless this and the webhook secret are both set |
| `STRIPE_WEBHOOK_SECRET` | Billing plugin remains disabled unless this and the Stripe secret are both set |
| `STRIPE_MINGLE_PRICE_ID` | Mingle checkout cannot be configured |
| `STRIPE_MINGLE_ANNUAL_PRICE_ID` | Mingle annual checkout cannot be configured |
| `STRIPE_SUGAR_PRICE_ID` | Sugar checkout cannot be configured |
| `STRIPE_SUGAR_ANNUAL_PRICE_ID` | Sugar annual checkout cannot be configured |

These production variables are optional but should be deliberately reviewed:

- `RESEND_FROM_EMAIL` — otherwise the code default is `Chewbuu <noreply@news.chewbuu.com>`; the sender domain must be verified in Resend
- `DATABASE_CA_CERT` — optional PEM or certificate path for verified PlanetScale migration connections; the workflow falls back to the GitHub runner system CA bundle
- `VENUE_EMAIL_FROM` — verified SES sender used by AWS Blocks venue notification jobs
- `VENUE_APP_URL` — base URL used for clickable venue notification links; defaults to `https://chewbuu.com`
- `R2_PUBLIC_URL`
- `CORS_ALLOWED_ORIGINS`
- `ADMIN_EMAILS`
- `BETTER_AUTH_ADMIN_EMAILS`
- `LOG_LEVEL`

## Required baseline

The deployment cannot operate without:

- `AWS_ROLE_ARN`
- `BETTER_AUTH_SECRET`
- `BLOCKS_DB_URL`
- `BLOCKS_MIGRATION_DB_URL`

`DATABASE_URL` is derived from `BLOCKS_DB_URL` in the production workflow. `BETTER_AUTH_URL` defaults to the Chewbuu public auth URL when omitted, and `CORS_ORIGIN` is set to `https://chewbuu.com` by the workflow.

## Safe setup procedure

1. Add values to GitHub **Settings → Environments → production** using the exact names above.
2. Keep database URLs on the correct ports: pooled `6432` for runtime and direct `5432` for migrations.
3. Re-run the AWS Blocks workflow after changing provider credentials.
4. Verify the feature endpoint and CloudWatch logs without printing secret values.
