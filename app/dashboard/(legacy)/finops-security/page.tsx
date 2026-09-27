"use client";

import Link from "next/link";
import { ArrowLeft, TrendingDown } from "lucide-react";
import { Button, EmptyState, PageShell, StatusDot } from "@/lib/ui";

/**
 * Pre-release placeholder. The previous implementation (~varies lines, mock
 * data + unverified backend integration) was suppressed from the dashboard
 * nav as part of the demo-safety pass — we do not want broken telemetry
 * visible to enterprise reviewers. The full implementation is preserved in
 * git history (git log -- app/dashboard/finops-security/page.tsx).
 *
 * Re-enable: restore the original page from git when production-data
 * validation is complete; also re-add the nav entry in DashboardNav.tsx.
 */
export default function FinOpsSecurityPage() {
  return (
    <PageShell
      eyebrow="Cost · FinOps"
      title="FinOps Security"
      description="Cost-attribution view for security findings; identifies zombie and over-provisioned resources with savings estimates."
      meta={<StatusDot intent="warning" size="sm" label="Pre-release validation" />}
    >
      <EmptyState
        variant="bordered"
        icon={<TrendingDown size={32} className="text-[var(--amber-clay)]" />}
        title="This module is in pre-release validation."
        description="Cost attribution is being calibrated against your accounts billing data before this view goes live."
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
