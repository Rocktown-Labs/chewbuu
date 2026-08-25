import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

import { normalizeConnectionString } from "./connection-string";

type PgError = Error & {
  code?: string;
  column?: string;
  constraint?: string;
  detail?: string;
  hint?: string;
  position?: string;
  table?: string;
};

const migrationsDirectory = path.resolve(
  import.meta.dirname,
  "../../aws-blocks/migrations"
);
const baselineFile = "000_baseline.sql";
const migrationUrl = normalizeConnectionString(
  process.env.BLOCKS_MIGRATION_DB_URL ?? process.env.DATABASE_URL
);

if (!migrationUrl) {
  throw new Error(
    "BLOCKS_MIGRATION_DB_URL or DATABASE_URL is required to run database migrations."
  );
}

const toSessionUrl = (connectionString: string): string => {
  const url = new URL(connectionString);
  url.port = "5432";
  // PlanetScale's CLI uses `sslrootcert=system` to mean the OS trust store.
  // node-postgres interprets that value as a literal file path instead.
  if (url.searchParams.get("sslrootcert")?.toLowerCase() === "system") {
    url.searchParams.delete("sslrootcert");
  }
  return url.toString();
};

const migrationFiles = async (): Promise<string[]> => {
  const files = await readdir(migrationsDirectory);
  return files.filter((file) => file.endsWith(".sql")).toSorted();
};

const createdTables = (sql: string): string[] => {
  const tables: string[] = [];
  for (const match of sql.matchAll(/CREATE\s+TABLE\s+"(?<table>[^"]+)"/gi)) {
    const table = match.groups?.table;
    if (table) {
      tables.push(table);
    }
  }
  return tables;
};

const hasTable = async (client: Client, table: string): Promise<boolean> => {
  const result = await client.query(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [`public.${table}`]
  );
  return result.rows[0]?.exists === true;
};

const hasColumn = async (
  client: Client,
  table: string,
  column: string
): Promise<boolean> => {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS exists
    `,
    [table, column]
  );
  return result.rows[0]?.exists === true;
};

const markApplied = async (client: Client, name: string): Promise<void> => {
  await client.query(
    `
      INSERT INTO "_migrations" (name)
      VALUES ($1)
      ON CONFLICT (name) DO NOTHING
    `,
    [name]
  );
};

const initializeTracking = async (
  client: Client,
  files: string[],
  baselineSql: string
): Promise<void> => {
  const trackingTable = await client.query(
    "SELECT to_regclass('public._migrations') IS NOT NULL AS exists"
  );
  if (trackingTable.rows[0]?.exists === true) {
    return;
  }

  await client.query(`
    CREATE TABLE "_migrations" (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const expectedBaselineTables = createdTables(baselineSql);
  const existingTables = await client.query<{ tablename: string }>(
    `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE '\\_%'
    `
  );
  const existing = new Set(existingTables.rows.map((row) => row.tablename));
  const presentBaselineTables = expectedBaselineTables.filter((table) =>
    existing.has(table)
  );

  if (
    presentBaselineTables.length > 0 &&
    presentBaselineTables.length < expectedBaselineTables.length
  ) {
    throw new Error(
      `Cannot initialize migrations: the database is partially populated. ` +
        `Expected either an empty database or the complete ${baselineFile} schema.`
    );
  }

  if (presentBaselineTables.length === expectedBaselineTables.length) {
    await markApplied(client, baselineFile);
    console.log(`recognized existing schema; marked ${baselineFile} applied`);
  }

  if (await hasTable(client, "passkey")) {
    const legacyFoundationTables = [
      "passkey",
      "circle",
      "circle_member",
      "referral",
    ];
    const foundationState = await Promise.all(
      legacyFoundationTables.map((table) => hasTable(client, table))
    );
    const presentFoundationTables = foundationState.filter(Boolean).length;
    if (
      presentFoundationTables > 0 &&
      presentFoundationTables < legacyFoundationTables.length
    ) {
      throw new Error(
        "Cannot initialize migrations: the Better Auth/application foundation is partially populated."
      );
    }
    if (presentFoundationTables === legacyFoundationTables.length) {
      await markApplied(client, "001_messy_vengeance.sql");
    }
  }

  if (await hasColumn(client, "passkey", "aaguid")) {
    await markApplied(client, "002_passkey_aaguid.sql");
  }

  if (await hasTable(client, "schema_migrations")) {
    const legacyRows = await client.query<{ name: string }>(
      'SELECT "name" FROM "schema_migrations"'
    );
    const knownFiles = new Set(files);
    for (const row of legacyRows.rows) {
      if (knownFiles.has(row.name)) {
        await markApplied(client, row.name);
      }
    }
  }
};

const describePostgresError = (context: string, error: unknown): Error => {
  const postgresError = error as PgError;
  const details = [
    postgresError.code && `code=${postgresError.code}`,
    postgresError.message,
    postgresError.detail && `detail=${postgresError.detail}`,
    postgresError.hint && `hint=${postgresError.hint}`,
    typeof postgresError.table === "string" && `table=${postgresError.table}`,
    typeof postgresError.column === "string" &&
      `column=${postgresError.column}`,
    typeof postgresError.constraint === "string" &&
      `constraint=${postgresError.constraint}`,
  ].filter(Boolean);
  return new Error(`${context}: ${details.join("; ")}`);
};

const describeMigrationError = (file: string, error: unknown): Error =>
  describePostgresError(`Migration ${file} failed`, error);

const migrate = async (): Promise<void> => {
  const files = await migrationFiles();
  const baselineSql = await readFile(
    path.join(migrationsDirectory, baselineFile),
    "utf8"
  );
  const client = new Client({ connectionString: toSessionUrl(migrationUrl) });

  try {
    await client.connect();
  } catch (error) {
    throw describePostgresError("Database connection failed", error);
  }

  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [
      "chewbuu:database-migrations",
    ]);
    await initializeTracking(client, files, baselineSql);

    const appliedRows = await client.query<{ name: string }>(
      'SELECT name FROM "_migrations"'
    );
    const applied = new Set(appliedRows.rows.map((row) => row.name));
    let appliedCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const sql = await readFile(path.join(migrationsDirectory, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await markApplied(client, file);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw describeMigrationError(file, error);
      }
      appliedCount += 1;
      console.log(`applied ${file}`);
    }

    console.log(
      appliedCount === 0
        ? "database migrations are up to date"
        : `applied ${appliedCount} database migration(s)`
    );
  } finally {
    await client
      .query("SELECT pg_advisory_unlock(hashtext($1))", [
        "chewbuu:database-migrations",
      ])
      .catch(() => {});
    await client.end();
  }
};

await migrate();
