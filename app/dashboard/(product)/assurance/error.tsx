"use client";

import { Button, ErrorState } from "@/lib/ui";

export default function AssuranceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Assurance could not be loaded"
      description="Nothing in your cloud changed, and no record was altered. Try again, and send us the reference below if it persists."
      detail={error.digest ? `Reference ${error.digest}` : undefined}
      action={
        <Button variant="secondary" size="sm" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
