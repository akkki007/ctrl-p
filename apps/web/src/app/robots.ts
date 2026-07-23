import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/wall", "/business", "/creators"],
      // Keep private/transactional areas out of the index.
      disallow: ["/admin", "/cart", "/orders", "/studio", "/rewards", "/notifications", "/sign-in", "/sign-up"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
