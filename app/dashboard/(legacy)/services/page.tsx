"use client";

import Link from "next/link";
import { ArrowLeft, Server } from "lucide-react";
import { Button, EmptyState, PageShell, StatusDot } from "@/lib/ui";

/**
 * Pre-release placeholder. The previous implementation (~varies lines, mock
 * data + unverified backend integration) was suppressed from the dashboard
 * nav as part of the demo-safety pass — we do not want broken telemetry
 * visible to enterprise reviewers. The full implementation is preserved in
 * git history (git log -- app/dashboard/services/page.tsx).
 *
 * Re-enable: restore the original page from git when production-data
 * validation is complete; also re-add the nav entry in DashboardNav.tsx.
 */
export default function ServicesPage() {
  return (
    <PageShell
      eyebrow="Inventory · Services"
      title="Service Catalog"
      description="Inventory of all detected cloud services across connected accounts."
      meta={<StatusDot intent="warning" size="sm" label="Pre-release validation" />}
    >
      <EmptyState
        variant="bordered"
        icon={<Server size={32} className="text-[var(--amber-clay)]" />}
        title="This module is in pre-release validation."
        description="Service detection is being validated against real account inventories before this catalog goes live."
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
