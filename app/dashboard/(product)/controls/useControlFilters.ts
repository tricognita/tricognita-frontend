"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CONTROL_DOMAINS, type ControlDomain, type ControlStatus } from "@/lib/domain";

/**
 * Filter state lives in the URL.
 *
 * A filtered control list is something people send to each other — "these three
 * are failing" — so it must survive a copied link and a browser back button.
 * The sidebar's category links and the Overview's status tiles already point
 * here with ?domain= and ?status=, and this hook is what reads them.
 */

const STATUSES: ControlStatus[] = ["PASS", "FAIL", "DRIFTED", "VERIFYING", "EXCEPTION", "NOT_ASSESSED"];

function parseStatus(raw: string | null): ControlStatus | "ALL" {
  const upper = raw?.toUpperCase();
  return STATUSES.find((s) => s === upper) ?? "ALL";
}

function parseDomain(raw: string | null): ControlDomain | "ALL" {
  const upper = raw?.toUpperCase();
  return CONTROL_DOMAINS.find((d) => d === upper) ?? "ALL";
}

export interface ControlFilterState {
  status: ControlStatus | "ALL";
  domain: ControlDomain | "ALL";
  search: string;
  setStatus: (next: ControlStatus | "ALL") => void;
  setDomain: (next: ControlDomain | "ALL") => void;
  setSearch: (next: string) => void;
  clear: () => void;
  isFiltered: boolean;
}

export function useControlFilters(): ControlFilterState {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const status = parseStatus(params.get("status"));
  const domain = parseDomain(params.get("domain"));
  const search = params.get("q") ?? "";

  const write = React.useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "ALL") next.delete(key);
      else next.set(key, value.toLowerCase());
      const query = next.toString();
      // replace, not push: filtering is refinement, not navigation
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return {
    status,
    domain,
    search,
    setStatus: (next) => write("status", next),
    setDomain: (next) => write("domain", next),
    setSearch: (next) => write("q", next || null),
    clear: () => router.replace(pathname, { scroll: false }),
    isFiltered: status !== "ALL" || domain !== "ALL" || search.length > 0,
  };
}
