import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long",
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/chewbuu_test",
      STRIPE_MINGLE_ANNUAL_PRICE_ID: "price_mingle_annual_env",
      STRIPE_MINGLE_PRICE_ID: "price_mingle_monthly_env",
      STRIPE_SUGAR_ANNUAL_PRICE_ID: "price_sugar_annual_env",
      STRIPE_SUGAR_PRICE_ID: "price_sugar_monthly_env",
    },
    include: ["src/**/*.test.ts"],
  },
});
