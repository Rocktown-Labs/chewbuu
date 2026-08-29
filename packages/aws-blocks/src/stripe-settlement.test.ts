import { describe, expect, it } from "vitest";

import { calculatePlatformFee, calculateSettlement } from "./stripe-settlement";

describe("Stripe marketplace settlement", () => {
  it("calculates the platform fee in cents without rounding up", () => {
    expect(calculatePlatformFee(10_001, 500)).toBe(500);
  });

  it("keeps worker tips intact while charging the fee against the venue share", () => {
    expect(
      calculateSettlement({
        feeBps: 500,
        subtotalCents: 10_000,
        taxCents: 825,
        tipAllocations: [
          { amountCents: 1000, beneficiaryKind: "house" },
          {
            amountCents: 500,
            beneficiaryKind: "server",
            beneficiaryUserId: "server-1",
          },
          {
            amountCents: 500,
            beneficiaryKind: "cook",
            beneficiaryUserId: "cook-1",
          },
        ],
      })
    ).toEqual({
      platformFeeCents: 500,
      venueCents: 11_325,
      workerTipCents: 1000,
    });
  });

  it("returns no worker tip settlement when the guest tips the house", () => {
    expect(
      calculateSettlement({
        feeBps: 500,
        subtotalCents: 2000,
        taxCents: 160,
        tipAllocations: [{ amountCents: 400, beneficiaryKind: "house" }],
      })
    ).toEqual({
      platformFeeCents: 100,
      venueCents: 2460,
      workerTipCents: 0,
    });
  });
});
