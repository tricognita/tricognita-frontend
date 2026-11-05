import type { Metadata } from "next";
import { DriftScreen } from "./DriftScreen";

export const metadata: Metadata = {
  title: "Drift · Assurance · Tricognita",
  description: "Controls that were verified and later failed, open and closed.",
};

export default function DriftPage() {
  return <DriftScreen />;
}
