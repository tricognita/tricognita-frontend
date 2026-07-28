import type { MetadataRoute } from "next";

// PWA manifest. Icons derive from the canonical octopus-in-triangle mark
// (source of truth: /public/brand/tricognita_mark_transparent.png). See /public/brand/icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tricognita — Autonomous Cloud Resilience",
    short_name: "Tricognita",
    description:
      "Autonomous cloud security with ARIA — predictive risk, self-healing remediation, and zero-trust enforcement.",
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
