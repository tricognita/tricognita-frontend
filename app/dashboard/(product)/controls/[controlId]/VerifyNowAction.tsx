"use client";

import { Button, HStack } from "@/lib/ui";
import type { ControlResult } from "@/lib/domain";
import { ControlStatusBadge } from "@/lib/product";
import { useVerifyNow } from "@/lib/data/hooks";

/**
 * VerifyNowAction — one resource, re-checked on demand.
 *
 * Pessimistic like every other mutation here: while a check is running this
 * row shows VERIFYING, and the resource's real status badge (a sibling cell,
 * driven by the same control-results data useVerifyNow revalidates) is what
 * shows the outcome once the check completes — not a locally-guessed one.
 */
export function VerifyNowAction({ controlId, result }: { controlId: string; result: ControlResult }) {
  const { verify, pending, error } = useVerifyNow();

  async function run() {
    try {
      await verify(controlId, result.resourceId);
    } catch {
      // Surfaced below via `error`; the row's own status badge is untouched.
    }
  }

  return (
    <HStack gap="xs" align="center" justify="end" className="flex-wrap">
      {pending && <ControlStatusBadge status="VERIFYING" size="xs" />}
      <Button variant="ghost" size="xs" disabled={pending} onClick={() => void run()}>
        {pending ? "Verifying…" : "Verify now"}
      </Button>
      {error && (
        <span role="alert" className="text-[10px] text-[var(--intent-danger)]">
          {error.message}
        </span>
      )}
    </HStack>
  );
}
