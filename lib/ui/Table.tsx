"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * Table — lightweight, consistent enterprise table primitive.
 *
 * Design goals:
 *   - One source of truth for table border / header / row / cell styling
 *   - Composable: <Table><THead><TR><TH>…</TH></TR></THead><TBody>…</TBody></Table>
 *   - Built-in horizontal scroll wrapper
 *   - Density tokens (compact/comfortable/spacious) for vertical rhythm
 *   - Optional sticky header
 *   - First-class loading + empty states via dedicated slots
 *
 * Not goals (deliberately not in this primitive):
 *   - Sorting / filtering / pagination logic (caller's concern)
 *   - Virtualization (use react-window per-route if needed)
 *   - Cell editing (use a form library per-route)
 *
 * Example:
 *   <Table density="compact" stickyHeader>
 *     <THead>
 *       <TR>
 *         <TH>Resource</TH>
 *         <TH>Severity</TH>
 *         <TH align="right">Age</TH>
 *       </TR>
 *     </THead>
 *     <TBody>
 *       {rows.length === 0 ? (
 *         <TBodyEmpty colSpan={3}>
 *           <EmptyState title="No active findings" />
 *         </TBodyEmpty>
 *       ) : rows.map(row => (
 *         <TR key={row.id}>
 *           <TD>{row.resource}</TD>
 *           <TD><Badge intent="danger">{row.severity}</Badge></TD>
 *           <TD align="right">{row.age}</TD>
 *         </TR>
 *       ))}
 *     </TBody>
 *   </Table>
 */

export type TableDensity = "compact" | "comfortable" | "spacious";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  density?: TableDensity;
  stickyHeader?: boolean;
  /** Adds horizontal-scroll wrapper. Set to false only when caller wraps manually. */
  scroll?: boolean;
}

const TableDensityContext = React.createContext<TableDensity>("comfortable");
const TableStickyContext = React.createContext<boolean>(false);

const ROOT_CLASSES = "w-full text-xs text-[var(--stone-300)] tabular-nums";

export function Table({
  density = "comfortable",
  stickyHeader = false,
  scroll = true,
  className,
  children,
  ...rest
}: TableProps) {
  const table = (
    <TableDensityContext.Provider value={density}>
      <TableStickyContext.Provider value={stickyHeader}>
        <table className={cn(ROOT_CLASSES, className)} {...rest}>
          {children}
        </table>
      </TableStickyContext.Provider>
    </TableDensityContext.Provider>
  );

  if (!scroll) return table;
  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius)] border border-[var(--sage-soft)] bg-[var(--moss-rise)]">
      {table}
    </div>
  );
}

// ─── THead / TBody / TFoot ────────────────────────────────────────────────────

export function THead({ className, children, ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) {
  const sticky = React.useContext(TableStickyContext);
  return (
    <thead
      className={cn(
        "text-left text-[10px] uppercase tracking-widest text-[var(--stone-500)] bg-[var(--moss)]",
        "border-b border-[var(--sage-soft)]",
        sticky && "sticky top-0 z-10 backdrop-blur",
        className,
      )}
      {...rest}
    >
      {children}
    </thead>
  );
}

export function TBody({ className, children, ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-[var(--sage-soft)]/60", className)}
      {...rest}
    >
      {children}
    </tbody>
  );
}

export function TFoot({ className, children, ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn(
        "border-t border-[var(--sage-soft)] bg-[var(--moss)] text-[var(--stone-400)]",
        className,
      )}
      {...rest}
    >
      {children}
    </tfoot>
  );
}

// ─── TR / TH / TD ─────────────────────────────────────────────────────────────

interface TRProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** When set, the row gets a subtle hover state and pointer cursor. */
  interactive?: boolean;
  /** Highlight as selected (e.g., drawer-detail picker). */
  selected?: boolean;
}

