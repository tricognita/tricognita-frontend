import type { Metadata } from "next";
import { ReportsScreen } from "./ReportsScreen";

export const metadata: Metadata = {
  title: "Reports · Tricognita",
  description: "Monthly assurance, customer review and evidence — what you can show a customer or an auditor.",
};

export default function ReportsPage() {
  return <ReportsScreen />;
}
