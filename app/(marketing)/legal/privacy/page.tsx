import type { Metadata } from "next";
import { LEGAL_DRAFT_ROBOTS, LegalPage } from "../../../components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Tricognita collects, uses and protects personal data.",
  alternates: { canonical: "/legal/privacy" },
  robots: LEGAL_DRAFT_ROBOTS,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="This policy explains what personal data Tricognita collects when you use the website and the product, why, and your rights."
      sections={[
        "Who we are",
        "What we collect",
        "How we use it",
        "Who we share it with",
        "Where it is processed",
        "How long we keep it",
        "Your rights",
        "Contact",
      ]}
    />
  );
}
