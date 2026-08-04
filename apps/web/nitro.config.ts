import evlog from "evlog/nitro/v3";
import { defineConfig } from "nitro";

export default defineConfig({
  experimental: {
    asyncContext: true,
  },
  errorHandler: "./server/error-handler",
  modules: [
    evlog({
      env: { service: "chewbuu-web" },
    }),
  ],
});
