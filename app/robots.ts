import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://tricognita.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/login", "/register", "/onboarding/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
