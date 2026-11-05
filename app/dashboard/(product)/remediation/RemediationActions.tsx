"use client";

import { useState } from "react";
import { Button, HStack } from "@/lib/ui";
import type { Remediation } from "@/lib/domain";
import { REMEDIATION_VERDICT, remediationActionVisibility } from "@/lib/domain";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { useRemediationMutations } from "@/lib/data/hooks";

/**
 * RemediationActions — controls that do what they say.
 *
 * These were disabled while there was no remediation API. There is one now, and
 * it is bounded: this component can only approve, reject or apply a request the
 * server already created and already bound to a tenant, account, region,
 * resource, control and allow-listed action. Nothing here describes a change.
 *
 * Capability still decides what is offered, and the server decides again. An
 * approver sees approve, reject and apply; an engineer sees the request they may
 * re-raise; a reader sees neither. Hiding a button is not authorization, so the
 * BFF re-checks the capability and the backend re-checks the scope.
 *
 * The verdict, not the state, is what tells the customer whether they are safe.
 * A request whose write succeeded but whose control still fails renders as
 * "Did not fix it", and the re-request control is offered for exactly that case.
 */

export function RemediationActions({ remediation }: { remediation: Remediation }) {
  const { role } = useSession();
  const { approve, reject, apply, pending } = useRemediationMutations();
  const [failed, setFailed] = useState<string | undefined>(undefined);

  const mayApprove = canDo(role, "approveRemediation");
  const mayRequest = canDo(role, "requestRemediation");

  const { showApproval, showApply, showReRequest, ineffective } = remediationActionVisibility(
    remediation,
    mayApprove,
    mayRequest,
  );

  if (!showApproval && !showApply && !showReRequest) return null;

  async function guard(fn: () => Promise<unknown>) {
    setFailed(undefined);
    try {
      await fn();
    } catch (e) {
      // Surfaced, never swallowed. A control that silently did nothing would
      // leave the reader believing their cloud had changed.
      setFailed(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <HStack gap="sm" align="center" className="flex-wrap">
      {showApproval && (
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => void guard(() => approve(remediation.id))}
          >
            {pending ? "Working…" : "Approve"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => void guard(() => reject(remediation.id, "Declined by approver"))}
          >
            Reject
          </Button>
        </>
      )}

      {showApply && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => void guard(() => apply(remediation.id))}
          title="Applies the change, then re-checks the control. The result of that check is the outcome."
        >
          {pending ? "Applying…" : "Apply fix"}
        </Button>
      )}

      {showReRequest && (
        <span className="text-[10px] text-[var(--fg-subtle)]">
          {ineffective
            ? REMEDIATION_VERDICT.NOT_EFFECTIVE.meaning
            : "This change did not go through. Raise it again from the control."}
        </span>
      )}

      {failed && (
        <span role="alert" className="text-[10px] text-[var(--intent-danger)]">
          {failed}
        </span>
      )}
    </HStack>
  );
}
