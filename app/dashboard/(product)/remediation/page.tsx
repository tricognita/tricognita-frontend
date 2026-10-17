import type { Metadata } from "next";
import { RemediationScreen } from "./RemediationScreen";

export const metadata: Metadata = {
  title: "Remediation · Tricognita",
  description: "Changes requested against your cloud: approval, execution and the run that confirms them.",
};

export default function RemediationPage() {
  return <RemediationScreen />;
}
