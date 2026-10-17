"use client";

import Link from "next/link";
import { ArrowLeft, Radar } from "lucide-react";
import { Button, EmptyState, PageShell, StatusDot } from "@/lib/ui";

/**
 * Pre-release placeholder. The previous implementation (~varies lines, mock
 * data + unverified backend integration) was suppressed from the dashboard
 * nav as part of the demo-safety pass — we do not want broken telemetry
 * visible to enterprise reviewers. The full implementation is preserved in
 * git history (git log -- app/dashboard/threat-intel/page.tsx).
 *
 * Re-enable: restore the original page from git when production-data
 * validation is complete; also re-add the nav entry in DashboardNav.tsx.
 */
export default function ThreatIntelPage() {
  return (
    <PageShell
      eyebrow="Intel · Threat Intelligence"
      title="Threat Intelligence"
      description="Cross-source CTI enrichment (AbuseIPDB / VirusTotal / GreyNoise / OTX) with relevance scoring."
      meta={<StatusDot intent="warning" size="sm" label="Pre-release validation" />}
    >
      <EmptyState
        variant="bordered"
        icon={<Radar size={32} className="text-[var(--amber-clay)]" />}
        title="This module is in pre-release validation."
        description="Threat-intel enrichment requires per-tenant API keys. Once configured, IP / domain / hash lookups + scoring surface here."
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
