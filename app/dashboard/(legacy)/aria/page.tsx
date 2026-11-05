"use client";

import dynamic from "next/dynamic";
import { PageShell } from "@/lib/ui";

const ARIADashboard = dynamic(
  () => import("../components/aria/ARIADashboard").then((m) => m.ARIADashboard),
  { ssr: false },
);

export default function ARIAPage() {
  return (
    <PageShell width="wide" density="tight">
      <ARIADashboard />
    </PageShell>
  );
}
