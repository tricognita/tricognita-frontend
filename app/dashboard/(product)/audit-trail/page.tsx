import { Suspense } from "react";
import type { Metadata } from "next";
import { AuditTrailScreen } from "./AuditTrailScreen";

export const metadata: Metadata = {
  title: "Audit trail · Tricognita",
  description: "Who did what, when, inside your Tricognita organisation.",
};

export default function AuditTrailPage() {
  return (
    <Suspense fallback={null}>
      <AuditTrailScreen />
    </Suspense>
  );
}
