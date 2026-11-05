import type { Metadata } from "next";
import { LEGAL_DRAFT_ROBOTS, LegalPage } from "../../../components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Subprocessors",
  description: "The providers that process customer data on Tricognita's behalf.",
  alternates: { canonical: "/legal/subprocessors" },
  robots: LEGAL_DRAFT_ROBOTS,
};

export default function SubprocessorsPage() {
  return (
    <LegalPage
      title="Subprocessors"
      intro="These providers process customer data on Tricognita's behalf. We will update this list before adding a new subprocessor."
      sections={[
        "Provider",
        "Purpose",
        "Location",
      ]}
    />
  );
}
