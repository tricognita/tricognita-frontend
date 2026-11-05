"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CONTROL_DOMAINS,
  type ControlDomain,
  type FindingStatus,
  type Severity,
} from "@/lib/domain";

/**
 * Findings filter state, kept in the URL for the same reason the controls
 * filters are: a filtered queue is something one engineer sends to another.
 *
 * Mirrors app/dashboard/(product)/controls/useControlFilters.ts. Two callers is
 * the point at which extracting a shared hook becomes worthwhile; that is left
 * as its own change rather than refactoring a committed surface here.
 */

const STATUSES: FindingStatus[] = [
  "OPEN",
  "IN_REMEDIATION",
  "AWAITING_VERIFICATION",
  "RESOLVED",
  "EXCEPTION",
];
const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function parse<T extends string>(raw: string | null, allowed: T[]): T | "ALL" {
  const upper = raw?.toUpperCase();
  return allowed.find((a) => a === upper) ?? "ALL";
}

export interface FindingFilterState {
  status: FindingStatus | "ALL";
  severity: Severity | "ALL";
  domain: ControlDomain | "ALL";
  search: string;
  setStatus: (next: FindingStatus | "ALL") => void;
  setSeverity: (next: Severity | "ALL") => void;
  setDomain: (next: ControlDomain | "ALL") => void;
  setSearch: (next: string) => void;
  clear: () => void;
  isFiltered: boolean;
}

export function useFindingFilters(): FindingFilterState {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const status = parse(params.get("status"), STATUSES);
  const severity = parse(params.get("severity"), SEVERITIES);
  const domain = parse(params.get("domain"), [...CONTROL_DOMAINS]);
  const search = params.get("q") ?? "";

  const write = React.useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "ALL") next.delete(key);
      else next.set(key, value.toLowerCase());
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return {
    status,
    severity,
    domain,
    search,
    setStatus: (next) => write("status", next),
    setSeverity: (next) => write("severity", next),
    setDomain: (next) => write("domain", next),
    setSearch: (next) => write("q", next || null),
    clear: () => router.replace(pathname, { scroll: false }),
    isFiltered:
      status !== "ALL" || severity !== "ALL" || domain !== "ALL" || search.length > 0,
  };
}
