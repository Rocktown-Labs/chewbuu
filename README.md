# Chewbuu

Chewbuu is a full-stack dating and social application built with TypeScript, TanStack Start, React, Expo, Hono, Better Auth, AWS Blocks, and PlanetScale Postgres.

## Stack

- **Web:** TanStack Start, React, TanStack Router, Vite, Tailwind CSS
- **Mobile:** Expo and React Native
- **API:** Hono
- **Production backend:** AWS Blocks, AWS Lambda, API Gateway, CloudFront, and WebSocket realtime
- **Database:** PlanetScale Postgres
- **Database access:** Kysely with the PostgreSQL `pg` driver
- **Authentication:** Better Auth with its built-in PostgreSQL/Kysely adapter
- **Email:** Resend and React Email
- **Storage and caching:** provider integrations configured through the environment
- **Monorepo:** Bun workspaces and Turborepo
- **Quality:** TypeScript, Oxlint, Oxfmt, and Ultracite

## Repository layout

```text
chewbuu/
├── apps/
│   ├── web/              # TanStack Start web application
│   ├── native/           # Expo/React Native application
│   └── server/           # Hono API and Better Auth route mounting
├── packages/
│   ├── auth/             # Better Auth configuration and email flows
│   ├── aws-blocks/       # AWS Blocks API, realtime, CDK, and SQL migrations
│   ├── db/               # Shared pg pool, Kysely types, and migration runner
│   ├── emails/           # React Email templates
│   ├── env/              # Server/client environment validation
│   └── ui/               # Shared UI components and styles
├── .github/workflows/    # CI and production deployment workflows
└── vercel.json           # Vercel frontend configuration
```

## Getting started

Install dependencies from the repository root:

```bash
bun install
```

Start all development services:

```bash
bun run dev
```

The web, dating Expo, Sync Expo, and email preview apps use named Portless URLs when started through `bun run portless:dev`. The fixed AWS Blocks front door remains available at `http://localhost:3000`.

Start individual services when needed:

```bash
bun run dev:web
bun run dev:native
bun run dev:blocks
bun run portless:proxy
bun run portless:dev
```

The native app requires an Expo-compatible simulator or device. `bun run dev:blocks` starts or reuses the local `chewbuu-postgres` PostgreSQL container through Podman, waits for it to become ready, and then starts the Blocks front door. The Blocks local server uses local mocks and persists their data under `.bb-data/`.

`bun run portless:dev` starts the controllable web, Expo, and email-preview workspace apps through Portless, using named URLs from each package's `package.json` Portless settings and automatically assigned internal ports. Run `bun run dev:blocks` in a separate terminal when the apps need the local Blocks API. The regular package `dev` scripts remain unchanged for fixed-port startup, while Portless uses each package's `dev:portless` wrapper.

Portless uses HTTPS on port 443 by default and may ask to trust its local certificate authority on first use. Start its proxy before the workspace task. For a non-privileged HTTP pilot, run:

```bash
bun run portless:proxy -- --no-tls -p 1355
bun run portless:dev
```

The named web URL can use `/aws-blocks/api` as a same-origin path; the Vite development proxy forwards that path to the fixed Blocks front door on `http://127.0.0.1:3000`. Copy `apps/web/.env.example` to `apps/web/.env` when overriding local web variables. For physical Expo devices, use Portless LAN mode and configure the native `EXPO_PUBLIC_*` URLs explicitly; Portless does not rewrite those application API URLs.

## Environment configuration

Environment validation lives in `packages/env`. Use untracked environment files for local development and configure production values in the hosting provider or GitHub environment. Never commit connection strings, auth secrets, API keys, or provider certificates.

The database variables are:

| Variable | Use |
| --- | --- |
| `DATABASE_URL` | Application database URL used by Better Auth and local server code |
| `BLOCKS_DB_URL` | AWS Blocks runtime URL; use PlanetScale pooled port `6432` |
| `BLOCKS_MIGRATION_DB_URL` | Migration URL; use PlanetScale direct/session port `5432` |
| `DATABASE_CA_CERT` | Optional provider CA certificate when TLS verification needs a pinned CA |

For local work, `DATABASE_URL` can point to a local PostgreSQL instance. For a PlanetScale branch, keep the pooled and direct URLs separate and use the direct URL only for migrations.

## Authentication & OAuth configuration

Better Auth handles authentication via PostgreSQL adapter. When configuring Google Cloud OAuth credentials for domain `chewbuu.com`, register the following:

**Authorized JavaScript origins:**

