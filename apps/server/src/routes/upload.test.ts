import { describe, expect, it } from "vitest";

import app from "../app";
import { mediaUrlFromKey } from "./upload";

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

  it("uses the authenticated media route when no public R2 URL is configured", () => {
    expect(mediaUrlFromKey("profiles/user-1/photo/example.png")).toBe(
      "/upload/media?key=profiles%2Fuser-1%2Fphoto%2Fexample.png"
    );
  });
});
