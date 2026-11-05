"use client";

import { Button, ErrorState } from "@/lib/ui";

export default function OverviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Overview could not be loaded"
      description="Nothing in your cloud changed. Try again, and if it keeps happening send us the reference below."
      detail={error.digest ? `Reference ${error.digest}` : undefined}
      action={
        <Button variant="secondary" size="sm" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
