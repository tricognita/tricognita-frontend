import type { Metadata } from "next";
import { Suspense } from "react";
import { FindingsScreen } from "./FindingsScreen";

export const metadata: Metadata = {
  title: "Findings · Tricognita",
  description: "Resources failing a control, with severity, status and the steps that resolve them.",
};

export default function FindingsPage() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <Suspense>
      <FindingsScreen />
    </Suspense>
  );
}
