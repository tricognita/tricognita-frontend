"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Button, EmptyState, PageShell, StatusDot } from "@/lib/ui";

/**
 * Pre-release placeholder. The previous implementation (~varies lines, mock
 * data + unverified backend integration) was suppressed from the dashboard
 * nav as part of the demo-safety pass — we do not want broken telemetry
 * visible to enterprise reviewers. The full implementation is preserved in
 * git history (git log -- app/dashboard/guard/page.tsx).
 *
 * Re-enable: restore the original page from git when production-data
 * validation is complete; also re-add the nav entry in DashboardNav.tsx.
 */
export default function GuardPage() {
  return (
    <PageShell
      eyebrow="AI · LLM Guard"
      title="ARIA Guard"
      description="Real-time guardrails for LLM API calls — PII detection, prompt-injection blocking, EU AI Act audit trail."
      meta={<StatusDot intent="warning" size="sm" label="Pre-release validation" />}
    >
      <EmptyState
        variant="bordered"
        icon={<Shield size={32} className="text-[var(--amber-clay)]" />}
        title="This module is in pre-release validation."
        description="The guard proxy is in controlled rollout. Once enabled for your tenant, this dashboard surfaces blocked / redacted / allowed events with full forensics."
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
