import type { Metadata } from "next";
import { HistoryScreen } from "./HistoryScreen";

export const metadata: Metadata = {
  title: "History · Assurance · Tricognita",
  description: "Every verification run on record, including the ones that did not complete.",
};

export default function HistoryPage() {
  return <HistoryScreen />;
}
