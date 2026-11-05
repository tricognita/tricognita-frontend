"use client";

import Link from "next/link";
import { ArrowLeft, Network } from "lucide-react";
import { Button, EmptyState, PageShell, StatusDot } from "@/lib/ui";

/**
 * Pre-release placeholder. The previous implementation (~varies lines, mock
 * data + unverified backend integration) was suppressed from the dashboard
 * nav as part of the demo-safety pass — we do not want broken telemetry
 * visible to enterprise reviewers. The full implementation is preserved in
 * git history (git log -- app/dashboard/zero-trust/page.tsx).
 *
 * Re-enable: restore the original page from git when production-data
 * validation is complete; also re-add the nav entry in DashboardNav.tsx.
 */
export default function ZeroTrustPage() {
  return (
    <PageShell
      eyebrow="Identity · Zero Trust"
      title="Zero Trust Posture"
      description="IAM-chain analysis, JIT-request workflow, role-chain visualization across cloud accounts."
      meta={<StatusDot intent="warning" size="sm" label="Pre-release validation" />}
    >
      <EmptyState
        variant="bordered"
        icon={<Network size={32} className="text-[var(--amber-clay)]" />}
        title="This module is in pre-release validation."
        description="The zero-trust analyzer is in pre-release. Once enabled, this surface visualizes assumable role chains + JIT request review."
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
