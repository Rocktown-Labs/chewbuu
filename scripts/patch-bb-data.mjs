#!/usr/bin/env node
// Durable patch for local podman postgres without SSL — makes `ssl:false` actually disable TLS.
// Without this, `mockExternalSsl(false)` returns unverified SSL which fails against `ssl=off` postgres.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const patches = [
  {
    file: "packages/aws-blocks/node_modules/@aws-blocks/bb-data/dist/external-ssl.js",
    find: "export function externalDbSsl(opts = {}) {\n    const source = process.env.DATABASE_CA_CERT;",
    replace:
      'export function externalDbSsl(opts = {}) {\n    // Local dev: localhost postgres via podman has no SSL — disable TLS entirely\n    const url = process.env.BLOCKS_MIGRATION_DB_URL || process.env.DATABASE_URL || "";\n    if (url.includes("localhost") || url.includes("127.0.0.1") || url.includes("host.docker.internal")) {\n        return false;\n    }\n    const source = process.env.DATABASE_CA_CERT;',
  },
  {
    file: "packages/aws-blocks/node_modules/@aws-blocks/bb-data/dist/engines/pg-client-engine.js",
    find: "        const baseSsl = config.ssl ?? { rejectUnauthorized: true };\n        this.pool = new pg.Pool({\n            connectionString,\n            max: config.poolSize ?? 5,\n            ssl: { minVersion: 'TLSv1.2', ...baseSsl },",
    replace:
      "        const baseSsl = config.ssl === false ? false : (config.ssl ?? { rejectUnauthorized: true });\n        this.pool = new pg.Pool({\n            connectionString,\n            max: config.poolSize ?? 5,\n            ssl: baseSsl === false ? false : { minVersion: 'TLSv1.2', ...baseSsl },",
  },
  {
    file: "packages/aws-blocks/node_modules/@aws-blocks/bb-data/dist/index.mock.js",
    find: "function mockExternalSsl(ssl) {\n    if (ssl)\n        return ssl;",
    replace:
      "function mockExternalSsl(ssl) {\n    if (ssl === false) return false;\n    if (ssl)\n        return ssl;",
  },
];

for (const { file, find, replace } of patches) {
  if (!existsSync(file)) {
    console.warn(`[patch-bb-data] skip ${file} (not found)`);
    continue;
  }
  const content = readFileSync(file, "utf8");
  if (content.includes(replace.slice(0, 20))) {
    console.log(`[patch-bb-data] ${file} already patched`);
    continue;
  }
  if (!content.includes(find)) {
    console.warn(`[patch-bb-data] ${file} pattern not found, skipping`);
    continue;
  }
  writeFileSync(file, content.replace(find, replace));
  console.log(`[patch-bb-data] patched ${file}`);
}
