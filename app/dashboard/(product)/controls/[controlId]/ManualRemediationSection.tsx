"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, DateTime, EmptyState, ErrorState, HStack, Modal, Section, Skeleton, VStack } from "@/lib/ui";
import { ControlStatusBadge } from "@/lib/product";
import {
  EXECUTION_METHOD,
  RECORD_OUTCOME,
  isManualRemediationOpen,
  manualNextStep,
  type ControlResult,
  type ManualRemediation,
  type Resource,
  type StatusPresentation,
} from "@/lib/domain";
import { isNotImplemented, useManualRemediationMutations, useManualRemediations } from "@/lib/data";
import { ApiError } from "@/lib/api/client";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import {
  APPLIED_METHODS,
  MANUAL_STEP_CAPABILITY,
  type AppliedMethod,
} from "@/lib/manual-remediation-policy";

/**
 * Fixes the customer applies themselves.
 *
 * For every change made in the customer's own console, CLI or IaC pipeline.
 * The steps are recorded one at a time and cannot be skipped:
 *
 *   propose → approve → "we applied it" (customer-stated) → Tricognita checks
 *
 * Neither the approval nor the customer's statement makes anything Fixed.
 * Only Tricognita's own check can, and the screen says so at every step.
 * Every action is pessimistic: nothing moves until the server answers.
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

const NOT_OBSERVED = "Tricognita did not observe this change being made.";

const FIELD =
  "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[var(--text-sm)] text-[var(--fg)] w-full";

function OutcomeBadge({ r }: { r: ManualRemediation }) {
  const p = RECORD_OUTCOME[r.outcome];
  return (
    <Badge intent={p.intent} size="sm" title={p.meaning}>
      <span aria-hidden="true" className="mr-1">
        {SHAPE[p.shape]}
      </span>
      {p.label}
    </Badge>
  );
}

/** A plain-language sentence for a failed step. Never "done" on an error. */
export function manualErrorMessage(err: Error): string {
  if (isNotImplemented(err)) {
    return "This fix or resource was not found for your organisation. The list has been refreshed.";
  }
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Your role cannot do this step.";
    if (err.status === 409) {
      return "This fix has already moved on — someone may have approved or recorded it in another window. The list has been refreshed.";
    }
    if (err.status === 422) return "This resource could not be checked, so a change to it cannot be verified yet.";
    if (err.status === 400) return "Some details are missing or not valid. Nothing was recorded.";
    if (err.status === 502 || err.status === 0) {
      return "The check could not run. Nothing was recorded as fixed — try again.";
    }
  }
  return `This step did not complete. Nothing was recorded as fixed. (${err.message})`;
}

function Steps({ r }: { r: ManualRemediation }) {
  const steps = [
    { label: "Proposed", done: true },
    { label: "Approved", done: Boolean(r.approval) },
    { label: "Applied (customer-stated)", done: Boolean(r.statement) },
    { label: "Checked by Tricognita", done: Boolean(r.verification && r.verification.status !== "NOT_ASSESSED") },
  ];
  return (
    <ol className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide" aria-label="Steps">
      {steps.map((s, i) => (
        <li key={s.label} className={s.done ? "text-[var(--fg)]" : "text-[var(--fg-subtle)]"}>
          <span aria-hidden="true">{s.done ? "●" : "○"}</span> {i + 1}. {s.label}
          <span className="sr-only">{s.done ? " (done)" : " (not yet)"}</span>
        </li>
      ))}
    </ol>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{label}</dt>
      <dd className="text-[var(--text-sm)] text-[var(--fg)] break-words">{children}</dd>
    </div>
  );
}

// ── the customer's "we applied it" statement ────────────────────────────────

function AppliedForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (input: { appliedBy: string; method: AppliedMethod; appliedAt: string }) => void;
}) {
  const [appliedBy, setAppliedBy] = useState("");
  const [method, setMethod] = useState<AppliedMethod>("CONSOLE");
  const [appliedAtLocal, setAppliedAtLocal] = useState("");
  const [ack, setAck] = useState(false);
  const [future, setFuture] = useState(false);

  const when = appliedAtLocal ? new Date(appliedAtLocal) : null;
  const whenValid = when !== null && !Number.isNaN(when.getTime());
  const canSubmit = appliedBy.trim().length > 0 && whenValid && ack && !pending;

  // "Not in the future" is checked when the statement is submitted (the
  // backend refuses it too), not during render.
  function submit() {
    if (!when) return;
    if (when.getTime() > Date.now() + 60_000) {
      setFuture(true);
      return;
    }
    setFuture(false);
    onSubmit({ appliedBy: appliedBy.trim(), method, appliedAt: when.toISOString() });
  }

  return (
    <VStack gap="sm" className="rounded-md border border-[var(--border)] p-3">
      <p className="text-[var(--text-sm)] text-[var(--fg)]">
        Record that your team applied this change. This is your statement: {NOT_OBSERVED} Tricognita will check the
        resource itself in the next step.
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Who applied it</span>
        <input
          className={FIELD}
          value={appliedBy}
          onChange={(e) => setAppliedBy(e.target.value)}
          placeholder="Name or team, as you would tell an auditor"
          disabled={pending}
          maxLength={200}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">How it was applied</span>
        <select className={FIELD} value={method} onChange={(e) => setMethod(e.target.value as AppliedMethod)} disabled={pending}>
          {APPLIED_METHODS.map((m) => (
            <option key={m} value={m}>
              {EXECUTION_METHOD[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">When it was applied</span>
        <input
          type="datetime-local"
          className={FIELD}
          value={appliedAtLocal}
          onChange={(e) => setAppliedAtLocal(e.target.value)}
          disabled={pending}
        />
        {future && <span className="text-[10px] text-[var(--intent-danger)]">The time cannot be in the future.</span>}
      </label>
      <label className="flex items-start gap-2 text-[var(--text-sm)] text-[var(--fg)]">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={pending} className="mt-1" />
        <span>I understand this records my team&apos;s statement, not a change Tricognita made or observed.</span>
      </label>
      <HStack gap="sm" justify="end" className="flex-wrap">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={pending}
          disabled={!canSubmit}
          onClick={submit}
        >
          Record as applied
        </Button>
      </HStack>
    </VStack>
  );
}

// ── one customer-applied change ─────────────────────────────────────────────

function ManualRemediationCard({ r, controlId }: { r: ManualRemediation; controlId: string }) {
  const { role } = useSession();
  const { approve, recordApplied, verify, pending, error } = useManualRemediationMutations(controlId);
  const [applying, setApplying] = useState(false);
  const next = manualNextStep(r);

  const mayApprove = canDo(role, MANUAL_STEP_CAPABILITY.approve);
  const mayRecord = canDo(role, MANUAL_STEP_CAPABILITY.applied);
  const mayVerify = canDo(role, MANUAL_STEP_CAPABILITY.verify);

  const swallow = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch {
      // Shown below from `error`; the card keeps the server's state.
    }
  };

  return (
    <Card>
      <VStack gap="sm">
        <HStack gap="sm" className="flex-wrap items-center justify-between">
          <span className="text-[var(--text-sm)] text-[var(--fg)] break-words min-w-0">{r.resourceLabel}</span>
          <OutcomeBadge r={r} />
        </HStack>
        <Steps r={r} />

        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Fact label="Proposed change">{r.proposal.change}</Fact>
          <Fact label="Scope">{r.proposal.scope}</Fact>
          <Fact label="Expected result">{r.proposal.expectedResult}</Fact>
          <Fact label="Rollback">{r.proposal.rollback || "No rollback recorded"}</Fact>
          <Fact label="Proposed by">
            {r.proposal.proposedBy} · <DateTime value={r.proposal.proposedAt} />
          </Fact>
          <Fact label="Approval">
            {r.approval ? (
              <>
                {r.approval.approvedBy} · <DateTime value={r.approval.approvedAt} />
              </>
            ) : (
              "Not approved yet"
            )}
          </Fact>
          <Fact label="Applied by (customer-stated)">
            {r.statement ? (
              <VStack gap="xs">
                <span>
                  {r.statement.appliedBy} · {EXECUTION_METHOD[r.statement.method] ?? r.statement.method}
                  {r.statement.appliedAt ? (
                    <>
                      {" · "}
                      <DateTime value={r.statement.appliedAt} />
                    </>
                  ) : null}
                </span>
                <span className="text-[var(--status-warning)]">
                  Customer-stated, entered by {r.statement.recordedBy}. {NOT_OBSERVED}
                </span>
              </VStack>
            ) : (
              "Not recorded as applied yet"
            )}
          </Fact>
          <Fact label="Checked by Tricognita">
            {r.verification ? (
              <span>
                <ControlStatusBadge status={r.verification.status} size="xs" /> ·{" "}
                <DateTime value={r.verification.verifiedAt} />
              </span>
            ) : (
              "Not verified"
            )}
          </Fact>
        </dl>

        {r.outcome === "DID_NOT_FIX" && (
          <p className="text-[var(--text-sm)] text-[var(--status-danger)]">
            Tricognita&apos;s check found the control still failing on this resource. This fix is not marked fixed. Propose
            a new fix to try again.
          </p>
        )}
        {r.state === "APPROVED" && (
          <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">Approved is not fixed: apply the change in your cloud, then record it here.</p>
        )}

        {next === "approve" &&
          (mayApprove ? (
            <HStack justify="end">
              <Button variant="primary" size="sm" loading={pending} disabled={pending} onClick={() => void swallow(() => approve(r.id))}>
                Approve
              </Button>
            </HStack>
          ) : (
            <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">Waiting for an approver.</p>
          ))}

        {next === "applied" &&
          mayRecord &&
          (applying ? (
            <AppliedForm
              pending={pending}
              onCancel={() => setApplying(false)}
              onSubmit={(input) =>
                void swallow(async () => {
                  await recordApplied(r.id, input);
                  setApplying(false);
                })
              }
            />
          ) : (
            <HStack justify="end">
              <Button variant="primary" size="sm" disabled={pending} onClick={() => setApplying(true)}>
                I&apos;ve applied this
              </Button>
            </HStack>
          ))}

        {next === "verify" && mayVerify && (
          <HStack gap="sm" justify="end" align="center" className="flex-wrap">
            {pending && <ControlStatusBadge status="VERIFYING" size="xs" />}
            <Button variant="primary" size="sm" loading={pending} disabled={pending} onClick={() => void swallow(() => verify(r.id))}>
              {pending ? "Verifying…" : "Verify now"}
            </Button>
          </HStack>
        )}

        {error && (
          <span role="alert" className="text-[var(--text-xs)] text-[var(--intent-danger)]">
            {manualErrorMessage(error)}
          </span>
        )}
      </VStack>
    </Card>
  );
}

// ── proposing a fix: form, then review, then submit ─────────────────────────

function ProposeFixModal({
  open,
  onClose,
  controlId,
  expectedState,
  eligible,
  labelOf,
}: {
  open: boolean;
  onClose: () => void;
  controlId: string;
  expectedState: string;
  eligible: ControlResult[];
  labelOf: (resourceId: string) => string;
}) {
  const { email } = useSession();
  const { propose, pending, error } = useManualRemediationMutations(controlId);
  const [resourceId, setResourceId] = useState("");
  const [change, setChange] = useState("");
  const [expected, setExpected] = useState(expectedState);
  const [rollback, setRollback] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [doneId, setDoneId] = useState<string | undefined>(undefined);

  const chosen = resourceId || eligible[0]?.resourceId || "";
  const canReview = chosen !== "" && change.trim().length > 0 && expected.trim().length > 0;

  function close() {
    setResourceId("");
    setChange("");
    setExpected(expectedState);
    setRollback("");
    setReviewing(false);
    setDoneId(undefined);
    onClose();
  }

  async function submit() {
    try {
      const id = await propose({
        controlId,
        resourceId: chosen,
        proposedChange: change.trim(),
        expectedResult: expected.trim(),
        rollback: rollback.trim(),
      });
      setDoneId(id);
    } catch {
      // Shown from `error`.
    }
  }

  if (doneId) {
    return (
      <Modal open={open} onClose={close} title="Fix proposed">
        <VStack gap="sm">
          <p className="text-[var(--text-sm)] text-[var(--fg)]">
            The proposal is recorded and waiting for approval. Nothing in your cloud has changed.
          </p>
          <HStack justify="end">
            <Button variant="secondary" size="sm" onClick={close}>
              Done
            </Button>
          </HStack>
        </VStack>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={reviewing ? "Review the proposed change" : "Propose a fix you will apply"}
      footer={
        reviewing ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setReviewing(false)} disabled={pending}>
              Back
            </Button>
            <Button variant="primary" size="sm" loading={pending} disabled={pending} onClick={() => void submit()}>
              Submit proposal
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!canReview} onClick={() => setReviewing(true)}>
              Review change
            </Button>
          </>
        )
      }
    >
      {reviewing ? (
        <VStack gap="sm">
          <dl className="grid grid-cols-1 gap-3">
            <Fact label="Resource">{labelOf(chosen)}</Fact>
            <Fact label="Scope">This one resource only.</Fact>
            <Fact label="What should change">{change.trim()}</Fact>
            <Fact label="Expected result">{expected.trim()}</Fact>
            <Fact label="Rollback">{rollback.trim() || "No rollback recorded"}</Fact>
            <Fact label="Proposed by">{email ?? "You"}</Fact>
          </dl>
          <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
            Submitting records a proposal. It changes nothing in your cloud, and it needs approval before it can be
            recorded as applied.
          </p>
          {error && (
            <span role="alert" className="text-[var(--text-xs)] text-[var(--intent-danger)]">
              {manualErrorMessage(error)}
            </span>
          )}
        </VStack>
      ) : (
        <VStack gap="sm">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Failing resource</span>
            <select className={FIELD} value={chosen} onChange={(e) => setResourceId(e.target.value)}>
              {eligible.map((r) => (
                <option key={r.resourceId} value={r.resourceId}>
                  {labelOf(r.resourceId)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">What should change</span>
            <textarea className={FIELD} rows={3} maxLength={2000} value={change} onChange={(e) => setChange(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Expected result</span>
            <textarea className={FIELD} rows={2} maxLength={1000} value={expected} onChange={(e) => setExpected(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Rollback</span>
            <textarea
              className={FIELD}
              rows={2}
              maxLength={1000}
              value={rollback}
              placeholder="How your team would undo this change"
              onChange={(e) => setRollback(e.target.value)}
            />
          </label>
        </VStack>
      )}
    </Modal>
  );
}

// ── the section ────────────────────────────────────────────────────────────

export function ManualRemediationSection({
  controlId,
  expectedState,
  results,
  resources,
}: {
  controlId: string;
  expectedState: string;
  results: ControlResult[];
  resources: Resource[];
}) {
  const { role } = useSession();
  const list = useManualRemediations(controlId);
  const [proposing, setProposing] = useState(false);

  const labelById = new Map(resources.map((r) => [r.id, r.label]));
  const labelOf = (id: string) => labelById.get(id) ?? id;

  // A resource can be proposed for only while it is failing and has no open
  // customer-applied fix already — the lifecycle is one change at a time.
  const open = (list.data ?? []).filter(isManualRemediationOpen);
  const busy = new Set(open.map((r) => r.resourceId));
  const eligible = results.filter((r) => r.status === "FAIL" && !busy.has(r.resourceId));
  const mayPropose = canDo(role, MANUAL_STEP_CAPABILITY.propose);

  return (
    <Section
      eyebrow="Remediation"
      title="Fixes you apply yourself"
      description="For changes your team makes in its own console, CLI or infrastructure as code. Tricognita records the proposal and approval, takes your statement that it was applied, then checks the resource itself. Only that check can mark it fixed."
      actions={
        mayPropose && eligible.length > 0 && !list.unavailable ? (
          <Button variant="secondary" size="sm" onClick={() => setProposing(true)} disabled={list.isLoading}>
            Propose a fix
          </Button>
        ) : undefined
      }
    >
      {list.unavailable ? (
        <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">
          Fixes your team applied, and Tricognita&apos;s checks of them, appear in the{" "}
          <Link href="/dashboard/reports/assurance-record" className="underline underline-offset-2">
            Control Assurance Record
          </Link>
          .
        </p>
      ) : list.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : list.error ? (
        <ErrorState
          title="Fixes could not be loaded"
          detail={list.error.message}
          action={
            <Button variant="secondary" size="sm" onClick={list.refresh}>
              Try again
            </Button>
          }
        />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          variant="compact"
          title="No fixes recorded for this control"
          description={
            mayPropose && eligible.length > 0
              ? "Propose a fix for a failing resource to start."
              : "A fix can be proposed while a resource is failing this control."
          }
        />
      ) : (
        <VStack gap="sm">
          {(list.data ?? []).map((r) => (
            <ManualRemediationCard key={r.id} r={r} controlId={controlId} />
          ))}
        </VStack>
      )}

      {mayPropose && (
        <ProposeFixModal
          open={proposing}
          onClose={() => setProposing(false)}
          controlId={controlId}
          expectedState={expectedState}
          eligible={eligible}
          labelOf={labelOf}
        />
      )}
    </Section>
  );
}
