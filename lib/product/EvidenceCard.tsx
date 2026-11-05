import Link from "next/link";
import { Card, DateTime, HStack, VStack } from "@/lib/ui";
import {
  EVIDENCE_KIND,
  EVIDENCE_KIND_MEANING,
  type Control,
  type Evidence,
  type VerificationRun,
} from "@/lib/domain";
import { EvidenceIntegrityBadge, VerificationStatusBadge } from "./StatusBadges";

/**
 * EvidenceCard — one record, read as the chain that produced it.
 *
 * Control → verification → result → evidence. A record that carries no control
 * id simply does not show one: inferring the control from the run would turn a
 * plausible guess into a claim on an auditor's desk.
 */
export function EvidenceCard({
  evidence,
  control,
  run,
}: {
  evidence: Evidence;
  control?: Control;
  run?: VerificationRun;
}) {
  return (
    <Card>
      <VStack gap="sm">
        <HStack gap="sm" justify="between" align="start" className="flex-wrap">
          <VStack gap="xs" className="min-w-0">
            <HStack gap="sm" align="center" className="flex-wrap">
              <span className="font-mono text-[var(--text-xs)] text-[var(--fg-muted)]">
                {evidence.id}
              </span>
              <span className="text-[var(--text-sm)] font-medium text-[var(--fg)]">
                {EVIDENCE_KIND[evidence.kind]}
              </span>
            </HStack>
            <span className="text-[10px] text-[var(--fg-subtle)]">
              {EVIDENCE_KIND_MEANING[evidence.kind]}
            </span>
          </VStack>
          <EvidenceIntegrityBadge integrity={evidence.integrity} size="xs" />
        </HStack>

        <p className="text-[var(--text-sm)] text-[var(--fg-muted)] break-words">{evidence.summary}</p>

        {/* control → verification → result → evidence */}
        <dl className="grid gap-2 sm:grid-cols-3 text-[var(--text-xs)]">
          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Control</dt>
            <dd className="text-[var(--fg)] break-words">
              {evidence.controlId ? (
                <Link
                  href={`/dashboard/controls/${evidence.controlId}`}
                  className="underline underline-offset-2 hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                >
                  {control?.name ?? evidence.controlId}
                </Link>
              ) : (
                <span className="text-[var(--fg-subtle)]">Covers the whole baseline</span>
              )}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
              Verification
            </dt>
            <dd className="text-[var(--fg)]">
              {run ? (
                <HStack gap="xs" align="center" className="flex-wrap">
                  <DateTime value={run.startedAt} variant="absolute" />
                  <VerificationStatusBadge state={run.state} size="xs" />
                </HStack>
              ) : (
                <span className="text-[var(--fg-subtle)]">No run recorded</span>
              )}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Recorded</dt>
            <dd className="text-[var(--fg)]">
              <DateTime value={evidence.recordedAt} variant="both" />
            </dd>
          </div>
        </dl>

        {run && run.state !== "FAILED" && run.counts.evaluated > 0 && (
          <p className="text-[var(--text-xs)] text-[var(--fg-muted)] tabular-nums">
            Result of that run: {run.counts.evaluated} checked · {run.counts.passed} passed ·{" "}
            {run.counts.failed} failed
            {run.counts.notAssessed > 0 ? ` · ${run.counts.notAssessed} not assessed` : ""}
          </p>
        )}

        <Link
          href="/dashboard/assurance/history"
          className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] w-fit"
        >
          View verification history
        </Link>
      </VStack>
    </Card>
  );
}
