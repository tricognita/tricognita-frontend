import type { Metadata } from "next";
import { IndustryPage } from "../../../components/marketing/IndustryPage";
import { INDUSTRIES, industryHref } from "@/lib/marketing/industries";

// Plan: TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1 (Rev A §19 industry
// template). Copy from lib/marketing/industries.ts; states from the registry.
const industry = INDUSTRIES.saas;

export const metadata: Metadata = {
  title: industry.title,
  description: `${industry.intro} For teams in India and the UAE.`,
  alternates: { canonical: industryHref(industry) },
};

export default function SaaSIndustryPage() {
  return <IndustryPage id="saas" />;
}
