import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/marketing/site";

// PWA manifest. Icons derive from the canonical octopus-in-triangle mark
// (source of truth: /public/brand/tricognita_mark_transparent.png). See /public/brand/icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0B0914",
    theme_color: "#0B0914",
    icons: [
      { src: "/brand/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/brand/icons/monochrome-512.png", sizes: "512x512", type: "image/png", purpose: "monochrome" },
    ],
  };
}
