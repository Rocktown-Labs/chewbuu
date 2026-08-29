#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CONTAINER = "chewbuu-postgres";
const IMAGE = "docker.io/library/postgres:16";
const PORT = "5432";
const PASSWORD = "postgres";
const USER = "postgres";
const DB = "chewbuu";

const podman = (args) => {
  try {
    return execSync(`podman ${args}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
};

const log = (msg) => console.log(`[postgres] ${msg}`);

// 1. Ensure podman machine is running (macOS applehv)
try {
  const machines = execSync("podman machine list --format json 2>/dev/null", {
    encoding: "utf8",
  });
  const list = JSON.parse(machines || "[]");
  const def = list.find((m) => m.Name === "podman-machine-default");
  if (def && def.State !== "Running" && def.Starting !== true) {
    log("starting podman machine...");
    execSync("podman machine start", { stdio: "inherit" });
  }
} catch {
  // ignore — podman may be native (linux) or already running
}

// 2. Ensure container exists
const exists = podman(`inspect ${CONTAINER} --format "{{.State.Status}}"`);
if (!exists) {
  log(`creating ${CONTAINER} from ${IMAGE}...`);
  execSync(
    `podman run -d --name ${CONTAINER} -e POSTGRES_PASSWORD=${PASSWORD} -e POSTGRES_USER=${USER} -e POSTGRES_DB=${DB} -p ${PORT}:5432 -v chewbuu-pgdata:/var/lib/postgresql/data ${IMAGE}`,
    { stdio: "inherit" }
  );
} else if (exists !== "running") {
  log(`starting existing ${CONTAINER} (${exists})...`);
  execSync(`podman start ${CONTAINER}`, { stdio: "inherit" });
} else {
  log(`${CONTAINER} already running`);
}

const waitForReady = async () => {
  log("waiting for postgres to be ready...");
  for (let i = 0; i < 30; i += 1) {
    const ready = podman(`exec ${CONTAINER} pg_isready -U ${USER} -d ${DB}`);
    if (ready && ready.includes("accepting connections")) {
      log("postgres ready");
      return true;
    }
    await sleep(1000);
  }

  log("warning: postgres not ready after 30s, continuing anyway");
  return false;
};

// 3. Wait for readiness (up to 30s)
await waitForReady();

// 4. The Blocks Postgres adapter uses TLS for direct PostgreSQL connections.
// Enable a disposable self-signed certificate in the managed local container so
// local API calls and migrations exercise the same encrypted connection path.
const SSL_CERT = "/var/lib/postgresql/data/server.crt";
const SSL_KEY = "/var/lib/postgresql/data/server.key";
const hasLocalCertificate = podman(
  `exec ${CONTAINER} sh -c "test -s ${SSL_CERT} && test -s ${SSL_KEY} && echo ready"`
);

if (!hasLocalCertificate) {
  log("generating local PostgreSQL TLS certificate...");
  execSync(
    `podman exec ${CONTAINER} openssl req -new -x509 -nodes -days 3650 -subj "/CN=chewbuu.local" -keyout ${SSL_KEY} -out ${SSL_CERT}`,
    { stdio: "inherit" }
  );
  execSync(
    `podman exec ${CONTAINER} chown postgres:postgres ${SSL_CERT} ${SSL_KEY}`,
    { stdio: "inherit" }
  );
  execSync(`podman exec ${CONTAINER} chmod 600 ${SSL_KEY}`, {
    stdio: "inherit",
  });
}

const sslStatus = podman(
  `exec ${CONTAINER} psql -U ${USER} -d ${DB} -Atc "show ssl"`
);
if (sslStatus !== "on") {
  log("enabling local PostgreSQL TLS...");
  for (const setting of [
    "ssl = 'on'",
    `ssl_cert_file = '${SSL_CERT}'`,
    `ssl_key_file = '${SSL_KEY}'`,
  ]) {
    execSync(
      `podman exec ${CONTAINER} psql -U ${USER} -d ${DB} -v ON_ERROR_STOP=1 -c "ALTER SYSTEM SET ${setting};"`,
      { stdio: "inherit" }
    );
  }
  execSync(`podman restart ${CONTAINER}`, { stdio: "inherit" });
  await waitForReady();
}

// 5. Auto-migrate if DATABASE_URL points to localhost
const dbUrl =
  process.env.DATABASE_URL ||
  `postgres://${USER}:${PASSWORD}@localhost:${PORT}/${DB}`;
const isLocal =
  dbUrl.includes("localhost:5432") || dbUrl.includes("127.0.0.1:5432");
if (isLocal) {
  try {
    log("running migrations...");
    execSync("bun run db:migrate", {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
        BLOCKS_MIGRATION_DB_URL: dbUrl,
      },
    });
    log("migrations done");
  } catch (error) {
    log(`migrations failed (will retry on next restart): ${error.message}`);
  }
}

// 5. Tail logs persistently (this keeps turbo pane alive)
log(`tailing logs — container ${CONTAINER} on localhost:${PORT} (db: ${DB})`);
const tail = spawn("podman", ["logs", "-f", CONTAINER], { stdio: "inherit" });
tail.on("close", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => tail.kill("SIGINT"));
process.on("SIGTERM", () => tail.kill("SIGTERM"));
