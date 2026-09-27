"use client";

import Link from "next/link";
import { ArrowLeft, Database } from "lucide-react";
import { Button, EmptyState, PageShell, StatusDot } from "@/lib/ui";

/**
 * Pre-release placeholder. The previous implementation (~varies lines, mock
 * data + unverified backend integration) was suppressed from the dashboard
 * nav as part of the demo-safety pass — we do not want broken telemetry
 * visible to enterprise reviewers. The full implementation is preserved in
 * git history (git log -- app/dashboard/datasets/page.tsx).
 *
 * Re-enable: restore the original page from git when production-data
 * validation is complete; also re-add the nav entry in DashboardNav.tsx.
 */
export default function DatasetsPage() {
  return (
    <PageShell
      eyebrow="Data · Inventory"
      title="Dataset Correlation"
      description="Cross-cloud asset inventory with finding-to-dataset linkage and lineage."
      meta={<StatusDot intent="warning" size="sm" label="Pre-release validation" />}
    >
      <EmptyState
        variant="bordered"
        icon={<Database size={32} className="text-[var(--amber-clay)]" />}
        title="This module is in pre-release validation."
        description="Dataset correlation graphs are still being calibrated against production scan output."
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
