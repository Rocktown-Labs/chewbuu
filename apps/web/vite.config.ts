import path from "node:path";

import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

try {
  process.loadEnvFile(
    path.resolve(import.meta.dirname, "../../apps/server/.env")
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const nodeObservabilityDependencies = [
    "@opentelemetry/api",
    "@opentelemetry/core",
    "@opentelemetry/resources",
    "@opentelemetry/sdk-trace-base",
    "@opentelemetry/semantic-conventions",
    "import-in-the-middle",
    "require-in-the-middle",
  ];

  const devPort = Number(process.env.PORT) || 3001;
  const blocksDevTarget = env.BLOCKS_DEV_API_URL ?? "http://127.0.0.1:3000";

  return {
    server: {
      port: devPort,
      proxy: {
        "/aws-blocks": {
          changeOrigin: true,
          target: blocksDevTarget,
          ws: true,
        },
      },
    },
    resolve: {
      alias: {
        "@chewbuu/aws-blocks": path.resolve(
          import.meta.dirname,
          "../../packages/aws-blocks/src",
          mode === "production" ? "client.aws.ts" : "client.ts"
        ),
      },
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      tanstackStart(),
      nitro(),
      viteReact(),
      ...(env.SENTRY_AUTH_TOKEN
        ? [
            sentryTanstackStart({
              org: "rocktown-labs-tq",
              project: "chewbuu-web",
              authToken: env.SENTRY_AUTH_TOKEN,
            }),
          ]
        : []),
    ],
    // Bundle all SSR deps: Vercel functions have no node_modules at runtime
    ssr:
      mode === "production"
        ? {
            external: ["@chewbuu/auth"],
            noExternal: nodeObservabilityDependencies,
          }
        : {},
  };
});
