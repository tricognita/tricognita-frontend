import type { Metadata } from "next";
import { OperationsScreen } from "./OperationsScreen";

export const metadata: Metadata = {
  title: "Operations · Tricognita",
  description: "Changes waiting on a decision, runs that did not complete, and accounts we cannot read.",
};

export default function OperationsPage() {
  return <OperationsScreen />;
}
