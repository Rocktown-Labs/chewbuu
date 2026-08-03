# Chewbuu AWS Blocks

This package owns the AWS Blocks backend boundary. The local Blocks server runs the same `ApiNamespace` and `Realtime` declarations that are deployed through CDK and Lambda.

## Local development

Run `bun run dev:blocks` from the repository root. The Blocks front door runs on `http://localhost:3000` and proxies the TanStack Start app on port `3001`.

Realtime is transport only. Chat messages are written to Neon/Drizzle before they are published, and clients must re-read history after a reconnect because AWS Blocks Realtime does not provide replay or delivery guarantees.

## Deployment topology

Vercel remains the TanStack Start frontend and continues to provide GitHub PR previews. Set `BLOCKS_API_URL` in each Vercel environment; the web build exposes it as `VITE_BLOCKS_API_URL`. Deploy the Blocks API and WebSocket infrastructure with `bun run aws:deploy` using AWS credentials or an OIDC-backed CI role.

The current database remains Neon/Postgres with the existing Drizzle schema and migrations. This is intentional: `bb-data` uses Kysely and would otherwise introduce a second migration system. A future Aurora/Kysely migration should be a separate, data-migration project rather than part of the realtime cutover.
