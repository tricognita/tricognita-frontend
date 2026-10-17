"use client";

import { Button, EmptyState, ErrorState, PageHeader, Skeleton, UnavailableState, VStack } from "@/lib/ui";
import { ControlFilters, ControlsTable } from "@/lib/product";
import { filterControls, sortControlsByAttention } from "@/lib/domain";
import { useControls } from "@/lib/data";
import { useControlFilters } from "./useControlFilters";

/**
 * Controls — the catalogue of what Tricognita verifies for this organisation.
 *
 * Ordered by what needs someone first, using the established status ranking:
 * drifted, failing, verifying, not assessed, exception, passing. The list is
 * the spine of the product; everything else about a control lives on its page.
 */
export function ControlsScreen() {
  const controls = useControls();
  const filters = useControlFilters();

  const all = controls.data ?? [];
  const visible = sortControlsByAttention(
    filterControls(all, { status: filters.status, domain: filters.domain, search: filters.search }),
  );

  return (
    <VStack gap="lg">
      <PageHeader
        title="Controls"
        description="The cloud security controls Tricognita verifies for you, and whether each one holds right now."
        meta={
          controls.data ? (
            <span>
              {filters.isFiltered
                ? `${visible.length} of ${all.length} controls`
                : `${all.length} controls in your baseline`}
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

      {controls.unavailable ? (
        <UnavailableState willShow="Your control baseline and the result of the last verification for each control." />
      ) : controls.isLoading ? (
        <VStack gap="md" aria-busy="true" aria-label="Loading controls">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </VStack>
      ) : controls.error ? (
        <ErrorState
          title="We could not load your controls"
          description="The request did not complete. Nothing in your cloud changed."
          detail={controls.error.message}
          action={
            <Button variant="secondary" size="sm" onClick={controls.refresh}>
              Try again
            </Button>
          }
        />
      ) : all.length === 0 ? (
        <EmptyState
          variant="bordered"
          title="No controls yet"
          description="Your baseline is agreed during onboarding, then verified for the first time."
        />
      ) : (
        <VStack gap="md">
          <ControlFilters
            controls={all}
            status={filters.status}
            domain={filters.domain}
            search={filters.search}
            onStatusChange={filters.setStatus}
            onDomainChange={filters.setDomain}
            onSearchChange={filters.setSearch}
          />
          <ControlsTable controls={visible} />
        </VStack>
      )}
    </VStack>
  );
}
