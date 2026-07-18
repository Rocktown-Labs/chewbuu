import { describe, expect, it } from "vitest";

import app from "../app";
import { mediaUrlFromBlobPathname, mediaUrlFromKey } from "./upload";

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

  it("uses the authenticated blob route for private Vercel Blob media", () => {
    expect(
      mediaUrlFromBlobPathname("profiles/user-1/profile_photo/example.png")
    ).toBe(
      "/upload/blob?pathname=profiles%2Fuser-1%2Fprofile_photo%2Fexample.png"
    );
  });

  it("rejects blob media reads without a profile pathname", async () => {
    const response = await app.request(
      "/upload/blob?pathname=bad/example.png",
      {
        headers: new Headers({
          "x-chewbuu-test-user-id": crypto.randomUUID(),
        }),
      }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        message: "Upload media pathname is invalid.",
        type: "invalid_media_pathname",
      },
    });
  });
});
