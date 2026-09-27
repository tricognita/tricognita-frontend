"use client";

import * as React from "react";
import { cn } from "./cn";
import { Button } from "./Button";

/**
 * Pagination — cursor-based, matching the backend ledger contract
 * (count + next_cursor). Deliberately not page-numbered: the history and
 * ledger surfaces are append-only streams where page numbers drift.
 */

interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of items currently shown. */
  shown: number;
  /** Total, when the API returns one. */
  total?: number;
  hasNext: boolean;
  hasPrevious?: boolean;
  onNext: () => void;
  onPrevious?: () => void;
  loading?: boolean;
  itemLabel?: string;
}

export function Pagination({
  shown,
  total,
  hasNext,
  hasPrevious = false,
  onNext,
  onPrevious,
  loading = false,
  itemLabel = "items",
  className,
  ...rest
}: PaginationProps) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 flex-wrap pt-3", className)}
      {...rest}
    >
      <p className="text-[11px] text-[var(--fg-subtle)] tabular-nums">
        Showing {shown}
        {typeof total === "number" ? ` of ${total}` : ""} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        {onPrevious && (
          <Button variant="ghost" size="sm" onClick={onPrevious} disabled={!hasPrevious || loading}>
            Previous
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onNext} disabled={!hasNext || loading}>
          {loading ? "Loading…" : "Next"}
        </Button>
      </div>
    </div>
  );
}
