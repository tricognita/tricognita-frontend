import type { Metadata } from "next";
import { AssuranceRecordScreen } from "./AssuranceRecordScreen";

export const metadata: Metadata = {
  title: "Control Assurance Record · Reports · Tricognita",
  description: "The factual record of every control check, change, verification and drift, with the evidence behind each state.",
};

export default function AssuranceRecordPage() {
  return <AssuranceRecordScreen />;
}
