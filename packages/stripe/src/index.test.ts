import { describe, expect, it } from "vitest";

import { getStripeMode, stripeIdempotencyKey } from "./index";

describe("Stripe integration helpers", () => {
  it("detects test and live keys", () => {
    expect(getStripeMode("sk_test_example")).toBe("test");
    expect(getStripeMode("rk_live_example")).toBe("live");
  });

  it("creates stable idempotency keys", () => {
    expect(stripeIdempotencyKey("checkout", "order-1")).toBe(
      "chewbuu:checkout:order-1"
    );
  });
});
