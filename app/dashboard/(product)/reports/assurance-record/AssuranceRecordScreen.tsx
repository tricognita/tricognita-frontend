"use client";

import * as React from "react";
import {
  AuthorizingState,
  Badge,
  Button,
  Card,
  DateTime,
  EmptyState,
  HStack,
  NotAuthorizedState,
  Section,
  Skeleton,
  VStack,
} from "@/lib/ui";
import { ControlStatusBadge } from "@/lib/product";
import {
  CONTROL_STATUS,
  CONTROL_STATUS_ORDER,
  EXECUTION_BASIS,
  EXECUTION_METHOD,
  RECORD_EVIDENCE_INTEGRITY,
  RECORD_INTEGRITY,
  RECORD_OUTCOME,
  type AssuranceRecord,
  type ControlStatus,
  type NotAssessedReason,
  type RecordEntry,
  type RecordEvidenceRef,
  type RecordObservation,
  type RecordRemediation,
  type StatusPresentation,
} from "@/lib/domain";
import { useAssuranceRecord } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary, SkeletonRows } from "../QueryBoundary";

/**
 * Control Assurance Record — the factual record behind every control state.
 *
 * Built to answer, per control and resource: what failed originally, what
 * change was proposed, who approved it, who applied it (and on what basis we
 * know), whether Tricognita verified it, whether it stayed fixed, and what
 * evidence supports each state. It is deliberately not a dashboard: no score,
 * no chart, no "compliant" and no "audit ready".
 */

const SHAPE: Record<StatusPresentation["shape"], string> = {
  dot: "●",
  square: "■",
  half: "◧",
  ring: "◎",
  hollow: "○",
  diamond: "◈",
  dash: "–",
};

function PresentationBadge({ p }: { p: StatusPresentation }) {
  return (
    <Badge intent={p.intent} size="sm" title={p.meaning}>
      <span aria-hidden="true" className="mr-1">
        {SHAPE[p.shape]}
      </span>
      {p.label}
    </Badge>
  );
}

function StatusOf({ o }: { o: RecordObservation }) {
  const reason = o.notAssessedReason && o.notAssessedReason !== "NOT_RECORDED" ? (o.notAssessedReason as NotAssessedReason) : undefined;
  return <ControlStatusBadge status={o.status} reason={reason} size="sm" />;
}

function EvidenceRef({ e }: { e: RecordEvidenceRef | null }) {
  if (!e) return <span className="text-[var(--fg-subtle)]">No evidence recorded</span>;
  const bad = e.integrity === "FAILED" || e.integrity === "MISSING";
  return (
    <span className={bad ? "text-[var(--status-danger)]" : "text-[var(--fg-muted)]"}>
      <span className="font-mono">{e.ref || "EV-UNKNOWN"}</span> · {RECORD_EVIDENCE_INTEGRITY[e.integrity]}
    </span>
  );
}

