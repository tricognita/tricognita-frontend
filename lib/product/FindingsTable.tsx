import { DataTable, DateTime, EmptyState, type Column } from "@/lib/ui";
import type { Control, Finding, Resource } from "@/lib/domain";
import { FindingStatusBadge, SeverityBadge } from "./StatusBadges";

/**
 * FindingsTable — the queue.
 *
 * A finding is a resource failing a control, so a row names both: what is
 * wrong, on which resource, under which control. Severity and status are facts
 * from the model, shown side by side rather than blended into a priority
 * number the customer could not check.
 */
export function FindingsTable({
  findings,
  controls,
  resources,
}: {
  findings: Finding[];
  controls: Control[];
  resources: Resource[];
}) {
  const controlById = new Map(controls.map((c) => [c.id, c]));
  const resourceById = new Map(resources.map((r) => [r.id, r]));

  const columns: Column<Finding>[] = [
    {
      id: "title",
      header: "Finding",
      mobile: "title",
      cell: (f) => {
        const resource = resourceById.get(f.resourceId);
        return (
          <span className="flex flex-col gap-0.5">
            <span className="text-[var(--fg)]">{f.title}</span>
            <span className="text-[10px] text-[var(--fg-subtle)]">
              {resource ? `${resource.label} · ${resource.service} · ${resource.regionLabel}` : "Resource"}
            </span>
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      mobile: "status",
      width: "w-[190px]",
      cell: (f) => <FindingStatusBadge status={f.status} size="xs" />,
    },
    {
      id: "severity",
      header: "Severity",
      mobile: "supporting",
      width: "w-[120px]",
      cell: (f) => <SeverityBadge severity={f.severity} size="xs" />,
    },
    {
      id: "control",
      header: "Control",
      mobile: "supporting",
      width: "w-[260px]",
      cell: (f) => {
        const control = controlById.get(f.controlId);
        return (
          <span className="flex flex-col gap-0.5">
            <span className="text-[var(--fg-muted)]">{control?.name ?? f.controlId}</span>
            <span className="font-mono text-[10px] text-[var(--fg-subtle)]">{f.controlId}</span>
          </span>
        );
      },
    },
    {
      id: "lastSeen",
      header: "Last seen",
      mobile: "supporting",
      width: "w-[160px]",
      cell: (f) => <DateTime value={f.lastSeenAt} variant="relative" />,
    },
  ];

  return (
    <DataTable
      caption="Findings"
      rows={findings}
      columns={columns}
      getRowKey={(f) => f.id}
      rowHref={(f) => `/dashboard/findings/${f.id}`}
      density="compact"
      stickyHeader
      empty={
        <EmptyState
          variant="compact"
          title="No findings match these filters"
          description="Clear the filters to see everything currently recorded."
        />
      }
    />
  );
}
