"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SWRConfig, useSWRConfig } from "swr";
import { useSession } from "@/lib/use-session";
import { emitAuditEvent } from "@/lib/audit-events";
import { useSessionExpiry } from "@/lib/session-refresh";
import { usePlatformPosture } from "@/lib/posture-state";
import { DegradedBanner } from "@/lib/ui";
import { NotificationCenter } from "./components/NotificationCenter";
import { CommandPalette } from "./components/CommandPalette";
import { TopBarTrust } from "./components/TopBarTrust";
import { FeedbackWidget } from "./components/FeedbackWidget";
import { TelemetryTracker } from "./components/TelemetryTracker";
import { GuidedTour } from "./components/GuidedTour";
import {
  Shield,
  Activity,
  AlertTriangle,
  Lock,
  Cpu,
  PieChart,
  Radio,
  FileCheck,
  Server,
  Network,
  History,
  Settings,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  TriangleAlert,
  Database,
  Code2,
  Box,
  Link2,
  Bell,
  KeyRound,
} from "lucide-react";
import * as motion from "framer-motion/client";

import { Role } from "@/lib/auth";

/**
 * useMultiTabLogout — listens for the trico_logout_at marker that
 * ClientLayout.signOut writes to localStorage. When another tab logs out,
 * the `storage` event fires here and we redirect the current tab to /login.
 *
 * Without this, a second tab keeps showing the (now-invalid) dashboard
 * shell until the next request fails with 401 — a confusing UX gap that
 * also keeps stale cached data visible.
 */
function useMultiTabLogout() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onStorage(e: StorageEvent) {
      if (e.key === "trico_logout_at" && e.newValue) {
        router.push("/login");
        router.refresh();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);
}

/**
 * PlatformPostureBanner — pulls the shared platform posture and renders
 * the DegradedBanner primitive when status !== healthy.
 *
 * Must render inside SWRConfig so the /api/healthz poll uses the same
 * SWR cache as the rest of the dashboard.
 */
function PlatformPostureBanner() {
  const posture = usePlatformPosture();
  if (posture.status === "healthy") return null;
  return <DegradedBanner posture={posture} />;
}

/**
 * TenantBoundary — clears the SWR cache whenever the authenticated
 * tenantId changes. This prevents cross-tenant data leakage in the
 * narrow window between auth-switch and revalidate.
 *
 * Scenario this guards against: user A (tenant T1) logs in, fetches
 * /api/findings → cached under key "/api/findings". User A logs out.
 * User B (tenant T2) logs in on the same browser. SWR briefly serves
 * the stale cache for T1 before revalidation fires. Even if the BFF
 * correctly scopes by tenant on the network call, the UI flickers with
 * T1 data for the moment before B's data arrives.
 *
 * Must be rendered inside SWRConfig so useSWRConfig sees the same cache.
 */
function TenantBoundary({ children }: { children: React.ReactNode }) {
  const { tenantId, isAuthenticated } = useSession();
  const { cache, mutate } = useSWRConfig();
  const lastTenantRef = useRef<string | null>(null);

  // Multi-tab logout sync — when any tab writes the logout marker, all
  // other tabs redirect to /login.
  useMultiTabLogout();

  // Session expiry — if the session goes from authenticated → unauthenticated
  // (token expired without explicit logout), try refresh once; if that fails,
  // route to /login?expired=1 so the user sees a clear re-auth prompt instead
  // of a stale dashboard.
  useSessionExpiry(isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      // Logged out — flush everything except /api/auth/me itself so the
      // next page render can re-check auth without thrashing.
      if (lastTenantRef.current !== null) {
        for (const key of (cache as { keys: () => IterableIterator<string> }).keys()) {
          if (key === "/api/auth/me") continue;
          // eslint-disable-next-line react-hooks/set-state-in-effect
          mutate(key, undefined, { revalidate: false });
        }
        lastTenantRef.current = null;
      }
      return;
    }
    if (!tenantId) return;
    if (lastTenantRef.current === null) {
      lastTenantRef.current = tenantId;
      return;
    }
    if (lastTenantRef.current === tenantId) return;
    // Tenant changed within an authenticated session (rare but possible:
    // impersonation, role switch). Invalidate everything except the
    // session itself so downstream surfaces refetch under the new tenant.
    for (const key of (cache as { keys: () => IterableIterator<string> }).keys()) {
      if (key === "/api/auth/me") continue;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      mutate(key, undefined, { revalidate: false });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    lastTenantRef.current = tenantId;
  }, [tenantId, isAuthenticated, cache, mutate]);

  return <>{children}</>;
}

