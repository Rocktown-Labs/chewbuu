import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

import { startDevServer } from "@aws-blocks/blocks/scripts";

const directory = import.meta.dirname;
const workspaceRoot = path.resolve(directory, "../../../..");
const localDatabaseUrl = "postgres://postgres:postgres@localhost:5432/chewbuu";
const databaseScript = path.join(
  workspaceRoot,
  "packages",
  "db",
  "scripts",
  "dev-postgres.mjs"
);

for (const envFile of [".env", "apps/server/.env"]) {
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

// Keep local development usable from a fresh checkout while preserving any
// explicitly configured development values. This secret is only a local fallback;
// production deployments must provide their own secret through the environment.
process.env.BETTER_AUTH_SECRET ??=
  "chewbuu-local-development-secret-do-not-use";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000/api/auth";
process.env.CORS_ORIGIN ??= "http://localhost:3000";
process.env.DATABASE_URL ??= localDatabaseUrl;
process.env.BLOCKS_MIGRATION_DB_URL ??= localDatabaseUrl;

const databaseProcess = spawn(
  process.platform === "win32" ? "bun.exe" : "bun",
  [databaseScript],
  {
    cwd: workspaceRoot,
    env: process.env,
    stdio: ["inherit", "pipe", "inherit"],
  }
);

const waitForDatabase = (child: ChildProcess): Promise<null> => {
  const { promise, reject, resolve } = Promise.withResolvers<null>();
  let settled = false;
  let output = "";

  const finish = (error?: Error) => {
    if (settled) return;
    settled = true;
    child.off("error", onError);
    child.off("exit", onExit);
    if (error) {
      reject(error);
    } else {
      resolve(null);
    }
  };

  const onOutput = (chunk: Buffer | string) => {
    const text = chunk.toString();
    process.stdout.write(text);
    output = `${output}${text}`.slice(-2000);
    if (output.includes("[postgres] tailing logs")) {
      finish();
    }
  };

  const onError = (error: Error) => finish(error);
  const onExit = (code: number | null, signal: NodeJS.Signals | null) =>
    finish(
      new Error(
        `The local database process exited before becoming ready (${code ?? signal ?? "unknown"}).`
      )
    );

  child.stdout?.on("data", onOutput);
  child.once("error", onError);
  child.once("exit", onExit);

  return promise;
};

let shuttingDown = false;
const stopDatabase = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  databaseProcess.kill("SIGTERM");
};

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.once(signal, stopDatabase);
}
process.once("exit", stopDatabase);

databaseProcess.once("exit", (code, signal) => {
  if (shuttingDown || code === 0) return;
  console.error(
    `The local database process exited unexpectedly (${code ?? signal ?? "unknown"}).`
  );
  process.exit(code ?? 1);
});

try {
  await waitForDatabase(databaseProcess);
} catch (error) {
  stopDatabase();
  throw error;
}

await startDevServer({
  backendPath: path.join(directory, "..", "..", "src", "index.blocks.ts"),
  frontendCommand: "bun run --cwd apps/web dev --host 127.0.0.1 --port 3001",
  frontendPort: 3001,
  port: 3000,
});
