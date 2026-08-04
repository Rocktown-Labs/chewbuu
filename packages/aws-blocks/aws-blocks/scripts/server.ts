import path from "node:path";

import { startDevServer } from "@aws-blocks/blocks/scripts";

const directory = import.meta.dirname;

try {
  process.loadEnvFile("apps/server/.env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

await startDevServer({
  backendPath: path.join(directory, "..", "..", "src", "index.blocks.ts"),
  frontendCommand: "bun run --cwd apps/web dev --host 127.0.0.1 --port 3001",
  frontendPort: 3001,
  port: 3000,
});
