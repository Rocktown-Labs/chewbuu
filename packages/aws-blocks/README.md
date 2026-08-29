# Chewbuu AWS Blocks backend

`packages/aws-blocks` is the production backend boundary for Chewbuu. It contains the AWS Blocks API, realtime declarations, Lambda/CDK deployment entrypoints, and the Kysely query layer used by the backend.

## Architecture

- **AWS Blocks** provides the API, Lambda hosting, CloudFront, WebSocket realtime, and deployment infrastructure.
- **PlanetScale Postgres** is an external database. AWS does not provision or own the database cluster.
- **Kysely** is the application query layer. `packages/aws-blocks/src/database.ts` exposes the typed `Kysely<BlocksDatabase>` adapter created by `@aws-blocks/bb-data`.
- **Better Auth** uses the shared PostgreSQL/Kysely database layer from `packages/db`.
- **Migrations** are plain SQL files in `packages/aws-blocks/migrations/`. They are applied by `packages/db/src/migrate.ts` before the AWS deployment.

The database is intentionally accessed through two connection modes:

| Use | PlanetScale port | Secret | Reason |
| --- | --: | --- | --- |
| Application/runtime traffic | `6432` | `BLOCKS_DB_URL` | Pooled connections for Lambda and web requests |
| Schema migrations | `5432` | `BLOCKS_MIGRATION_DB_URL` | Stable session for DDL and advisory locking |

Do not commit either connection string. Store them in the GitHub `production` environment or in an untracked local environment file.

## Local development

Install dependencies from the repository root:

```bash
bun install
```

Start the AWS Blocks local server and database:

```bash
bun run dev:blocks
```

The command starts or reuses the `chewbuu-postgres` PostgreSQL container through Podman, enables its disposable local TLS certificate, waits for PostgreSQL to be ready, and then starts the Blocks front door. The front door listens on `http://localhost:3000` and proxies the TanStack Start application on port `3001`. Local Blocks mocks persist under `.bb-data/`. Missing local auth values receive development-only defaults; production deployments still require explicit secrets.

For the complete application development environment, use:

```bash
bun run dev
```

The web, dating Expo, Sync Expo, and email-preview packages expose `dev:portless` wrappers while keeping their regular `dev` scripts unchanged for fixed-port startup. Start the Portless proxy and named workspace services explicitly with:

```bash
bun run portless:proxy
bun run portless:dev
```

Podman must be installed for the managed local database (`podman machine init` is only needed for a first-time setup). If `DATABASE_URL` is not configured, the dev server defaults to `postgres://postgres:postgres@localhost:5432/chewbuu`; an explicit local or disposable PlanetScale development URL is preserved. The managed container stores a self-signed certificate in its persistent data volume because the Blocks PostgreSQL adapter requires a TLS handshake. Local certificate verification is disabled only for loopback URLs; production verification remains strict. Never put credentials in committed `.env.example` files or source code.

Keep `bun run dev:blocks` running separately for the fixed Blocks front door and database. The web development proxy forwards `/aws-blocks` requests to `http://127.0.0.1:3000`.

## Database migrations

Migration history has one source of truth: `packages/aws-blocks/migrations/`.

- `000_baseline.sql` creates the original application and Better Auth schema.
- The numbered and timestamped files apply subsequent Better Auth, dating, profile, chat, notification, and matching changes.
- `20260801091000_chat_read_state_primary_key.sql` fixes the legacy chat read-state primary key after the chat tables exist.
- Migration state is stored in the PostgreSQL `_migrations` table.

Run migrations locally with the direct/session connection:

```bash
BLOCKS_MIGRATION_DB_URL='postgres://...:5432/...' bun run db:migrate
```

The runner:

1. Rewrites the migration URL to port `5432`.
2. Takes a PostgreSQL advisory lock so concurrent deploys cannot migrate simultaneously.
3. Runs each SQL file in lexical order, inside a transaction.
4. Records successful files in `_migrations`.
5. Recognizes the previous `schema_migrations` table and the old baseline tables when upgrading an existing database.
6. Reports PostgreSQL error codes, details, hints, tables, columns, and constraints without printing credentials.

Migration files are immutable once applied. Add a new timestamped SQL file for every schema change. Prefer idempotent SQL (`IF NOT EXISTS`, `IF EXISTS`) for changes that may be replayed while moving an existing database.

## Production deployment

The GitHub Actions workflow `.github/workflows/aws-blocks.yml`:

1. Authenticates to AWS with GitHub Enterprise OIDC.
2. Runs `bun run db:migrate` using `BLOCKS_MIGRATION_DB_URL` on port `5432`.
3. Deploys AWS Blocks with `BLOCKS_DB_URL` on port `6432` as the runtime connection.
4. Stores the runtime database URL in the stack-scoped SSM parameter used by the Lambdas.
5. Deploys the API, realtime infrastructure, and optional frontend hosting.

The production GitHub environment requires:

- `AWS_ROLE_ARN`
- `BLOCKS_DB_URL`
- `BLOCKS_MIGRATION_DB_URL`
- `BETTER_AUTH_SECRET`
- the application provider secrets listed in the workflow

The database migration credential must be able to create and alter tables, indexes, constraints, and the `_migrations` table. Runtime credentials must be able to perform the application queries required by the API and Better Auth.

Deploy manually only from a configured AWS account and with the same environment variables as CI:

```bash
bun run aws:deploy
```

Do not run `cdk deploy` directly; the Blocks deployment script prepares the CDK context, frontend bundle, and environment wiring.

## Vercel

Vercel is used for web previews and the TanStack Start frontend workflow. AWS Blocks is the production API and realtime boundary. This repository does not define a `bun run vercel` script; use the Vercel dashboard or the repository's configured Vercel integration for frontend deployments.

Set the frontend's `VITE_BLOCKS_API_URL` to the deployed Blocks API URL when the frontend and backend use different origins. For same-origin AWS hosting, the workflow uses `VITE_SERVER_URL=/`.

## Important files

- `src/database.ts` — external PlanetScale connection and typed Kysely adapter.
- `src/index.blocks.ts` — API/realtime composition and runtime environment setup.
- `aws-blocks/index.cdk.ts` — CDK stack and hosting configuration.
- `aws-blocks/scripts/deploy.ts` — production deployment entrypoint.
- `aws-blocks/scripts/server.ts` — local Blocks server entrypoint.
- `migrations/` — immutable SQL migration history.
- `generated/` — generated database metadata and provider CA material.

## Checks

Run repository checks from the root:

```bash
bun run check
bun run check-types
bun test
```

For a deployment change, also verify the CloudFormation stack state and inspect the migration output before investigating application-level failures.
