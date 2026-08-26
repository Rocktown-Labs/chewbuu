import { z } from "zod";

import type { VenueMenuPreview, VenueMenuPreviewItem } from "./types";

const menuPreviewInputSchema = z.object({
  url: z
    .url()
    .refine(
      (value) => value.startsWith("https://") || value.startsWith("http://"),
      "URL must use http or https"
    ),
});

const menuItemSchema = z.object({
  description: z.string().optional(),
  name: z.string().min(1),
  price: z.union([z.number(), z.string()]).optional(),
  section: z.string().optional(),
});

const menuExtractionSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          price: { type: ["string", "number"] },
          section: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  required: ["items"],
} as const;

const firecrawlResponseSchema = z.object({
  data: z
    .object({
      json: z.unknown().optional(),
      menu: z.unknown().optional(),
      metadata: z
        .object({ title: z.string().optional() })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
  success: z.boolean().optional(),
});

const extractMenuItems = (value: unknown): VenueMenuPreviewItem[] => {
  if (!value || typeof value !== "object") return [];

  const candidate = value as Record<string, unknown>;
  const directItems = Array.isArray(candidate.items) ? candidate.items : [];
  const sections = Array.isArray(candidate.sections) ? candidate.sections : [];
  const sectionItems = sections.flatMap((section) => {
    if (!section || typeof section !== "object") return [];
    const sectionRecord = section as Record<string, unknown>;
    const sectionName =
      typeof sectionRecord.name === "string" ? sectionRecord.name : undefined;
    const items = Array.isArray(sectionRecord.items) ? sectionRecord.items : [];
    return items.map((item) =>
      item && typeof item === "object"
        ? { ...(item as Record<string, unknown>), section: sectionName }
        : item
    );
  });

  return [...directItems, ...sectionItems]
    .map((item) => menuItemSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => {
      const item = result.data;
      return {
        ...(item.description ? { description: item.description } : {}),
        name: item.name.trim(),
        ...(item.price !== undefined ? { price: String(item.price) } : {}),
        ...(item.section ? { section: item.section.trim() } : {}),
      };
    })
    .filter((item) => item.name.length > 0)
    .slice(0, 250);
};

export const previewVenueMenu = async (input: unknown) => {
  const { url } = menuPreviewInputSchema.parse(input);
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return {
      preview: null,
      reason: "firecrawl_not_configured" as const,
    };
  }

  let response: Response;
  try {
    response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      body: JSON.stringify({
        formats: [
          {
            type: "json",
            schema: menuExtractionSchema,
            prompt:
              "Extract the current food and drink menu. Include each item name, visible price, description, and section when present. Do not invent missing prices or items.",
          },
        ],
        onlyMainContent: true,
        url,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { preview: null, reason: "unavailable" as const };
  }

  if (!response.ok) {
    return { preview: null, reason: "unavailable" as const };
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    return { preview: null, reason: "invalid_menu" as const };
  }
  const parsedResponse = firecrawlResponseSchema.safeParse(responseBody);
  if (!parsedResponse.success) {
    return { preview: null, reason: "invalid_menu" as const };
  }

  const { data } = parsedResponse.data;
  const extracted = data?.json ?? data?.menu;
  const items = extractMenuItems(extracted);
  if (items.length === 0) {
    return { preview: null, reason: "invalid_menu" as const };
  }

  const title =
    extracted && typeof extracted === "object" && "title" in extracted
      ? typeof extracted.title === "string"
        ? extracted.title
        : undefined
      : data?.metadata?.title;
  const preview: VenueMenuPreview = {
    fetchedAt: new Date().toISOString(),
    items,
    sourceUrl: url,
    status: "unverified",
    ...(title ? { title } : {}),
  };

  return { preview };
};
