import type { Metadata } from "next";
import { Suspense } from "react";
import { ControlsScreen } from "./ControlsScreen";

export const metadata: Metadata = {
  title: "Controls · Tricognita",
  description: "The cloud security controls Tricognita verifies, and whether each one holds.",
};

export default function ControlsPage() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <Suspense>
      <ControlsScreen />
    </Suspense>
  );
}
