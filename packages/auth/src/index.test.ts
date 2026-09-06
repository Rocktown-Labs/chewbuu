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
  it("resolves dynamic Stripe price IDs for membership and Sync plans", async () => {
    const query = (result: unknown[]) => {
      const builder = {
        execute: vi.fn().mockResolvedValue(result),
        executeTakeFirst: vi.fn().mockResolvedValue(result[0]),
        orderBy: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };
      return builder;
    };
    const mockDb = {
      selectFrom: vi.fn((table: string) =>
        table === "membership_plan"
          ? query([
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
            ])
          : query([
              {
                annual_price_cents: 70_800,
                annual_stripe_price_id: "price_sync50_annual_db",
                code: "sync_50",
                max_staff: 50,
                monthly_stripe_price_id: "price_sync50_monthly_db",
              },
              {
                annual_price_cents: 142_800,
                annual_stripe_price_id: "price_sync100_annual_db",
                code: "sync_100",
                max_staff: 100,
                monthly_stripe_price_id: "price_sync100_monthly_db",
              },
            ])
      ),
    };

    const plans = await buildStripePlans(mockDb as any);
    expect(plans).toHaveLength(4);

    const mingle = plans.find((p) => p.name.toLowerCase().includes("mingle"));
    expect(mingle?.priceId).toBe("price_mingle_monthly_db");
    expect(mingle?.annualDiscountPriceId).toBe("price_mingle_annual_db");

    const sync100 = plans.find((p) => p.name === "sync_100");
    expect(sync100).toMatchObject({
      annualDiscountPriceId: "price_sync100_annual_db",
      group: "sync",
      limits: { maxStaff: 100 },
      priceId: "price_sync100_monthly_db",
    });
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
