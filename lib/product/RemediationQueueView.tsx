import * as React from "react";
import { EmptyState, Section } from "@/lib/ui";
import {
  remediationQueue,
  type Control,
  type Finding,
  type Remediation,
  type RemediationQueue,
  type Resource,
} from "@/lib/domain";
import { RemediationCard } from "./RemediationCard";

/**
 * RemediationQueueView — the queue as an operator works it.
 *
 * Sections in the order someone acts: what is waiting on a decision, what
 * broke, what was applied but not yet re-checked, what is running, then the
 * closed record. A bucket with nothing in it says so rather than disappearing,
 * because "no fixes are waiting for approval" is itself the answer to the
 * question the operator opened this page to ask.
 */

type BucketKey = keyof RemediationQueue;

interface BucketSpec {
  key: BucketKey;
  eyebrow: string;
  title: string;
  description: string;
  empty: string;
}

const BUCKETS: BucketSpec[] = [
  {
    key: "awaitingApproval",
    eyebrow: "Decide",
    title: "Waiting for approval",
    description: "A change has been asked for. Nothing happens in your cloud until someone approves it.",
    empty: "No fix is waiting for approval.",
  },
  {
    key: "needsAttention",
    eyebrow: "Act",
    title: "Did not apply",
    description: "The change was attempted and did not take effect. The control is still failing.",
    empty: "No fix has failed.",
  },
  {
    key: "awaitingVerification",
    eyebrow: "Confirm",
    title: "Applied, not yet verified",
    description: "The change was made. Until a verification run re-checks the control, it is not recorded as fixed.",
    empty: "Nothing is waiting to be re-checked.",
  },
  {
    key: "inFlight",
    eyebrow: "In progress",
    title: "Approved or running",
    description: "Approved and queued, or being applied now.",
    empty: "No change is being applied.",
  },
  {
    key: "confirmed",
    eyebrow: "Closed",
    title: "Confirmed by verification",
    description: "Applied and re-checked. These are the changes you can point at.",
    empty: "No fix has been confirmed yet.",
  },
  {
    key: "closed",
    eyebrow: "Closed",
    title: "Declined or expired",
    description: "Requests that were not approved, or whose approval window closed.",
    empty: "No request was declined or expired.",
  },
  {
    key: "notStarted",
    eyebrow: "Draft",
    title: "Not started",
    description: "Recorded, not yet requested.",
    empty: "Nothing is sitting unstarted.",
  },
];

export function RemediationQueueView({
  remediations,
  controls,
  findings,
  resources,
  renderActions,
}: {
  remediations: Remediation[];
  controls: Control[];
  findings: Finding[];
  resources: Resource[];
  renderActions?: (remediation: Remediation) => React.ReactNode;
}) {
  if (remediations.length === 0) {
    return (
      <EmptyState
        variant="bordered"
        title="No remediation on record"
        description="A fix is recorded here once one is requested from a finding or a failing control."
      />
    );
  }

  const queue = remediationQueue(remediations);
  const controlById = new Map(controls.map((c) => [c.id, c]));

  return (
    <>
      {BUCKETS.map((bucket) => {
        const rows = queue[bucket.key];
        return (
          <Section
            key={bucket.key}
            eyebrow={bucket.eyebrow}
            title={bucket.title}
            description={bucket.description}
            spacing="sm"
          >
            {rows.length === 0 ? (
              <EmptyState variant="compact" title={bucket.empty} />
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map((r) => (
                  <li key={r.id}>
                    <RemediationCard
                      remediation={r}
                      control={controlById.get(r.controlId)}
                      findings={findings}
                      resources={resources}
                      actions={renderActions?.(r)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        );
      })}
    </>
  );
}