// Global SWR defaults: prevent request storms, auth loops, and focus/reconnect refetches
const SWR_CONFIG = {
  dedupingInterval: 10_000,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  errorRetryCount: 1,
  errorRetryInterval: 5_000,
  onErrorRetry(
    error: Error,
    _key: string,
    _config: unknown,
    revalidate: (opts: { retryCount: number }) => void,
    { retryCount }: { retryCount: number }
  ) {
    const status = Number(error?.message);
    if ([401, 403, 429].includes(status)) return; // never retry on auth/rate-limit errors
    if (retryCount >= 1) return;
    setTimeout(() => revalidate({ retryCount }), 5_000);
  },
} as const;

// Role lists kept aligned with frontend/lib/auth.ts:ROLE_ROUTES and middleware.ts SECOPS_API.
// Anything missing a `roles` field is visible to every authenticated role.
type SidebarLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent?: boolean;
  roles?: string[];
};
type SidebarGroup = { title: string; links: SidebarLink[] };

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    title: "Posture",
    links: [
      { href: "/dashboard",            label: "Overview",     icon: PieChart },
      { href: "/dashboard/findings",   label: "Findings",     icon: TriangleAlert },
      { href: "/dashboard/compliance", label: "Compliance",   icon: FileCheck },
    ],
  },
  {
    title: "Detection & Response",
    links: [
      { href: "/dashboard/aria",         label: "ARIA Console", icon: Activity,      accent: true, roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
      { href: "/dashboard/guard",        label: "ARIA Guard",   icon: Shield,                       roles: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS"] },
      { href: "/dashboard/incidents",    label: "Incidents",    icon: AlertTriangle },
      { href: "/dashboard/attack-graph", label: "Attack Graph", icon: Network },
      { href: "/dashboard/threat-intel", label: "Threat Intel", icon: Radio },
    ],
  },
  {
    title: "Cloud",
    links: [
      { href: "/dashboard/credentials", label: "Cloud Accounts", icon: Link2,    roles: ["ADMIN", "SECOPS", "CLOUD_ENGINEER", "DEVSECOPS"] },
      { href: "/dashboard/dspm",        label: "DSPM",           icon: Database, roles: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"] },
      { href: "/dashboard/iac",         label: "IaC Scanner",    icon: Code2,    roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
      { href: "/dashboard/k8s",         label: "K8s Audit",      icon: Box,      roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
    ],
  },
  {
    title: "Governance",
    links: [
      { href: "/dashboard/zero-trust",      label: "Zero Trust",  icon: Lock,    roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"] },
      { href: "/dashboard/ai-security",     label: "AI Security", icon: Cpu },
      { href: "/dashboard/finops-security", label: "FinOps",      icon: PieChart },
      { href: "/dashboard/audit-trail",     label: "Audit Trail", icon: History, roles: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS"] },
    ],
  },
  {
    title: "Admin",
    links: [
      { href: "/dashboard/alert-routes", label: "Alert Routes", icon: Bell,     roles: ["ADMIN", "SECOPS"] },
      { href: "/dashboard/services",     label: "Services",     icon: Server },
      { href: "/dashboard/api-keys",     label: "API Keys",     icon: KeyRound, roles: ["ADMIN"] },
      { href: "/dashboard/settings",     label: "Settings",     icon: Settings, roles: ["ADMIN", "SECOPS"] },
      { href: "/dashboard/users",        label: "Users",        icon: Users,    roles: ["ADMIN"] },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, email, modules } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  function isLinkVisible(l: SidebarLink): boolean {
    // 1. Strict Sandboxing: Clients/Viewers can NEVER see these modules, regardless of assigned modules.
    if (role === "CLIENT" || role === "VIEWER") {
      if (["Settings", "Users", "Audit Trail", "Services"].includes(l.label)) return false;
    }

    // 2. Dynamic RBAC: If a user has a defined modules array, it overrides static roles.
    if (modules && modules.length > 0) {
      return modules.includes(l.label);
    }

    // 3. Fallback: If no modules array is defined, fall back to legacy role checks.
    return !l.roles || (role !== undefined && l.roles.includes(role as Role));
  }

  const visibleGroups = SIDEBAR_GROUPS
    .map((g) => ({ ...g, links: g.links.filter(isLinkVisible) }))
    .filter((g) => g.links.length > 0);

  async function signOut() {
    // Emit audit BEFORE the logout fetch — the audit POST needs the session
    // cookie to authenticate. After logout the cookie is gone.
    await emitAuditEvent({ type: "auth.logout" }).catch(() => {});
    await fetch("/api/auth/logout", { method: "POST" });
    // Belt-and-suspenders: TenantBoundary will also clear on isAuthenticated→false,
    // but this happens before the redirect so the next-mounted /login page never
    // sees stale tenant data in any edge case.
    try {
      if (typeof window !== "undefined") {
        for (const k of Object.keys(window.localStorage)) {
          if (k.startsWith("trico_") || k.startsWith("tricognita_")) {
            window.localStorage.removeItem(k);
          }
        }
        // Multi-tab sync: write a logout marker so other tabs listening for
        // the `storage` event (see useMultiTabLogout below) redirect themselves.
        // Using setItem fires the storage event in other tabs (same origin).
        window.localStorage.setItem("trico_logout_at", String(Date.now()));
      }
    } catch {
      /* ignore — localStorage can be unavailable in private-browse mode */
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <SWRConfig value={SWR_CONFIG}>
    <TenantBoundary>
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 260 }}
        className="flex flex-col bg-zinc-950 border-r border-zinc-800 z-20 relative"
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
          {!isCollapsed && (
            <span className="font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              TRICOGNITA
            </span>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <span className="font-black text-violet-500">T</span>
            </div>
          )}
        </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-zinc-800 border border-zinc-700 rounded-full p-1 hover:bg-zinc-700 text-zinc-400 z-30"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 scrollbar-hide">
          {visibleGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              {!isCollapsed && (
                <p className="px-3 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-600">
                  {group.title}
                </p>
              )}
              {group.links.map((link) => {
                const active = pathname === link.href;
                const Icon = link.icon;

                let classes = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ";

                if (link.accent) {
                  classes += active
                    ? "bg-violet-900/40 text-violet-300 border border-violet-800/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    : "text-zinc-400 hover:bg-violet-900/20 hover:text-violet-300 border border-transparent";
                } else {
                  classes += active
                    ? "bg-zinc-800/80 text-zinc-100 border border-zinc-700/50"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent";
                }

                return (
                  <Link key={link.href} href={link.href} className={classes} title={isCollapsed ? link.label : undefined}>
                    <Icon size={18} className={active && link.accent ? "text-violet-400" : ""} />
                    {!isCollapsed && <span className="truncate">{link.label}</span>}
                    {link.accent && !isCollapsed && !active && (
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 ml-auto animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
          <NotificationCenter isCollapsed={isCollapsed} />
        </div>

        <div className="p-4 border-t border-zinc-800 flex flex-col gap-4">
          {!isCollapsed && role && (
            <div className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 rounded-full bg-violet-900 flex items-center justify-center text-violet-200 font-bold text-xs border border-violet-700/50 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                {role[0]}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-zinc-200">{role}</span>
                <span className="text-[10px] text-zinc-500 truncate">{email}</span>
              </div>
            </div>
          )}
          <button 
            onClick={signOut}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            title="Sign out"
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* TOP BAR */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group max-w-md w-full" onClick={() => setCmdOpen(true)}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input 
                readOnly
                type="text" 
                placeholder="Ask ARIA (Command-K)" 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 cursor-pointer hover:border-violet-500/50 transition-all placeholder:text-zinc-600 focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] font-mono text-zinc-500 bg-zinc-800">⌘K</kbd>
              </div>
            </div>
          </div>
          
          <TopBarTrust />
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,theme(colors.violet.900/5),transparent_50%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,theme(colors.cyan.900/5),transparent_50%)] pointer-events-none" />
          <div className="relative z-10 min-h-full">
            <PlatformPostureBanner />
            {children}
          </div>
        </main>
      </div>
      
      <CommandPalette isOpen={cmdOpen} setIsOpen={setCmdOpen} />
      <FeedbackWidget />
      <TelemetryTracker />
      <GuidedTour />
    </div>
    </TenantBoundary>
    </SWRConfig>
  );
}
