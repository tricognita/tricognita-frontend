"use client";

import * as React from "react";
import { FilterBar, FilterChip, HStack } from "@/lib/ui";
import {
  CONTROL_DOMAINS,
  CONTROL_DOMAIN_LABEL,
  CONTROL_STATUS,
  countControls,
  type Control,
  type ControlDomain,
  type ControlStatus,
} from "@/lib/domain";

/**
 * ControlFilters — status, category and search.
 *
 * Stateless: the caller owns the values and keeps them in the URL, so a
 * filtered view can be shared, bookmarked and returned to. Counts come from the
 * unfiltered set, so a chip showing 0 tells you the estate has none of those —
 * not that your other filters hid them.
 */

const STATUS_CHIPS: { value: ControlStatus; key: keyof ReturnType<typeof countControls> }[] = [
  { value: "FAIL", key: "failing" },
  { value: "DRIFTED", key: "drifted" },
  { value: "NOT_ASSESSED", key: "notAssessed" },
  { value: "EXCEPTION", key: "exception" },
  { value: "PASS", key: "passing" },
];

const INTENT: Record<ControlStatus, "success" | "danger" | "warning" | "neutral" | "info"> = {
  PASS: "success",
  FAIL: "danger",
  DRIFTED: "warning",
  VERIFYING: "info",
  EXCEPTION: "neutral",
  NOT_ASSESSED: "neutral",
};

export function ControlFilters({
  controls,
  status,
  domain,
  search,
  onStatusChange,
  onDomainChange,
  onSearchChange,
}: {
  controls: Control[];
  status: ControlStatus | "ALL";
  domain: ControlDomain | "ALL";
  search: string;
  onStatusChange: (next: ControlStatus | "ALL") => void;
  onDomainChange: (next: ControlDomain | "ALL") => void;
  onSearchChange: (next: string) => void;
}) {
  const counts = countControls(controls);
  const perDomain = controls.reduce<Record<string, number>>((acc, c) => {
    acc[c.domain] = (acc[c.domain] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3">
      <FilterBar label="Filter by status">
        <FilterChip active={status === "ALL"} count={counts.total} onClick={() => onStatusChange("ALL")}>
          All
        </FilterChip>
        {STATUS_CHIPS.map(({ value, key }) => (
          <FilterChip
            key={value}
            active={status === value}
            intent={INTENT[value]}
            count={counts[key]}
            onClick={() => onStatusChange(value)}
          >
            {CONTROL_STATUS[value].label}
          </FilterChip>
        ))}
      </FilterBar>

      <FilterBar label="Filter by category">
        <FilterChip active={domain === "ALL"} onClick={() => onDomainChange("ALL")}>
          All categories
        </FilterChip>
        {CONTROL_DOMAINS.map((d) => (
          <FilterChip
            key={d}
            active={domain === d}
            count={perDomain[d] ?? 0}
            onClick={() => onDomainChange(d)}
          >
            {CONTROL_DOMAIN_LABEL[d]}
          </FilterChip>
        ))}
      </FilterBar>

      <HStack gap="sm" align="center">
        <label htmlFor="control-search" className="sr-only">
          Search controls
        </label>
        <input
          id="control-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search controls, requirements or framework references"
          className="w-full max-w-md rounded-[var(--radius-tight)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2 text-[var(--text-sm)] text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
        />
      </HStack>
    </div>
  );
}