/** A labelled fact. Stacks on narrow screens; never forces horizontal scroll. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{label}</dt>
      <dd className="text-[var(--text-sm)] text-[var(--fg)] break-words">{children}</dd>
    </div>
  );
}

function Header({ record, onExport, mayExport }: { record: AssuranceRecord; onExport: () => void; mayExport: boolean }) {
  const integrity = RECORD_INTEGRITY[record.integrity.status];
  return (
    <Card>
      <VStack gap="md">
        <HStack gap="md" className="flex-wrap items-start justify-between">
          <VStack gap="xs" className="min-w-0">
            <span className="text-[var(--text-lg)] text-[var(--fg)] break-words">
              {record.organisation || "Your organisation"}
            </span>
            <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
              Control Assurance Record · {record.schema}
            </span>
          </VStack>
          {mayExport && (
            <Button variant="secondary" size="sm" onClick={onExport}>
              Download record (JSON)
            </Button>
          )}
        </HStack>

        <p
          role="note"
          className="text-[var(--text-sm)] text-[var(--fg)] border-l-2 border-[var(--border-strong,var(--fg-subtle))] pl-3 max-w-[80ch]"
        >
          {record.disclaimer}
        </p>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Reporting period">
            {record.period.from ? <DateTime value={record.period.from} withTime={false} /> : "All recorded history"}
            {" – "}
            <DateTime value={record.period.to} />
          </Fact>
          <Fact label="Generated">
            <DateTime value={record.generatedAt} />
            {record.generatedBy ? ` by ${record.generatedBy}` : ""}
          </Fact>
          <Fact label="Environment">{record.scope.environment.label}</Fact>
          <Fact label="Cloud accounts">
            {record.scope.accounts.length === 0
              ? "None connected"
              : record.scope.accounts.map((a) => `${a.cloud} · ${a.label}${a.idMasked ? ` (${a.idMasked})` : ""}`).join("; ")}
          </Fact>
          <Fact label="Regions">{record.scope.regions.length ? record.scope.regions.join(", ") : "None recorded"}</Fact>
          <Fact label="Evidence integrity">
            <VStack gap="xs">
              <span>
                <PresentationBadge p={integrity} />
              </span>
              <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                {record.integrity.statement} {record.integrity.recordsVerified} of {record.integrity.recordsReferenced}{" "}
                referenced records checked.
              </span>
            </VStack>
          </Fact>
        </dl>
      </VStack>
    </Card>
  );
}

function Counts({ record }: { record: AssuranceRecord }) {
  const statuses = (Object.keys(CONTROL_STATUS) as ControlStatus[]).sort(
    (a, b) => CONTROL_STATUS_ORDER[a] - CONTROL_STATUS_ORDER[b],
  );
  return (
    <Card>
      <HStack gap="xl" className="flex-wrap">
        <VStack gap="xs">
          <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Control × resource records</span>
          <span className="text-[var(--text-lg)] tabular-nums">{record.entries.length}</span>
        </VStack>
        {statuses.map((s) => (
          <VStack gap="xs" key={s}>
            <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
              Latest: {CONTROL_STATUS[s].label}
            </span>
            <span className="text-[var(--text-lg)] tabular-nums">{record.countsByLatestStatus[s] ?? 0}</span>
          </VStack>
        ))}
        <VStack gap="xs">
          <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Controls never checked</span>
          <span className="text-[var(--text-lg)] tabular-nums">{record.controlsNotAssessed.length}</span>
        </VStack>
      </HStack>
    </Card>
  );
}

function RemediationBlock({ r }: { r: RecordRemediation }) {
  const stated = r.execution?.basis === "CUSTOMER_STATED";
  return (
    <div className="rounded-md border border-[var(--border)] p-3">
      <VStack gap="sm">
        <HStack gap="sm" className="flex-wrap items-center">
          <PresentationBadge p={RECORD_OUTCOME[r.outcome]} />
          <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
            {r.kind === "TRICOGNITA_AUTOMATED_FIX" ? "Tricognita automated fix" : "Change applied by the customer"}
          </span>
        </HStack>
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Fact label="Proposed change">{r.proposal.change || "Not recorded"}</Fact>
          <Fact label="Change scope">{r.proposal.scope || "Not recorded"}</Fact>
          <Fact label="Expected result">{r.proposal.expectedResult || "Not recorded"}</Fact>
          <Fact label="Rollback">{r.proposal.rollback || "No rollback recorded"}</Fact>
          <Fact label="Proposed by">
            {r.proposal.proposedBy || "Not recorded"} · <DateTime value={r.proposal.proposedAt} />
          </Fact>
          <Fact label="Approval">
            {r.approval ? (
              <>
                {r.approval.approvedBy} · <DateTime value={r.approval.approvedAt} />
              </>
            ) : (
              "Not approved"
            )}
          </Fact>
          <Fact label={stated ? "Applied by (customer-stated)" : "Applied by"}>
            {r.execution ? (
              <VStack gap="xs">
                <span>
                  {r.execution.executor || "Not recorded"} ·{" "}
                  {EXECUTION_METHOD[r.execution.method] ?? r.execution.method}
                  {r.execution.executedAt ? (
                    <>
                      {" · "}
                      <DateTime value={r.execution.executedAt} />
                    </>
                  ) : stated ? (
                    " · time not stated"
                  ) : null}
                </span>
                <span className={stated ? "text-[var(--status-warning)]" : "text-[var(--fg-muted)]"}>
                  {EXECUTION_BASIS[r.execution.basis]}
                  {stated && r.execution.recordedBy ? `, entered by ${r.execution.recordedBy}` : ""}
                  {stated ? ". Tricognita did not observe this change being made." : ""}
                </span>
              </VStack>
            ) : (
              "Not applied"
            )}
          </Fact>
          <Fact label="Verified by Tricognita">
            {r.verification ? (
              <VStack gap="xs">
                <span>
                  <ControlStatusBadge status={r.verification.status} size="xs" /> ·{" "}
                  <DateTime value={r.verification.verifiedAt} />
                </span>
                <EvidenceRef e={r.verification.evidence} />
              </VStack>
            ) : (
              "Not verified"
            )}
          </Fact>
        </dl>
      </VStack>
    </div>
  );
}

function EntryCard({ entry }: { entry: RecordEntry }) {
  return (
    <Card>
      <VStack gap="md">
        <HStack gap="sm" className="flex-wrap items-start justify-between">
          <VStack gap="xs" className="min-w-0">
            <span className="text-[var(--text-sm)] text-[var(--fg)] break-words">
              <span className="font-mono text-[var(--fg-muted)]">{entry.controlId}</span> {entry.controlName}
            </span>
            <span className="text-[var(--text-xs)] text-[var(--fg-muted)] break-words">
              {entry.resource.label} ({entry.resource.identifierMasked}) · {entry.cloud} ·{" "}
              {entry.account.label || "account"} {entry.account.idMasked} · {entry.region || "no region"} ·{" "}
              {entry.environment.label}
            </span>
          </VStack>
          <StatusOf o={entry.latest} />
        </HStack>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Original state">
            <VStack gap="xs">
              <span>
                <StatusOf o={entry.original} /> · <DateTime value={entry.original.observedAt} />
              </span>
              <EvidenceRef e={entry.original.evidence} />
            </VStack>
          </Fact>
          <Fact label="Latest state">
            <VStack gap="xs">
              <span>
                <StatusOf o={entry.latest} /> · <DateTime value={entry.latest.observedAt} />
              </span>
              <EvidenceRef e={entry.latest.evidence} />
            </VStack>
          </Fact>
          <Fact label="Subsequent checks">{entry.subsequentChecks}</Fact>
          <Fact label="Drift events">
            {entry.driftEvents.length === 0 ? (
              "None recorded"
            ) : (
              <VStack gap="xs">
                {entry.driftEvents.map((d, i) => (
                  <span key={i}>
                    <DateTime value={d.detectedAt} /> · <EvidenceRef e={d.evidence} />
                  </span>
                ))}
              </VStack>
            )}
          </Fact>
        </dl>

        {entry.remediations.length > 0 && (
          <VStack gap="sm">
            <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Remediation history</span>
            {entry.remediations.map((r) => (
              <RemediationBlock key={r.id} r={r} />
            ))}
          </VStack>
        )}

        <details>
          <summary className="cursor-pointer text-[var(--text-xs)] text-[var(--fg-muted)] hover:text-[var(--fg)]">
            Every check ({entry.checks.length})
          </summary>
          <ol className="mt-2 flex flex-col gap-2">
            {entry.checks.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--text-xs)] min-w-0">
                <DateTime value={c.observedAt} />
                <StatusOf o={c} />
                {c.previousStatus && (
                  <span className="text-[var(--fg-muted)]">was {CONTROL_STATUS[c.previousStatus].label}</span>
                )}
                {c.trigger && <span className="text-[var(--fg-subtle)]">{c.trigger.toLowerCase().replace("_", "-")}</span>}
                <EvidenceRef e={c.evidence} />
              </li>
            ))}
          </ol>
        </details>
      </VStack>
    </Card>
  );
}

function RecordBody({ record }: { record: AssuranceRecord }) {
  const { role } = useSession();
  const mayExport = canDo(role, "exportReports");

  const onExport = React.useCallback(() => {
    const blob = new Blob([record.exportDocument], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tricognita-control-assurance-record-${record.generatedAt.slice(0, 10) || "export"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [record]);

  const entries = [...record.entries].sort(
    (a, b) => CONTROL_STATUS_ORDER[a.latest.status] - CONTROL_STATUS_ORDER[b.latest.status],
  );

  return (
    <VStack gap="lg">
      <Header record={record} onExport={onExport} mayExport={mayExport} />
      <Counts record={record} />

      {record.truncated && (
        <p className="text-[var(--text-sm)] text-[var(--status-warning)]">
          This record was truncated because the organisation has more history than one record holds. Narrow the period to
          see all of it.
        </p>
      )}

      {entries.length === 0 ? (
        <EmptyState
          title="No checks recorded yet"
          description="Once a verification has run, every control and resource it checked appears here with its history."
        />
      ) : (
        <VStack gap="md">
          {entries.map((e) => (
            <EntryCard key={`${e.controlId}:${e.resource.id}`} entry={e} />
          ))}
        </VStack>
      )}

      {record.controlsNotAssessed.length > 0 && (
        <Section
          eyebrow="Not assessed"
          title="Controls with no check in this period"
          description="Never counted as passing."
          spacing="sm"
        >
          <ul className="flex flex-col gap-1 text-[var(--text-sm)]">
            {record.controlsNotAssessed.map((c) => (
              <li key={c.controlId} className="break-words">
                <span className="font-mono text-[var(--fg-muted)]">{c.controlId}</span> {c.controlName} —{" "}
                <span className="text-[var(--fg-muted)]">not assessed</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </VStack>
  );
}

export function AssuranceRecordScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const record = useAssuranceRecord();

  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "viewEvidence")) {
    return <NotAuthorizedState subject="the control assurance record" askWho="an administrator" />;
  }

  return (
    <Section
      eyebrow="The record"
      title="Control Assurance Record"
      description="For each control and resource: what failed originally, what change was proposed, who approved it, who applied it, whether Tricognita verified it, whether it stayed fixed, and the evidence behind each state."
      spacing="sm"
    >
      <QueryBoundary
        query={record}
        unavailableMessage="The control assurance record, generated from your checks, changes and evidence."
        skeleton={
          <VStack gap="md">
            <Skeleton className="h-40 w-full" />
            <SkeletonRows count={3} height="h-40" />
          </VStack>
        }
      >
        {(data) => <RecordBody record={data} />}
      </QueryBoundary>
    </Section>
  );
}
