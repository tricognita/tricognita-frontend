"use client";

import { usePathname } from "next/navigation";
import { Tabs, type TabItem } from "@/lib/ui";

const BASE = "/dashboard/reports";

const TABS: TabItem[] = [
  { id: BASE, label: "All reports", href: BASE },
  { id: `${BASE}/monthly`, label: "Monthly assurance", href: `${BASE}/monthly` },
  { id: `${BASE}/customer-review`, label: "Customer review", href: `${BASE}/customer-review` },
  { id: `${BASE}/evidence`, label: "Evidence", href: `${BASE}/evidence` },
  { id: `${BASE}/assurance-record`, label: "Assurance record", href: `${BASE}/assurance-record` },
];

export function ReportsNav() {
  const pathname = usePathname() ?? BASE;
  const active =
    TABS.map((t) => t.id)
      .filter((id) => pathname === id || pathname.startsWith(`${id}/`))
      .sort((a, b) => b.length - a.length)[0] ?? BASE;

  return <Tabs items={TABS} activeId={active} ariaLabel="Report views" />;
}
