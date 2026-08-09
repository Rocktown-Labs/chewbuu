import { createFileRoute } from "@tanstack/react-router";

import { getCanonicalUrl } from "@/lib/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          `User-agent: *
Allow: /

Sitemap: ${getCanonicalUrl("/sitemap.xml")}
`,
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          }
        ),
    },
  },
});
