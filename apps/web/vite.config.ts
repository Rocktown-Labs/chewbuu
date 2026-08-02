import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      port: 3001,
    },
    resolve: {
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
    ssr: {
      noExternal: true,
    },
  };
});
