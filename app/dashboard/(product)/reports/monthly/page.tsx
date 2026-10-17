import type { Metadata } from "next";
import { MonthlyScreen } from "./MonthlyScreen";

export const metadata: Metadata = {
  title: "Monthly assurance · Reports · Tricognita",
  description: "The recurring record of what was checked in the period, and what was found.",
};

export default function MonthlyPage() {
  return <MonthlyScreen />;
}
