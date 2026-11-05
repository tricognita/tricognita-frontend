"use client";

import { Button, ErrorState } from "@/lib/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="This administration page could not be loaded"
      description="Nothing was changed. Try again, and send us the reference below if it persists."
      detail={error.digest ? `Reference ${error.digest}` : undefined}
      action={
        <Button variant="secondary" size="sm" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
