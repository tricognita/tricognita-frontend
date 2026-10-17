"use client";

import { usePathname } from "next/navigation";
import { Tabs, type TabItem } from "@/lib/ui";

/**
 * AssuranceNav — the four views of one record, as link tabs.
 *
 * Tab state lives in the URL so a colleague can be sent straight to the drift
 * they are being asked about.
 */

const BASE = "/dashboard/assurance";

const TABS: TabItem[] = [
  { id: BASE, label: "Summary", href: BASE },
  { id: `${BASE}/verification`, label: "Verification", href: `${BASE}/verification` },
  { id: `${BASE}/history`, label: "History", href: `${BASE}/history` },
  { id: `${BASE}/drift`, label: "Drift", href: `${BASE}/drift` },
  { id: `${BASE}/exceptions`, label: "Exceptions", href: `${BASE}/exceptions` },
];

export function AssuranceNav() {
  const pathname = usePathname() ?? BASE;
  // Longest matching prefix wins, so /assurance/drift does not light up Summary.
  const active =
    TABS.map((t) => t.id)
      .filter((id) => pathname === id || pathname.startsWith(`${id}/`))
      .sort((a, b) => b.length - a.length)[0] ?? BASE;

  return <Tabs items={TABS} activeId={active} ariaLabel="Assurance views" />;
}
