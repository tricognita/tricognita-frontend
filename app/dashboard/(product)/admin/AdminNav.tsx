"use client";

import { usePathname } from "next/navigation";
import { Tabs, type TabItem } from "@/lib/ui";

const BASE = "/dashboard/admin";

const TABS: TabItem[] = [
  { id: `${BASE}/users`, label: "Users", href: `${BASE}/users` },
  { id: `${BASE}/alert-routes`, label: "Alert routes", href: `${BASE}/alert-routes` },
  { id: `${BASE}/api-keys`, label: "API keys", href: `${BASE}/api-keys` },
  { id: `${BASE}/settings`, label: "Settings", href: `${BASE}/settings` },
];

export function AdminNav() {
  const pathname = usePathname() ?? `${BASE}/users`;
  const active =
    TABS.map((t) => t.id)
      .filter((id) => pathname === id || pathname.startsWith(`${id}/`))
      .sort((a, b) => b.length - a.length)[0] ?? `${BASE}/users`;

  return <Tabs items={TABS} activeId={active} ariaLabel="Administration" />;
}
