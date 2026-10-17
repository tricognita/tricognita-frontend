import type { Metadata } from "next";
import { CloudAccountsScreen } from "./CloudAccountsScreen";

export const metadata: Metadata = {
  title: "Cloud accounts · Tricognita",
  description: "The cloud accounts Tricognita reads, and how cleanly it can read each one.",
};

export default function CloudAccountsPage() {
  return <CloudAccountsScreen />;
}
