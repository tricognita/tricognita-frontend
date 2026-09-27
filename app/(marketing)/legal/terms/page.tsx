import type { Metadata } from "next";
import { LEGAL_DRAFT_ROBOTS, LegalPage } from "../../../components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms that govern use of Tricognita.",
  alternates: { canonical: "/legal/terms" },
  robots: LEGAL_DRAFT_ROBOTS,
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro="These terms govern your organisation's use of Tricognita."
      sections={[
        "Agreement",
        "The service",
        "Your responsibilities",
        "Access to your cloud accounts",
        "Approvals and changes",
        "Fees",
        "Confidentiality",
        "Liability",
        "Term and termination",
        "Governing law",
      ]}
    />
  );
}
