"use client";

import Link from "next/link";
import { AuthorizingState, Card, HStack, NotAuthorizedState, Section, Skeleton, VStack } from "@/lib/ui";
import { EvidenceList, ReportCard } from "@/lib/product";
import {
  EVIDENCE_INTEGRITY,
  EVIDENCE_KIND,
  evidenceByRecency,
  latestReportOfKind,
  type Evidence,
  type EvidenceIntegrity,
  type EvidenceKind,
} from "@/lib/domain";
import { useControls, useEvidence, useReports, useVerificationRuns } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary, SkeletonRows } from "../QueryBoundary";
import { ExportAction } from "../ExportAction";

/**
 * Evidence — the record both reports are drawn from.
 *
 * Read as a chain, not a file list: control → verification → result →
 * evidence. Integrity is counted at the top because a record that no longer
 * matches its hash is the single fact a customer most needs before they rely
 * on any of this.
 */

const KIND_ORDER: EvidenceKind[] = ["CONTROL_VERIFICATION", "REMEDIATION", "DRIFT"];
const INTEGRITY_ORDER: EvidenceIntegrity[] = ["FAILED", "UNCHECKED", "VERIFIED"];

function Count({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <VStack gap="xs" className="min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{label}</span>
      <span
        className={`text-[var(--text-lg)] tabular-nums ${muted ? "text-[var(--fg-muted)]" : "text-[var(--fg)]"}`}
      >
        {value}
      </span>
    </VStack>
  );
}

function IntegritySummary({ evidence }: { evidence: Evidence[] }) {
  const byIntegrity = (i: EvidenceIntegrity) => evidence.filter((e) => e.integrity === i).length;
  const byKind = (k: EvidenceKind) => evidence.filter((e) => e.kind === k).length;

  return (
    <Card>
      <VStack gap="md">
        <HStack gap="xl" className="flex-wrap">
          <Count label="Records" value={evidence.length} />
          {INTEGRITY_ORDER.map((i) => (
            <Count
              key={i}
              label={EVIDENCE_INTEGRITY[i].label}
              value={byIntegrity(i)}
              muted={i !== "FAILED" && byIntegrity(i) === 0}
            />
          ))}
        </HStack>
        <HStack gap="xl" className="flex-wrap">
          {KIND_ORDER.map((k) => (
            <Count key={k} label={EVIDENCE_KIND[k]} value={byKind(k)} muted={byKind(k) === 0} />
          ))}
        </HStack>
        {byIntegrity("FAILED") > 0 && (
          <p className="text-[var(--text-sm)] text-[var(--status-danger)] max-w-[70ch]">
            {byIntegrity("FAILED")} record
            {byIntegrity("FAILED") === 1 ? " no longer matches" : "s no longer match"} the hash
            written when taken. Contact support before relying on{" "}
            {byIntegrity("FAILED") === 1 ? "it" : "them"} in a review.
          </p>
        )}
      </VStack>
    </Card>
  );
}

export function EvidenceScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const evidence = useEvidence();
  const controls = useControls();
  const runs = useVerificationRuns();
  const reports = useReports();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "viewEvidence")) {
    return <NotAuthorizedState subject="evidence records" askWho="an administrator" />;
  }

  const exportReport = reports.data ? latestReportOfKind(reports.data, "EVIDENCE_EXPORT") : undefined;

  return (
    <VStack gap="xl">
      <Section
        eyebrow="The record"
        title="Evidence"
        description="What each record relates to, when it was taken, and whether it still matches its hash."
        spacing="sm"
      >
        <QueryBoundary
          query={evidence}
          unavailableMessage="The evidence records behind every control result."
          skeleton={<Skeleton className="h-32 w-full" />}
        >
          {(data) => <IntegritySummary evidence={data} />}
        </QueryBoundary>
      </Section>

      {exportReport && (
        <Section
          eyebrow="Export"
          title="Evidence export"
          description="The export produced from these records for a period."
          spacing="sm"
        >
          <ReportCard report={exportReport} action={<ExportAction report={exportReport} />} />
        </Section>
      )}

      <Section
        eyebrow="Records"
        title="Evidence records"
        description="Newest first. Each one names its control where recorded, the verification run behind it, and that run's result."
        spacing="sm"
      >
        <QueryBoundary
          query={evidence}
          unavailableMessage="The evidence records behind every control result."
          skeleton={<SkeletonRows count={4} height="h-32" />}
        >
          {(data) => (
            <EvidenceList
              evidence={evidenceByRecency(data)}
              controls={controls.data ?? []}
              runs={runs.data ?? []}
            />
          )}
        </QueryBoundary>
      </Section>

      <nav aria-label="Related surfaces" className="flex flex-wrap gap-x-4 gap-y-2">
        <Link
          href="/dashboard/assurance/history"
          className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
        >
          Verification history
        </Link>
        <Link
          href="/dashboard/controls"
          className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
        >
          Controls
        </Link>
      </nav>
    </VStack>
  );
}
