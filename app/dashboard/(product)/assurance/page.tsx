import type { Metadata } from "next";
import { AssuranceScreen } from "./AssuranceScreen";

export const metadata: Metadata = {
  title: "Assurance · Tricognita",
  description: "The verification runs, drift and accepted risk behind every control result.",
};

export default function AssurancePage() {
  return <AssuranceScreen />;
}
