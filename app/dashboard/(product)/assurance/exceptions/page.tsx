import type { Metadata } from "next";
import { ExceptionsScreen } from "./ExceptionsScreen";

export const metadata: Metadata = {
  title: "Exceptions · Assurance · Tricognita",
  description: "Risk accepted in writing, with an owner and an expiry date.",
};

export default function ExceptionsPage() {
  return <ExceptionsScreen />;
}
