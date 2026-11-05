import type { MetadataRoute } from "next";
import { INDEXED_ROUTES, SITE_URL } from "@/lib/marketing/site";

// Generated from the marketing site structure (lib/marketing/site.ts,
// MARKETING_SITEMAP.md §2). Retired routes redirect (next.config.ts) and draft
// pages are excluded until they are final.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return INDEXED_ROUTES.map((r) => ({
    url: r.path === "/" ? SITE_URL : `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: r.priority,
  }));
}
