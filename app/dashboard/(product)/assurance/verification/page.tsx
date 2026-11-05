import type { Metadata } from "next";
import { VerificationScreen } from "./VerificationScreen";

export const metadata: Metadata = {
  title: "Verification · Assurance · Tricognita",
  description: "What ran, what is running now, and which controls could not be assessed.",
};

export default function VerificationPage() {
  return <VerificationScreen />;
}
