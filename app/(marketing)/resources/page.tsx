import type { Metadata } from "next";
import { CtaBand, PageHero } from "../../components/marketing/Blocks";
import { PRODUCT_DISPLAY_NAME } from "@/lib/marketing/capabilities";
import { PLATFORM_HREF } from "@/lib/marketing/site";

// Sitemap §1–2: the route is kept but hidden from navigation and search until
// at least three real articles exist.
export const metadata: Metadata = {
  title: "Resources",
  description: "Articles on cloud security controls, verification and evidence.",
  alternates: { canonical: "/resources" },
  robots: { index: false, follow: true },
};

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Articles are on their way."
        sub="In the meantime, the FAQ answers the questions we hear most — about access, fixes, evidence and how Tricognita fits alongside the tools you already use."
        primary={{ href: "/faq", label: "Read the FAQ" }}
        secondary={{ href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` }}
      />
      <CtaBand />
    </>
  );
}
