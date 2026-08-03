# Chewbuu AWS Blocks

This package owns the AWS Blocks backend boundary. The local Blocks server runs the same `ApiNamespace` and `Realtime` declarations that are deployed through CDK and Lambda.

## Local development

Run `bun run dev:blocks` from the repository root. The Blocks front door runs on `http://localhost:3000` and proxies the TanStack Start app on port `3001`.

Realtime is transport only. Chat messages are written to PostgreSQL through Blocks `Database`/Kysely before they are published, and clients must re-read history after a reconnect because AWS Blocks Realtime does not provide replay or delivery guarantees.

The existing Neon schema was introspected with the `bb-data` pull generator. Generated table types and metadata live under `generated/`; the application query layer uses the Blocks Kysely adapter. Better Auth still uses its existing Drizzle adapter against the same database until its adapter can be migrated independently.

The current Neon database is external to the AWS stack. Before deploying, provision the connection string in SSM as the parameter named by `BLOCKS_DB_PARAMETER_NAME` (default `/chewbuu/production/database-url`). Set `DATABASE_CA_CERT` or commit the provider CA in `generated/database.ca.ts` so Lambda verifies the database certificate.

## Deployment topology

Vercel remains the TanStack Start frontend and continues to provide GitHub PR previews. Set `BLOCKS_API_URL` in each Vercel environment; the web build exposes it as `VITE_BLOCKS_API_URL`. Deploy the Blocks API and WebSocket infrastructure with `bun run aws:deploy` using AWS credentials or an OIDC-backed CI role.

The current database remains Neon/Postgres with the existing schema and data. New schema changes belong in `migrations/` and are applied by the Blocks external-database deployment lifecycle. A future PlanetScale Postgres move can reuse the generated types and `fromExisting()` connection without changing the API contract.
