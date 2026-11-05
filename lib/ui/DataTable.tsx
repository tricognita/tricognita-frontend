"use client";

import * as React from "react";
import Link from "next/link";
import { Table, THead, TBody, TR, TH, TD, TBodyEmpty, type TableDensity } from "./Table";
import { Skeleton } from "./Skeleton";

/**
 * DataTable — the product's list surface.
 *
 * Wraps the <Table> primitive with the one behaviour every product list needs
 * and no page should re-implement: below `md` the table becomes a card list
 * instead of scrolling sideways (FRONTEND_ARCHITECTURE.md §7).
 *
 * Each column declares its mobile role, so the card layout is a property of the
 * data rather than a second hand-built markup tree:
 *   title       the card heading (exactly one)
 *   status      rendered top-right (at most one)
 *   supporting  label/value rows inside the card
 *   hidden      desktop only
 */

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  mobile?: "title" | "status" | "supporting" | "hidden";
  /** Tailwind width utility for the desktop column, e.g. "w-[140px]". */
  width?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  /** Whole-row link. Preferred over onRowClick: it is keyboard and middle-click friendly. */
  rowHref?: (row: T) => string;
  loading?: boolean;
  /** Rendered when rows is empty and not loading. */
  empty?: React.ReactNode;
  density?: TableDensity;
  caption: string;
  stickyHeader?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  rowHref,
  loading = false,
  empty,
  density = "comfortable",
  caption,
  stickyHeader = false,
}: DataTableProps<T>) {
  const titleCol = columns.find((c) => c.mobile === "title") ?? columns[0];
  const statusCol = columns.find((c) => c.mobile === "status");
  const supportingCols = columns.filter(
    (c) => c.mobile === "supporting" || (!c.mobile && c !== titleCol && c !== statusCol),
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label={`${caption} loading`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  const isEmpty = rows.length === 0;

  return (
    <>
      {/* Desktop: real table */}
      <div className="hidden md:block">
        <Table density={density} stickyHeader={stickyHeader}>
          <caption className="sr-only">{caption}</caption>
          <THead>
            <TR>
              {columns.map((c) => (
                <TH key={c.id} align={c.align} className={c.width}>
                  {c.header}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {isEmpty ? (
              <TBodyEmpty colSpan={columns.length}>{empty}</TBodyEmpty>
            ) : (
              rows.map((row) => {
                const href = rowHref?.(row);
                return (
                  <TR key={getRowKey(row)}>
                    {columns.map((c, i) => (
                      <TD key={c.id} align={c.align}>
                        {href && i === 0 ? (
                          <Link
                            href={href}
                            className="hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded-sm"
                          >
                            {c.cell(row)}
                          </Link>
                        ) : (
                          c.cell(row)
                        )}
                      </TD>
                    ))}
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden flex flex-col gap-2">
        {isEmpty
          ? empty
          : rows.map((row) => {
              const href = rowHref?.(row);
              const body = (
                <div className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-[var(--text-sm)] text-[var(--fg)] font-medium">
                      {titleCol?.cell(row)}
                    </div>
                    {statusCol && <div className="shrink-0">{statusCol.cell(row)}</div>}
                  </div>
                  {supportingCols.length > 0 && (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {supportingCols.map((c) => (
                        <div key={c.id} className="min-w-0">
                          <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
                            {c.header}
                          </dt>
                          <dd className="text-[var(--text-xs)] text-[var(--fg-muted)] truncate">
                            {c.cell(row)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
              return href ? (
                <Link
                  key={getRowKey(row)}
                  href={href}
                  className="rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                >
                  {body}
                </Link>
              ) : (
                <div key={getRowKey(row)}>{body}</div>
              );
            })}
      </div>
    </>
  );
}
