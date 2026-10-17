"use client";

import Link from "next/link";
import { ArrowLeft, Brain } from "lucide-react";
import { Button, EmptyState, PageShell, StatusDot } from "@/lib/ui";

/**
 * Pre-release placeholder. The previous implementation (~varies lines, mock
 * data + unverified backend integration) was suppressed from the dashboard
 * nav as part of the demo-safety pass — we do not want broken telemetry
 * visible to enterprise reviewers. The full implementation is preserved in
 * git history (git log -- app/dashboard/ai-security/page.tsx).
 *
 * Re-enable: restore the original page from git when production-data
 * validation is complete; also re-add the nav entry in DashboardNav.tsx.
 */
export default function AISecurityPage() {
  return (
    <PageShell
      eyebrow="AI · Posture"
      title="AI Security Posture"
      description="Model registry, training-data lineage, prompt-injection event log, and EU AI Act Article 12 evidence."
      meta={<StatusDot intent="warning" size="sm" label="Pre-release validation" />}
    >
      <EmptyState
        variant="bordered"
        icon={<Brain size={32} className="text-[var(--amber-clay)]" />}
        title="This module is in pre-release validation."
        description="AI posture telemetry is in pre-release. Once enabled, model risk + lineage + injection telemetry surfaces here."
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
