import { DistributedTable, Scope } from "@aws-blocks/blocks";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("Push Subscriptions DistributedTable", () => {
  it("instantiates the push-subscriptions distributed table with userId and endpoint keys", () => {
    const scope = new Scope("test-push");
    const pushTable = new DistributedTable(scope, "push-subscriptions", {
      indexes: {
        byUserId: { partitionKey: "userId", sortKey: "updatedAt" },
      },
      key: { partitionKey: "userId", sortKey: "endpoint" },
      schema: z.object({
        auth: z.string(),
        createdAt: z.number(),
        endpoint: z.string(),
        p256dh: z.string(),
        updatedAt: z.number(),
        userId: z.string(),
      }),
    });

    expect(pushTable).toBeDefined();
  });
});
