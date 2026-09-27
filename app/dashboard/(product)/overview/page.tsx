import type { Metadata } from "next";
import { OverviewScreen } from "./OverviewScreen";

export const metadata: Metadata = {
  title: "Overview · Tricognita",
  description: "Control status, what needs attention, verification, drift and evidence.",
};

export default function OverviewPage() {
  return <OverviewScreen />;
}
