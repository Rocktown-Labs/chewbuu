import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Client } from "pg";

const migrationsDir = path.join(import.meta.dirname, "../src/migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required to run raw migrations");
}

const client = new Client({ connectionString: url });
await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "schema_migrations" (
      "name" text PRIMARY KEY,
      "applied_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  const appliedRows = await client.query(
    'SELECT "name" FROM "schema_migrations"'
  );
  const applied = new Set(appliedRows.rows.map((row) => row.name));

  const files = readdirSync(migrationsDir)
    .filter((file) => /^\d{14}_.+\.sql$/.test(file))
    .toSorted();

  let appliedCount = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const content = readFileSync(path.join(migrationsDir, file), "utf8");
    const statements = content
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query('INSERT INTO "schema_migrations" ("name") VALUES ($1)', [
      file,
    ]);
    appliedCount += 1;
    console.log(`applied ${file}`);
  }

  console.log(
    `raw migrations ${appliedCount === 0 ? "up to date" : `applied ${appliedCount}`}`
  );
} finally {
  await client.end();
}
