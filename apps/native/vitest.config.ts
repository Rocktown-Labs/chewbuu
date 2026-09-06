import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: {
      "@": import.meta.dirname,
      "expo-crypto": "node:crypto",
      "react-native": "react-native-web",
    },
  },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
});
