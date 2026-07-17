import { describe, expect, it } from "vitest";

import app from "../app";

describe("upload route", () => {
  it("reports missing R2 configuration clearly", async () => {
    const response = await app.request("/upload", {
      body: JSON.stringify({ route: "profilePhoto" }),
      headers: new Headers({
        "content-type": "application/json",
        "x-chewbuu-test-user-id": crypto.randomUUID(),
      }),
      method: "POST",
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: {
        message: expect.stringContaining("Cloudflare R2 upload storage"),
        type: "storage_not_configured",
      },
    });
  });
});
