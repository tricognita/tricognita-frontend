"use client";

import * as React from "react";
import { Button, ErrorState, Skeleton, UnavailableState } from "@/lib/ui";
import type { Query } from "@/lib/data";

/**
 * QueryBoundary — loading, populated, empty, error, unavailable, kept apart.
 *
 * "No reports yet" and "reports are not switched on" are different sentences
 * and must never be shown for each other: one is a fact about the customer's
 * account, the other is a fact about ours.
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
  const fallback = skeleton ?? <SkeletonRows />;
  if (query.unavailable) return <UnavailableState willShow={unavailableMessage} />;
  if (query.isLoading) return <>{fallback}</>;
  if (query.error) {
    return (
      <ErrorState
        title="We could not load this"
        description="The request did not complete. No report was generated and no record changed."
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

export function SkeletonRows({ count = 3, height = "h-24" }: { count?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${height} w-full`} />
      ))}
    </div>
  );
}
