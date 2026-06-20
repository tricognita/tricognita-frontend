"use client";

import Link from "next/link";
import { ArrowLeft, Boxes } from "lucide-react";
import { Button, EmptyState, PageShell, StatusDot } from "@/lib/ui";

/**
 * Pre-release placeholder. The previous implementation (~varies lines, mock
 * data + unverified backend integration) was suppressed from the dashboard
 * nav as part of the demo-safety pass — we do not want broken telemetry
 * visible to enterprise reviewers. The full implementation is preserved in
 * git history (git log -- app/dashboard/k8s/page.tsx).
 *
 * Re-enable: restore the original page from git when production-data
 * validation is complete; also re-add the nav entry in DashboardNav.tsx.
 */
export default function K8sPage() {
  return (
    <PageShell
      eyebrow="Workload · Kubernetes"
      title="Kubernetes Audit"
      description="RBAC, network-policy, and pod-security audit across connected clusters."
      meta={<StatusDot intent="warning" size="sm" label="Pre-release validation" />}
    >
      <EmptyState
        variant="bordered"
        icon={<Boxes size={32} className="text-[var(--amber-clay)]" />}
        title="This module is in pre-release validation."
        description="Cluster ingestion is being validated against your live workloads before this view goes live."
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
