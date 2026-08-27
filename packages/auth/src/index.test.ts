import { describe, expect, it, vi } from "vitest";

import { buildStripePlans, isReservedUsername } from "./index";
import { parseAdminEmails } from "./membership";

describe("reserved usernames", () => {
  it("protects official brand usernames", () => {
    expect(isReservedUsername("@chewbuu")).toBe(true);
    expect(isReservedUsername("chewbuusync")).toBe(true);
    expect(isReservedUsername("real-plans")).toBe(false);
  });
});

describe("configured admin emails", () => {
  it("normalizes comma-separated email allowlists", () => {
    expect(parseAdminEmails(" Admin@Example.com, ,owner@example.com ")).toEqual(
      new Set(["admin@example.com", "owner@example.com"])
    );
  });
});

describe("buildStripePlans", () => {
  it("resolves dynamic Stripe price IDs from the membership_plan table", async () => {
    const mockDb = {
      selectFrom: vi.fn().mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue([
              {
                active: true,
                annual_stripe_price_id: "price_mingle_annual_db",
                stripe_price_id: "price_mingle_monthly_db",
                tier: "mingle",
              },
              {
                active: true,
                annual_stripe_price_id: "price_sugar_annual_db",
                stripe_price_id: "price_sugar_monthly_db",
                tier: "sugar",
              },
            ]),
          }),
        }),
      }),
    };

    const plans = await buildStripePlans(mockDb as any);
    expect(plans).toHaveLength(2);

    const mingle = plans.find((p) => p.name.toLowerCase().includes("mingle"));
    expect(mingle?.priceId).toBe("price_mingle_monthly_db");
    expect(mingle?.annualDiscountPriceId).toBe("price_mingle_annual_db");

    const sugar = plans.find((p) => p.name.toLowerCase().includes("sugar"));
    expect(sugar?.priceId).toBe("price_sugar_monthly_db");
    expect(sugar?.annualDiscountPriceId).toBe("price_sugar_annual_db");
  });

  it("gracefully falls back to environment defaults if database query fails", async () => {
    const mockDb = {
      selectFrom: vi.fn().mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi
              .fn()
              .mockRejectedValue(new Error("DB connection error")),
          }),
        }),
      }),
    };

    const plans = await buildStripePlans(mockDb as any);
    expect(plans).toHaveLength(2);
    expect(plans[0].name).toBeDefined();
    expect(plans[1].name).toBeDefined();
  });
});
