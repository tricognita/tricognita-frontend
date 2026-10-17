import Link from "next/link";
import { Badge, Card, DateTime, HStack, VStack } from "@/lib/ui";
import {
  findingForRemediation,
  isAwaitingVerification,
  isRemediationConfirmed,
  type Control,
  type Finding,
  type Remediation,
  type RemediationMethod,
  type Resource,
} from "@/lib/domain";
import { RemediationStatusBadge } from "./StatusBadges";

/**
 * RemediationCard — one controlled change, read end to end.
 *
 * Remediation → finding → control → resource, then what was asked, who
 * approved it, what happened, and whether a verification run has confirmed it.
 *
 * The last part is the one that matters: a change that was applied but never
 * re-checked is shown as awaiting verification, never as fixed. Customers are
 * told the cloud changed only when the record says a run confirmed it.
 */

const METHOD_LABEL: Record<RemediationMethod, string> = {
  AUTOMATED: "Automated fix",
  TRICOGNITA_ENGINEER: "Applied by a Tricognita engineer",
  CUSTOMER: "Applied by your team",
};

const OUTCOME_LABEL: Record<"FIXED" | "FAILED" | "SKIPPED", string> = {
  FIXED: "Changed",
  FAILED: "Not changed",
  SKIPPED: "Skipped",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{label}</dt>
      <dd className="text-[var(--text-xs)] text-[var(--fg)] break-words">{children}</dd>
    </div>
  );
}

export function RemediationCard({
  remediation,
  control,
  findings,
  resources,
  actions,
}: {
  remediation: Remediation;
  control?: Control;
  findings: Finding[];
  resources: Resource[];
  /** Approve / reject / re-request, already gated by the caller. */
  actions?: React.ReactNode;
}) {
  const finding = findingForRemediation(findings, remediation.id);
  const confirmed = isRemediationConfirmed(remediation);
  const awaiting = isAwaitingVerification(remediation);
  const resourceLabel = (id: string) => resources.find((r) => r.id === id)?.label ?? "a resource";

  return (
    <Card>
      <VStack gap="sm">
        <HStack gap="sm" justify="between" align="start" className="flex-wrap">
          <VStack gap="xs" className="min-w-0">
            <span className="text-[var(--text-sm)] font-medium text-[var(--fg)] break-words">
              {remediation.summary}
            </span>
            <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
              {METHOD_LABEL[remediation.method]}
            </span>
          </VStack>
          <HStack gap="xs" align="center" className="flex-wrap">
            <RemediationStatusBadge state={remediation.state} size="xs" />
            {awaiting && (
              <Badge
                intent="warning"
                size="xs"
                title="The change was applied. No verification run has re-checked the control yet, so it is not recorded as fixed."
              >
                <span aria-hidden="true" className="mr-1">
                  ◎
                </span>
                Awaiting verification
              </Badge>
            )}
          </HStack>
        </HStack>

        {/* remediation → finding → control → resource */}
        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Control">
            <Link
              href={`/dashboard/controls/${remediation.controlId}`}
              className="underline underline-offset-2 hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
            >
              {control?.name ?? remediation.controlId}
            </Link>
          </Field>

          <Field label="Finding">
            {finding ? (
              <Link
                href={`/dashboard/findings/${finding.id}`}
                className="underline underline-offset-2 hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                {finding.title}
              </Link>
            ) : (
              <span className="text-[var(--fg-subtle)]">No finding linked</span>
            )}
          </Field>

          <Field label={remediation.resourceIds.length === 1 ? "Resource" : "Resources"}>
            {remediation.resourceIds.map(resourceLabel).join(", ")}
          </Field>

          <Field label="Requested">
            <DateTime value={remediation.requestedAt} variant="both" /> by {remediation.requestedBy}
          </Field>
        </dl>

        {/* approval → execution → verification */}
        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 border-t border-[var(--border-subtle)] pt-3">
          <Field label="Approval">
            {remediation.approvedBy ? (
              <>
                {remediation.approvedBy}
                {remediation.approvedAt && (
                  <>
                    {", "}
                    <DateTime value={remediation.approvedAt} variant="relative" />
                  </>
                )}
              </>
            ) : remediation.state === "PENDING_APPROVAL" ? (
              <span className="text-[var(--fg-muted)]">
                Waiting for an approver
                {remediation.approvalExpiresAt && (
                  <>
                    {" · request expires "}
                    <DateTime value={remediation.approvalExpiresAt} variant="relative" />
                  </>
                )}
              </span>
            ) : remediation.state === "REJECTED" ? (
              <span className="text-[var(--fg-muted)]">Declined</span>
            ) : (
              <span className="text-[var(--fg-subtle)]">Not approved</span>
            )}
          </Field>

          <Field label="Execution">
            {remediation.executedAt ? (
              <DateTime value={remediation.executedAt} variant="both" />
            ) : (
              <span className="text-[var(--fg-subtle)]">Not applied</span>
            )}
          </Field>

          <Field label="Completed">
            {remediation.completedAt ? (
              <DateTime value={remediation.completedAt} variant="both" />
            ) : (
              <span className="text-[var(--fg-subtle)]">—</span>
            )}
          </Field>

          <Field label="Verification">
            {confirmed ? (
              <Link
                href="/dashboard/assurance/history"
                className="underline underline-offset-2 hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                Confirmed by a verification run
              </Link>
            ) : awaiting ? (
              <Link
                href="/dashboard/assurance/verification"
                className="underline underline-offset-2 hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                Not yet re-checked
              </Link>
            ) : (
              <span className="text-[var(--fg-subtle)]">Not applicable yet</span>
            )}
          </Field>
        </dl>

        {remediation.outcome && remediation.outcome.length > 0 && (
          <VStack gap="xs">
            <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
              Per resource
            </span>
            <ul className="flex flex-col gap-1">
              {remediation.outcome.map((o) => (
                <li
                  key={o.resourceId}
                  className="flex flex-wrap items-baseline gap-x-2 text-[var(--text-xs)]"
                >
                  <span className="text-[var(--fg)]">{resourceLabel(o.resourceId)}</span>
                  <span
                    className={
                      o.status === "FAILED"
                        ? "text-[var(--status-danger)]"
                        : "text-[var(--fg-muted)]"
                    }
                  >
                    {OUTCOME_LABEL[o.status]}
                  </span>
                  {o.message && (
                    <span className="text-[var(--fg-muted)] break-words">— {o.message}</span>
                  )}
                </li>
              ))}
            </ul>
          </VStack>
        )}

        {remediation.rollback && (
          <p className="text-[var(--text-xs)] text-[var(--fg-muted)] break-words">
            <span className="text-[var(--fg-subtle)]">If it needs undoing: </span>
            {remediation.rollback}
          </p>
        )}

        {actions && (
          <HStack gap="sm" align="center" className="flex-wrap">
            {actions}
          </HStack>
        )}
      </VStack>
    </Card>
  );
}
