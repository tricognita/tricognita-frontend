"use client";

import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { Button, EmptyState, PageShell, StatusDot } from "@/lib/ui";

/**
 * Pre-release placeholder. The previous implementation (~varies lines, mock
 * data + unverified backend integration) was suppressed from the dashboard
 * nav as part of the demo-safety pass — we do not want broken telemetry
 * visible to enterprise reviewers. The full implementation is preserved in
 * git history (git log -- app/dashboard/dspm/page.tsx).
 *
 * Re-enable: restore the original page from git when production-data
 * validation is complete; also re-add the nav entry in DashboardNav.tsx.
 */
export default function DspmPage() {
  return (
    <PageShell
      eyebrow="Data · DSPM"
      title="Data Security Posture Management"
      description="Classifies cloud-stored data by sensitivity, tracks exposure paths, and surfaces datasets with regulatory implications."
      meta={<StatusDot intent="warning" size="sm" label="Pre-release validation" />}
    >
      <EmptyState
        variant="bordered"
        icon={<Layers size={32} className="text-[var(--amber-clay)]" />}
        title="This module is in pre-release validation."
        description="The classifier is being verified against real-account data inventories before this view goes live."
        action={
          <Link href="/dashboard" prefetch={false}>
            <Button variant="ghost" size="md" icon={<ArrowLeft size={14} />}>
              Back to overview
            </Button>
          </Link>
        }
      />
    </PageShell>
  );
}
