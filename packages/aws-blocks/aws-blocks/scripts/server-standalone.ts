import path from "node:path";

import { startDevServer } from "@aws-blocks/blocks/scripts";

const directory = import.meta.dirname;

for (const p of [
  path.join(directory, "../../../../.env"),
  path.join(directory, "../../../../apps/server/.env"),
  path.join(directory, "../../../../apps/web/.env"),
]) {
  try {
    process.loadEnvFile(p);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

// Standalone API only — frontend is run as a separate turbo pane (apps/web)
// so we don't spawn vite twice when `turbo run dev` runs both @chewbuu/aws-blocks and web.
await startDevServer({
  backendPath: path.join(directory, "..", "..", "src", "index.blocks.ts"),
  frontendCommand: undefined as unknown as string,
  frontendPort: 3001,
  port: 3000,
});
