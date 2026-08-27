import { createFileRoute } from "@tanstack/react-router";

import { getCanonicalUrl } from "@/lib/seo";

const PUBLIC_ROUTES = ["/", "/spots", "/privacy", "/terms"] as const;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_ROUTES.map(
  (path) => `  <url>
    <loc>${getCanonicalUrl(path)}</loc>
    <changefreq>${path === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${path === "/" ? "1.0" : "0.4"}</priority>
  </url>`
).join("\n")}
</urlset>
`;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(sitemap, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
          },
        }),
    },
  },
});
