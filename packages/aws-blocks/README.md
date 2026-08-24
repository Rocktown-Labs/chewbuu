# Chewbuu AWS Blocks

This package owns the AWS Blocks backend boundary. The local Blocks server runs the same `ApiNamespace` and `Realtime` declarations that are deployed through CDK and Lambda.

## Local development

Run `bun run dev:blocks` from the repository root. The Blocks front door runs on `http://localhost:3000` and proxies the TanStack Start app on port `3001`.

Realtime is transport only. Chat messages are written to PostgreSQL through Blocks `Database`/Kysely before they are published, and clients must re-read history after a reconnect because AWS Blocks Realtime does not provide replay or delivery guarantees.

The existing PostgreSQL schema was introspected with the `bb-data` pull generator. Generated table types and metadata live under `generated/`; the application query layer uses the Blocks Kysely adapter. Better Auth uses the shared Drizzle adapter against the same database.

PlanetScale Postgres is external to the AWS stack. Runtime traffic uses the pooled connection URL on port `6432`; production migrations use a direct connection URL on port `5432`. The deploy script writes `BLOCKS_DB_URL` to a stack-scoped SSM SecureString. Set `DATABASE_CA_CERT` or commit the provider CA in `generated/database.ca.ts` when the provider requires a custom certificate.

The GitHub Actions deployment expects a `production` environment with `AWS_ROLE_ARN`, `BLOCKS_DB_URL`, and `BLOCKS_MIGRATION_DB_URL` secrets, plus an `AWS_REGION` variable. GitHub OIDC is used; no long-lived AWS access key is required.

## Deployment topology

Vercel remains the TanStack Start frontend and continues to provide GitHub PR previews. Set `BLOCKS_API_URL` in each Vercel environment; the web build exposes it as `VITE_BLOCKS_API_URL`. Deploy the Blocks API and WebSocket infrastructure with `bun run aws:deploy` using AWS credentials or an OIDC-backed CI role.

The target database is PlanetScale Postgres. Populate a fresh instance with the baseline and raw migrations before cutover; subsequent schema changes belong in `migrations/` and are applied by the Blocks external-database deployment lifecycle. PlanetScale can reuse the generated types and `fromExisting()` connection without changing the API contract.
