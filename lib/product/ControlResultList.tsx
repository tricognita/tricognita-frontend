import * as React from "react";
import { DataTable, DateTime, EmptyState, type Column } from "@/lib/ui";
import {
  NOT_ASSESSED_REASON,
  type CloudAccount,
  type ControlResult,
  type Resource,
} from "@/lib/domain";
import { ControlStatusBadge } from "./StatusBadges";

/**
 * ControlResultList — what the control found, resource by resource.
 *
 * Resources are named the way the customer names them, with the service and
 * region for context. Full cloud identifiers stay out of this view; an engineer
 * who needs one reveals it deliberately.
 */
export function ControlResultList({
  results,
  resources,
  accounts,
  renderActions,
}: {
  results: ControlResult[];
  resources: Resource[];
  accounts: CloudAccount[];
  /** Per-resource row actions, e.g. "Verify now". Omit for a read-only list. */
  renderActions?: (result: ControlResult) => React.ReactNode;
}) {
  const resourceById = new Map(resources.map((r) => [r.id, r]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const columns: Column<ControlResult>[] = [
    {
      id: "resource",
      header: "Resource",
      mobile: "title",
      cell: (r) => {
        const resource = resourceById.get(r.resourceId);
        return (
          <span className="flex flex-col gap-0.5">
            <span className="text-[var(--fg)]">{resource?.label ?? r.resourceId}</span>
            <span className="text-[10px] text-[var(--fg-subtle)]">
              {resource ? `${resource.service} · ${resource.regionLabel}` : "Resource"}
            </span>
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Result",
      mobile: "status",
      width: "w-[150px]",
      cell: (r) => (
        <ControlStatusBadge status={r.status} reason={r.notAssessedReason} size="xs" />
      ),
    },
    {
      id: "account",
      header: "Cloud account",
      mobile: "supporting",
      width: "w-[180px]",
      cell: (r) => {
        const account = accountById.get(resourceById.get(r.resourceId)?.accountId ?? "");
        return account ? `${account.alias} · ${account.accountIdMasked}` : "—";
      },
    },
    {
      id: "checked",
      header: "Checked",
      mobile: "supporting",
      width: "w-[170px]",
      cell: (r) => <DateTime value={r.checkedAt} variant="relative" />,
    },
    {
      id: "why",
      header: "Note",
      mobile: "hidden",
      cell: (r) =>
        r.notAssessedReason ? (
          <span className="text-[var(--fg-muted)]">{NOT_ASSESSED_REASON[r.notAssessedReason]}</span>
        ) : (
          <span className="text-[var(--fg-subtle)]">—</span>
        ),
    },
  ];

  if (renderActions) {
    columns.push({
      id: "actions",
      header: "",
      mobile: "hidden",
      width: "w-[140px]",
      cell: (r) => renderActions(r),
    });
  }

  return (
    <DataTable
      caption="Resources checked by this control"
      rows={results}
      columns={columns}
      getRowKey={(r) => r.id}
      density="compact"
      empty={
        <EmptyState
          variant="compact"
          title="No resources in scope"
          description="This control has no matching resources in the connected accounts."
        />
      }
    />
  );
}
