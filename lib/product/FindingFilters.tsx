"use client";

import { FilterBar, FilterChip, HStack } from "@/lib/ui";
import {
  CONTROL_DOMAINS,
  CONTROL_DOMAIN_LABEL,
  FINDING_STATUS,
  SEVERITY,
  type Control,
  type ControlDomain,
  type Finding,
  type FindingStatus,
  type Severity,
} from "@/lib/domain";

/**
 * FindingFilters — status, severity, control category and search.
 *
 * Stateless, like the controls filters: the caller keeps the values in the URL
 * so a filtered queue can be handed to someone else. Counts are taken from the
 * unfiltered set, so a zero means the estate has none — not that another filter
 * hid them.
 */

const STATUSES: FindingStatus[] = [
  "OPEN",
  "IN_REMEDIATION",
  "AWAITING_VERIFICATION",
  "EXCEPTION",
  "RESOLVED",
];
const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export function FindingFilters({
  findings,
  controls,
  status,
  severity,
  domain,
  search,
  onStatusChange,
  onSeverityChange,
  onDomainChange,
  onSearchChange,
}: {
  findings: Finding[];
  controls: Control[];
  status: FindingStatus | "ALL";
  severity: Severity | "ALL";
  domain: ControlDomain | "ALL";
  search: string;
  onStatusChange: (next: FindingStatus | "ALL") => void;
  onSeverityChange: (next: Severity | "ALL") => void;
  onDomainChange: (next: ControlDomain | "ALL") => void;
  onSearchChange: (next: string) => void;
}) {
  const countBy = <T extends string>(pick: (f: Finding) => T | undefined) =>
    findings.reduce<Record<string, number>>((acc, f) => {
      const key = pick(f);
      if (key) acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  const byStatus = countBy((f) => f.status);
  const bySeverity = countBy((f) => f.severity);
  const domainOf = (f: Finding) => controls.find((c) => c.id === f.controlId)?.domain;
  const byDomain = countBy(domainOf);
  const domainsPresent = CONTROL_DOMAINS.filter((d) => (byDomain[d] ?? 0) > 0);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar label="Filter by status">
        <FilterChip active={status === "ALL"} count={findings.length} onClick={() => onStatusChange("ALL")}>
          All
        </FilterChip>
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            active={status === s}
            intent={FINDING_STATUS[s].intent === "violet" ? "neutral" : FINDING_STATUS[s].intent}
            count={byStatus[s] ?? 0}
            onClick={() => onStatusChange(s)}
          >
            {FINDING_STATUS[s].label}
          </FilterChip>
        ))}
      </FilterBar>

      <FilterBar label="Filter by severity">
        <FilterChip active={severity === "ALL"} onClick={() => onSeverityChange("ALL")}>
          Any severity
        </FilterChip>
        {SEVERITIES.map((s) => (
          <FilterChip
            key={s}
            active={severity === s}
            intent={SEVERITY[s].intent === "violet" ? "neutral" : SEVERITY[s].intent}
            count={bySeverity[s] ?? 0}
            onClick={() => onSeverityChange(s)}
          >
            {SEVERITY[s].label}
          </FilterChip>
        ))}
      </FilterBar>

      {domainsPresent.length > 1 && (
        <FilterBar label="Filter by control category">
          <FilterChip active={domain === "ALL"} onClick={() => onDomainChange("ALL")}>
            All categories
          </FilterChip>
          {domainsPresent.map((d) => (
            <FilterChip
              key={d}
              active={domain === d}
              count={byDomain[d] ?? 0}
              onClick={() => onDomainChange(d)}
            >
              {CONTROL_DOMAIN_LABEL[d]}
            </FilterChip>
          ))}
        </FilterBar>
      )}

      <HStack gap="sm" align="center">
        <label htmlFor="finding-search" className="sr-only">
          Search findings
        </label>
        <input
          id="finding-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search findings, controls or resources"
          className="w-full max-w-md rounded-[var(--radius-tight)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2 text-[var(--text-sm)] text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
        />
      </HStack>
    </div>
  );
}