export const TR = React.forwardRef<HTMLTableRowElement, TRProps>(function TR(
  { interactive, selected, className, children, onClick, onKeyDown, ...rest },
  ref,
) {
  const handleKeyDown =
    interactive && onClick
      ? (e: React.KeyboardEvent<HTMLTableRowElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent<HTMLTableRowElement>);
          }
          onKeyDown?.(e);
        }
      : onKeyDown;

  return (
    <tr
      ref={ref}
      data-selected={selected || undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={interactive ? 0 : undefined}
      aria-selected={selected || undefined}
      className={cn(
        "transition-colors",
        interactive &&
          "cursor-pointer hover:bg-[var(--moss-hi)] focus-visible:outline-none focus-visible:bg-[var(--moss-hi)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--matcha-400)]/40",
        selected && "bg-[var(--matcha-600)]/10",
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
});

type CellAlign = "left" | "right" | "center";

interface CellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  align?: CellAlign;
  /** Optional fixed column width via Tailwind class (e.g., "w-32"). */
  width?: string;
  colSpan?: number;
  /** When true on TD, renders text in monospace. Useful for ARNs / IDs. */
  mono?: boolean;
  /** When true on TD, truncates with ellipsis and shows full value in title. */
  truncate?: boolean;
  /**
   * TH only — marks this column as sortable. Renders a sort affordance
   * (▲/▼/—) and wires keyboard activation. Caller owns the sort state.
   */
  sortable?: boolean;
  /** TH only — current sort direction for this column. */
  sortDir?: "asc" | "desc" | null;
  /** TH only — invoked when the header is clicked or activated via keyboard. */
  onSort?: () => void;
}

const SORT_GLYPH: Record<"asc" | "desc" | "none", string> = {
  asc: "▲",
  desc: "▼",
  none: "↕",
};

const ALIGN_CLASSES: Record<CellAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

const DENSITY_PADDING: Record<TableDensity, string> = {
  compact: "px-3 py-2",
  comfortable: "px-4 py-2.5",
  spacious: "px-5 py-3.5",
};

export function TH({
  align = "left",
  width,
  colSpan,
  sortable,
  sortDir,
  onSort,
  className,
  children,
  ...rest
}: CellProps) {
  const density = React.useContext(TableDensityContext);
  const ariaSort: "ascending" | "descending" | "none" | undefined = sortable
    ? sortDir === "asc"
      ? "ascending"
      : sortDir === "desc"
        ? "descending"
        : "none"
    : undefined;

  const handleKeyDown = sortable && onSort
    ? (e: React.KeyboardEvent<HTMLTableCellElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort();
        }
      }
    : undefined;

  const glyph =
    sortable
      ? sortDir === "asc"
        ? SORT_GLYPH.asc
        : sortDir === "desc"
          ? SORT_GLYPH.desc
          : SORT_GLYPH.none
      : null;

  return (
    <th
      scope="col"
      colSpan={colSpan}
      aria-sort={ariaSort}
      tabIndex={sortable ? 0 : undefined}
      onClick={sortable ? onSort : undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        DENSITY_PADDING[density],
        ALIGN_CLASSES[align],
        "font-semibold whitespace-nowrap",
        sortable &&
          "cursor-pointer select-none hover:text-[var(--stone-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--matcha-400)]/40",
        width,
        className,
      )}
      {...rest}
    >
      <span className={cn("inline-flex items-center gap-1.5", align === "right" && "flex-row-reverse")}>
        {children}
        {glyph && (
          <span
            aria-hidden
            className={cn(
              "text-[9px] tabular-nums transition-opacity",
              sortDir ? "text-[var(--matcha-300)] opacity-100" : "text-[var(--stone-600)] opacity-60",
            )}
          >
            {glyph}
          </span>
        )}
      </span>
    </th>
  );
}

export function TD({
  align = "left",
  width,
  colSpan,
  mono,
  truncate,
  className,
  children,
  ...rest
}: CellProps) {
  const density = React.useContext(TableDensityContext);
  const titleAttr =
    truncate && typeof children === "string" ? { title: children } : {};
  return (
    <td
      colSpan={colSpan}
      className={cn(
        DENSITY_PADDING[density],
        ALIGN_CLASSES[align],
        mono && "font-mono text-[11px] text-[var(--stone-400)]",
        truncate && "max-w-0 truncate",
        width,
        className,
      )}
      {...rest}
      {...titleAttr}
    >
      {children}
    </td>
  );
}

// ─── TBodyEmpty — convenience row that fills the whole width ──────────────────

interface TBodyEmptyProps {
  colSpan: number;
  children: React.ReactNode;
  className?: string;
}

export function TBodyEmpty({ colSpan, children, className }: TBodyEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn("p-0", className)}>
        {children}
      </td>
    </tr>
  );
}
