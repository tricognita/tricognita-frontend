"use client";

import { Button, EmptyState, ErrorState, PageHeader, Skeleton, UnavailableState, VStack } from "@/lib/ui";
import { FindingFilters, FindingsTable } from "@/lib/product";
import { filterFindings, isFindingOpen, sortFindingsByAttention } from "@/lib/domain";
import { useControls, useFindings, useResources } from "@/lib/data";
import { useFindingFilters } from "./useFindingFilters";

/**
 * Findings — every resource currently failing a control, and what to do about it.
 *
 * Ordered the way the work is actually done: open items first, worst severity
 * first within them. Resolved findings stay reachable through the filters,
 * because "this was fixed on the 4th and verified the same day" is the answer
 * to most questions a customer gets asked.
 */
export function FindingsScreen() {
  const findings = useFindings();
  const controls = useControls();
  const resources = useResources();
  const filters = useFindingFilters();

  const all = findings.data ?? [];
  const ctx = { controls: controls.data ?? [], resources: resources.data ?? [] };
  const visible = sortFindingsByAttention(
    filterFindings(
      all,
      {
        status: filters.status,
        severity: filters.severity,
        domain: filters.domain,
        search: filters.search,
      },
      ctx,
    ),
  );
  const openCount = all.filter(isFindingOpen).length;

  return (
    <VStack gap="lg">
      <PageHeader
        title="Findings"
        description="Each finding is one resource failing one control, with the steps that resolve it."
        meta={
          findings.data ? (
            <span>
              {filters.isFiltered
                ? `${visible.length} of ${all.length} findings`
                : `${openCount} open of ${all.length} recorded`}
            </span>
          ) : null
        }
        actions={
          filters.isFiltered ? (
            <Button variant="ghost" size="sm" onClick={filters.clear}>
              Clear filters
            </Button>
          ) : null
        }
      />

      {findings.unavailable ? (
        <UnavailableState willShow="Every resource currently failing a control, with its severity and the steps to fix it." />
      ) : findings.isLoading ? (
        <VStack gap="md" aria-busy="true" aria-label="Loading findings">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </VStack>
      ) : findings.error ? (
        <ErrorState
          title="We could not load your findings"
          description="The request did not complete. Nothing in your cloud changed."
          detail={findings.error.message}
          action={
            <Button variant="secondary" size="sm" onClick={findings.refresh}>
              Try again
            </Button>
          }
        />
      ) : all.length === 0 ? (
        <EmptyState
          variant="bordered"
          title="No findings"
          description="Every control in your baseline is passing or covered by an exception."
        />
      ) : (
        <VStack gap="md">
          <FindingFilters
            findings={all}
            controls={ctx.controls}
            status={filters.status}
            severity={filters.severity}
            domain={filters.domain}
            search={filters.search}
            onStatusChange={filters.setStatus}
            onSeverityChange={filters.setSeverity}
            onDomainChange={filters.setDomain}
            onSearchChange={filters.setSearch}
          />
          <FindingsTable findings={visible} controls={ctx.controls} resources={ctx.resources} />
        </VStack>
      )}
    </VStack>
  );
}
