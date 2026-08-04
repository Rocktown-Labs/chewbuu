import { defineConfig } from "nitro";

export default defineConfig({
  experimental: {
    asyncContext: true,
  },
  errorHandler: "./server/error-handler",
  modules: [],
});
