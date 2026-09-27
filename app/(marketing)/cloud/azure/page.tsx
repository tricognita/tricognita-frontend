import type { Metadata } from "next";
import { CloudDetail } from "../../../components/marketing/CloudDetail";
import { PRODUCT_DISPLAY_NAME } from "@/lib/marketing/capabilities";
import { CLOUD_COPY, cloudById } from "@/lib/marketing/clouds";

// Plan: TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1 §19. States come from the
// registry via lib/marketing/clouds.ts; copy from CLOUD_COPY.
const cloud = cloudById("azure");

export const metadata: Metadata = {
  title: CLOUD_COPY.azure.title,
  description: `${CLOUD_COPY.azure.intro} Services and ${PRODUCT_DISPLAY_NAME} states are shown on the page. For teams in India and the UAE.`,
  alternates: { canonical: `/cloud/${cloud.slug}` },
};

export default function AzureCloudPage() {
  return <CloudDetail id="azure" />;
}
