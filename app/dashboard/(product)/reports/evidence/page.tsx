import type { Metadata } from "next";
import { EvidenceScreen } from "./EvidenceScreen";

export const metadata: Metadata = {
  title: "Evidence · Reports · Tricognita",
  description: "The evidence records behind every control result, with their integrity status.",
};

export default function EvidencePage() {
  return <EvidenceScreen />;
}
