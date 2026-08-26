import { afterEach, describe, expect, it, vi } from "vitest";

import { previewVenueMenu } from "./venue-menu";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("venue menu previews", () => {
  it("returns a clear fallback when Firecrawl is not configured", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "");

    await expect(
      previewVenueMenu({ url: "https://example.com/menu" })
    ).resolves.toEqual({
      preview: null,
      reason: "firecrawl_not_configured",
    });
  });

  it("normalizes Firecrawl structured menu output as unverified", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "fc-test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: {
            json: {
              items: [
                {
                  description: "Smoked chicken and house pickles",
                  name: "Southern Plate",
                  price: 18,
                  section: "Mains",
                },
              ],
              title: "CG's Southern Cafe Menu",
            },
          },
          success: true,
        })
      )
    );

    const result = await previewVenueMenu({
      url: "https://cgs.example/menu",
    });

    expect(result.preview).toMatchObject({
      items: [
        {
          description: "Smoked chicken and house pickles",
          name: "Southern Plate",
          price: "18",
          section: "Mains",
        },
      ],
      sourceUrl: "https://cgs.example/menu",
      status: "unverified",
      title: "CG's Southern Cafe Menu",
    });
  });

  it("rejects successful responses without usable menu items", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "fc-test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ data: { json: { items: [] } } }))
    );

    await expect(
      previewVenueMenu({ url: "https://example.com/about" })
    ).resolves.toEqual({
      preview: null,
      reason: "invalid_menu",
    });
  });
});
