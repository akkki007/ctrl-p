import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Static public routes. Per-design/creator URLs are rendered client-side and
 * change constantly; expose them via an API-backed dynamic sitemap once the
 * catalogue is large enough to warrant it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/wall", "/business", "/create"];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
