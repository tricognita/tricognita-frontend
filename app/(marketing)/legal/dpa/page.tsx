import type { Metadata } from "next";
import { LEGAL_DRAFT_ROBOTS, LegalPage } from "../../../components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Data processing agreement",
  description: "How Tricognita processes personal data on behalf of its customers.",
  alternates: { canonical: "/legal/dpa" },
  robots: LEGAL_DRAFT_ROBOTS,
};

export default function DpaPage() {
  return (
    <LegalPage
      title="Data processing agreement"
      intro="This agreement sets out how Tricognita processes personal data on your organisation's behalf."
      sections={[
        "Scope and roles",
        "Processing instructions",
        "Security measures",
        "Subprocessors",
        "International transfers",
        "Personal data breaches",
        "Assistance and audits",
        "Deletion and return",
      ]}
    />
  );
}