- `https://chewbuu.com`
- `https://www.chewbuu.com`
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:5173`

**Authorized redirect URIs:**

- `https://chewbuu.com/api/auth/callback/google`
- `https://www.chewbuu.com/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3001/api/auth/callback/google`
- `http://localhost:5173/api/auth/callback/google`

## Database and migrations

Kysely is the only application database ORM. Better Auth uses its built-in Kysely/PostgreSQL adapter, and AWS Blocks uses its typed Kysely adapter. Drizzle is not part of the runtime or migration toolchain.

SQL migration history lives in one place:

```text
packages/aws-blocks/migrations/
```

The migration directory contains an immutable baseline followed by numbered and timestamped deltas. Migration state is stored in the PostgreSQL `_migrations` table.

Run migrations locally with a direct/session URL:

```bash
BLOCKS_MIGRATION_DB_URL='postgres://...:5432/...' bun run db:migrate
# Equivalent package-level command:
# (cd packages/aws-blocks && bun run db:migrate)
```

The `@aws-blocks/bb-data` CLI runner:

- forces migrations to the direct `5432` session port;
- serializes deploys with a PostgreSQL advisory lock;
- runs each migration transactionally;
- recognizes existing baseline tables during cutover;
- records successful files in `_migrations`; and
- verifies TLS using `DATABASE_CA_CERT` (the production workflow falls back to the runner system CA bundle).

Never edit an applied migration. Add a new timestamped `.sql` file, test it against an isolated database, and then deploy it through the production workflow.

## AWS Blocks production deployment

The production workflow is `.github/workflows/aws-blocks.yml`. It performs migrations before the AWS deployment:

```text
BLOCKS_MIGRATION_DB_URL: PlanetScale 5432 direct/session connection
        │
        └── @aws-blocks/bb-data migrate ./migrations --url "$BLOCKS_MIGRATION_DB_URL"

BLOCKS_DB_URL: PlanetScale 6432 pooled runtime connection
        │
        └── bun run aws:deploy
```

Required production database secrets:

- `BLOCKS_DB_URL`
- `BLOCKS_MIGRATION_DB_URL`

The migration credential needs DDL permissions. The runtime credential needs the application’s normal read/write permissions. AWS credentials are supplied through GitHub Enterprise OIDC; long-lived AWS access keys are not required.

Run a configured deployment manually with:

```bash
bun run aws:deploy
```

Use `bun run aws:sandbox` for an AWS Blocks sandbox deployment. Do not bypass the deployment wrapper with a raw `cdk deploy`, because the wrapper prepares the Blocks project context and hosting artifacts.

More backend-specific details are in [`packages/aws-blocks/README.md`](packages/aws-blocks/README.md). The redacted provider-key checklist is in [`docs/production-environment.md`](docs/production-environment.md).

## Vercel frontend deployment

The repository contains Vercel configuration, but it does not define a `bun run vercel` command. Use the linked Vercel project/dashboard or the Vercel CLI directly when required.

The frontend uses `VITE_BLOCKS_API_URL` when the AWS Blocks API is on another origin. AWS-hosted same-origin deployments use `VITE_SERVER_URL=/`.

## UI development

Shared UI primitives live in `packages/ui`:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components through the package boundary:

```tsx
import { Button } from "@chewbuu/ui/components/button";
```

## Available scripts

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start development tasks through Turborepo |
| `bun run dev:web` | Start the fixed-port web development task |
| `bun run dev:native` | Start the fixed-port dating Expo development task |
| `bun run dev:blocks` | Start local Postgres and the AWS Blocks server |
| `bun run portless:proxy` | Start the Portless local proxy |
| `bun run portless:dev` | Start named web/Expo/email apps through Portless |
| `bun run build` | Build workspace packages and applications |
| `bun run check` | Run Ultracite lint and format checks |
| `bun run fix` | Apply Ultracite fixes |
| `bun run check-types` | Typecheck the workspace |
| `bun test` | Run workspace tests |
| `bun run test:e2e` | Run Playwright browser tests |
| `bun run db:migrate` | Apply SQL migrations using the direct database URL |
| `bun run aws:sandbox` | Deploy an AWS Blocks sandbox |
| `bun run aws:deploy` | Deploy the production AWS Blocks stack |

There are intentionally no Drizzle schema-generation, database-studio, or `bun run vercel` scripts. Database changes are SQL migrations reviewed with the application code, and Vercel deployment is managed by the linked Vercel project.

## Checks before a pull request

```bash
bun run check
bun run check-types
bun test
```

For browser-facing changes, also run:

```bash
bun run test:e2e
```
