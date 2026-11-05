"use client";

import { Button, ErrorState } from "@/lib/ui";

export default function RemediationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Remediation could not be loaded"
      description="Nothing in your cloud was changed and no request was sent. Try again, and send us the reference below if it persists."
      detail={error.digest ? `Reference ${error.digest}` : undefined}
      action={
        <Button variant="secondary" size="sm" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
