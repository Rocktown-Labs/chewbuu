import path from "node:path";

import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

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

  return {
    server: {
      port: 3001,
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
