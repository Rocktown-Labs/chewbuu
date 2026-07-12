import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run build && bun run serve -- --host 127.0.0.1 --port 3001",
    env: {
      VITE_SERVER_URL: "http://127.0.0.1:3000",
    },
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:3001",
  },
});
