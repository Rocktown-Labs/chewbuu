import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

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

// Usage:
//   bun run dev:blocks (repo root) — standalone: manages postgres + frontend.
//   turbo dev (aws-blocks#dev)     — composed: pass --no-postgres --no-frontend
//     so postgres comes from @chewbuu/db#dev and the UI from web#dev instead of
//     spawning duplicates that fight over ports and container names.
const cliFlags = new Set(process.argv.slice(2));
const managePostgres = !cliFlags.has("--no-postgres");
const manageFrontend = !cliFlags.has("--no-frontend");

const parseTcpEndpoint = (url: string | undefined, fallbackPort: number) => {
  try {
    if (!url) throw new Error("empty database URL");
    const parsed = new URL(url);
    const port = parsed.port ? Math.trunc(Number(parsed.port)) : fallbackPort;
    return {
      host: parsed.hostname || "localhost",
      port: Number.isFinite(port) ? port : fallbackPort,
    };
  } catch {
    return { host: "localhost", port: fallbackPort };
  }
};

const isTcpOpen = async (
  host: string,
  port: number,
  timeoutMs = 1500
): Promise<boolean> => {
  const socket = new net.Socket();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    socket.connect(port, host);
    await once(socket, "connect", { signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    socket.destroy();
  }
};

const waitForTcp = async (
  host: string,
  port: number,
  attempts: number,
  delayMs: number
): Promise<boolean> => {
  let remaining = attempts;
  while (remaining > 0) {
    if (await isTcpOpen(host, port)) return true;
    await sleep(delayMs);
    remaining -= 1;
  }
  return false;
};

const dbEndpoint = parseTcpEndpoint(process.env.DATABASE_URL, 5432);

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
  // If our managed postgres exits before reporting readiness, it may have
  // lost a race with an externally managed container (same container name).
  // When the port answers anyway, someone else owns a healthy database, so
  // continue instead of crashing.
  const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
    void (async () => {
      if (await isTcpOpen(dbEndpoint.host, dbEndpoint.port)) {
        console.log(
          "[blocks] postgres reachable externally; continuing without managed container."
        );
        finish();
        return;
      }
      finish(
        new Error(
          `The local database process exited before becoming ready (${code ?? signal ?? "unknown"}).`
        )
      );
    })();
  };

  child.stdout?.on("data", onOutput);
  child.once("error", onError);
  child.once("exit", onExit);

  return promise;
};

let shuttingDown = false;
let stopDatabase = () => {};

const startManagedPostgres = () => {
  const databaseProcess = spawn(
    process.platform === "win32" ? "bun.exe" : "bun",
    [databaseScript],
    {
      cwd: workspaceRoot,
      env: process.env,
      stdio: ["inherit", "pipe", "inherit"],
    }
  );

  stopDatabase = () => {
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

  return waitForDatabase(databaseProcess);
};

if (managePostgres) {
  try {
    await startManagedPostgres();
  } catch (error) {
    stopDatabase();
    throw error;
  }
} else {
  console.log(
    `[blocks] postgres managed externally; waiting for ${dbEndpoint.host}:${dbEndpoint.port}...`
  );
  const ready = await waitForTcp(dbEndpoint.host, dbEndpoint.port, 120, 1000);
  if (!ready) {
    throw new Error(
      `Postgres not reachable at ${dbEndpoint.host}:${dbEndpoint.port} after 120s. ` +
        "Start it via the db task (bun run dev includes it) or run this script without --no-postgres."
    );
  }
  console.log(
    "[blocks] postgres reachable; continuing without spawning a container."
  );
}

await startDevServer({
  backendPath: path.join(directory, "..", "..", "src", "index.blocks.ts"),
  // Bind LAN (not loopback) so physical devices running Expo Go can reach the
  // web frontend/auth at :3001. Expo/Metro already binds LAN by default.
  ...(manageFrontend
    ? {
        frontendCommand:
          "bun run --cwd apps/web dev --host 0.0.0.0 --port 3001",
      }
    : {}),
  frontendPort: 3001,
  port: 3000,
});

if (!manageFrontend) {
  console.log(
    "[blocks] frontend managed externally (turbo web pane); serving API only until it arrives."
  );
}
