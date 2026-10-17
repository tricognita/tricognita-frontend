import type { Metadata } from "next";
import { ServiceDetailPage } from "../../../components/marketing/ServiceDetailPage";
import { serviceMetadata } from "@/lib/marketing/service-details";

// Service detail page (Rev B.1 §17). Content, state and CTA come from the
// registry via lib/marketing/service-details.ts and lib/marketing/services.ts.
export const metadata: Metadata = serviceMetadata("secure-cloud-engineering");

export default function SecureCloudEngineeringPage() {
  return <ServiceDetailPage id="secure-cloud-engineering" />;
}
