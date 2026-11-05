"use client";

import * as React from "react";
import { Button, ErrorState, Skeleton, UnavailableState } from "@/lib/ui";
import type { Query } from "@/lib/data";

/**
 * QueryBoundary — five states, kept apart.
 *
 * On an administration page the distinction matters more than anywhere else:
 * "no API keys exist" and "we cannot tell you what API keys exist" have
 * opposite security implications, and an administrator must never be shown one
 * when the other is true.
 */
export function QueryBoundary<T>({
  query,
  unavailableMessage,
  skeleton,
  children,
}: {
  query: Query<T>;
  unavailableMessage: string;
  skeleton?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  const fallback = skeleton ?? <Skeleton className="h-32 w-full" />;
  if (query.unavailable) return <UnavailableState willShow={unavailableMessage} />;
  if (query.isLoading) return <>{fallback}</>;
  if (query.error) {
    return (
      <ErrorState
        title="We could not load this"
        description="The request did not complete. Nothing was changed."
        detail={query.error.message}
        action={
          <Button variant="secondary" size="sm" onClick={query.refresh}>
            Try again
          </Button>
        }
      />
    );
  }
  if (query.data === undefined) return <>{fallback}</>;
  return <>{children(query.data)}</>;
}
