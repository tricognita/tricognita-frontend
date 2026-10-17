import { DataTable, DateTime, EmptyState, type Column } from "@/lib/ui";
import { CONTROL_DOMAIN_LABEL, type Control } from "@/lib/domain";
import { ControlStatusBadge } from "./StatusBadges";

/**
 * ControlsTable — the catalogue.
 *
 * A row answers: what is this control, where does it belong, does it hold right
 * now, how much of the estate it covers, and when that was last true. Anything
 * beyond those five belongs on the control's own page.
 *
 * Below md the DataTable becomes a card list, so the control name and its
 * status stay readable instead of scrolling sideways.
 */
export function ControlsTable({ controls }: { controls: Control[] }) {
  const columns: Column<Control>[] = [
    {
      id: "name",
      header: "Control",
      mobile: "title",
      cell: (c) => (
        <span className="flex flex-col gap-0.5">
          <span className="text-[var(--fg)]">{c.name}</span>
          <span className="font-mono text-[10px] text-[var(--fg-subtle)]">{c.id}</span>
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      mobile: "status",
      width: "w-[150px]",
      cell: (c) => <ControlStatusBadge status={c.status} reason={c.notAssessedReason} size="xs" />,
    },
    {
      id: "domain",
      header: "Category",
      mobile: "supporting",
      width: "w-[130px]",
      cell: (c) => CONTROL_DOMAIN_LABEL[c.domain],
    },
    {
      id: "resources",
      header: "Resources",
      mobile: "supporting",
      align: "right",
      width: "w-[140px]",
      cell: (c) => (
        <span className="tabular-nums">
          {c.resourcesFailing > 0 ? (
            <>
              <span className="text-[var(--status-danger)]">{c.resourcesFailing}</span>
              <span className="text-[var(--fg-subtle)]"> of {c.resourcesInScope} failing</span>
            </>
          ) : (
            <span className="text-[var(--fg-muted)]">{c.resourcesInScope} in scope</span>
          )}
        </span>
      ),
    },
    {
      id: "lastVerified",
      header: "Last verified",
      mobile: "supporting",
      width: "w-[170px]",
      cell: (c) => <DateTime value={c.lastVerifiedAt} variant="relative" />,
    },
  ];

  return (
    <DataTable
      caption="Controls in your baseline"
      rows={controls}
      columns={columns}
      getRowKey={(c) => c.id}
      rowHref={(c) => `/dashboard/controls/${c.id}`}
      density="compact"
      stickyHeader
      empty={
        <EmptyState
          variant="compact"
          title="No controls match these filters"
          description="Clear the filters to see the whole baseline."
        />
      }
    />
  );
}
