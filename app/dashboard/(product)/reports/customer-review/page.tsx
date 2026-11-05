import type { Metadata } from "next";
import { CustomerReviewScreen } from "./CustomerReviewScreen";

export const metadata: Metadata = {
  title: "Customer review · Reports · Tricognita",
  description: "A short, customer-safe summary of what was checked, when, and what was found.",
};

export default function CustomerReviewPage() {
  return <CustomerReviewScreen />;
}
