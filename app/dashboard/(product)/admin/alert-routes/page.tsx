import type { Metadata } from "next";
import { AlertRoutesScreen } from "./AlertRoutesScreen";

export const metadata: Metadata = {
  title: "Alert routes · Administration · Tricognita",
  description: "Where Tricognita announces drift, new failures and verification problems.",
};

export default function AlertRoutesPage() {
  return <AlertRoutesScreen />;
}
