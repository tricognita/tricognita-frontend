'use client'

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/use-session";
import type { Role } from "@/lib/auth";
import { canUseModule } from "@/lib/rbac";

// Role lists kept aligned with frontend/lib/auth.ts:ROLE_ROUTES.
// `module` is the key checked against user.modules for per-employee visibility.
const NAV: Array<{ href: string; label: string; roles?: Role[]; module?: string }> = [
  { href: "/dashboard",               label: "Command",       module: "Overview"    },
  { href: "/dashboard/executive",     label: "Executive",     module: "Overview"    },
  { href: "/dashboard/aria",          label: "ARIA",          module: "ARIA Console", roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  { href: "/dashboard/attack-graph",  label: "Attack Graph",  module: "Attack Graph" },
  { href: "/dashboard/compliance",    label: "Compliance",    module: "Compliance" },
  { href: "/dashboard/findings",      label: "Findings",      module: "Findings"   },
  { href: "/dashboard/audit-trail",   label: "Audit Trail",   module: "Findings",     roles: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD"] },
  { href: "/dashboard/credentials",   label: "Accounts",      module: "Settings",     roles: ["ADMIN", "SECOPS", "CLOUD_ENGINEER", "DEVSECOPS"] },
  { href: "/dashboard/plan",             label: "Plan",       module: "Overview" },
  { href: "/dashboard/exports",          label: "Exports",    module: "Overview" },
  { href: "/dashboard/admin/operations", label: "Ops",        module: "Settings",     roles: ["ADMIN"] },
  { href: "/dashboard/admin/platform",   label: "Platform",   module: "Settings",     roles: ["ADMIN"] },
  { href: "/dashboard/admin/trace",      label: "Trace",      module: "Settings",     roles: ["ADMIN"] },
  { href: "/dashboard/admin/feedback",   label: "Feedback",   module: "Settings",     roles: ["ADMIN"] },
  { href: "/dashboard/admin/insights",   label: "Insights",   module: "Settings",     roles: ["ADMIN"] },
  { href: "/dashboard/admin/commercial", label: "Commercial", module: "Settings",     roles: ["ADMIN"] },
  { href: "/dashboard/admin/leads",      label: "Leads",      module: "Settings",     roles: ["ADMIN"] },
  { href: "/dashboard/admin/pilot-health", label: "Pilot Health", module: "Settings", roles: ["ADMIN"] },
  // Not demo-validated — suppressed until end-to-end production verification.
  // Routes themselves remain in the codebase (deep links work, RBAC unchanged)
  // — only the sidebar entries are hidden. Re-enable by uncommenting once
  // each module has been validated against a real data backend.
  // { href: "/dashboard/dspm",            label: "DSPM",          module: "DSPM",         roles: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"] },
  // { href: "/dashboard/iac",             label: "IaC",           module: "Services",     roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  { href: "/dashboard/soc",             label: "SOC",           module: "Findings",     roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "AUDITOR"] },
  { href: "/dashboard/queue",           label: "Queue",         module: "Findings",     roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "AUDITOR"] },
  { href: "/dashboard/incidents",       label: "Incidents",     module: "Incidents",    roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  // { href: "/dashboard/guard",           label: "LLM Guard",     module: "AI Security",  roles: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS"] },
  // { href: "/dashboard/finops-security", label: "FinOps",        module: "FinOps"   },
  // { href: "/dashboard/k8s",             label: "K8s Audit",     module: "Services",     roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  // { href: "/dashboard/datasets",        label: "Datasets",      module: "Services"   },
];

export function DashboardNav() {
  const path = usePathname();
  const router = useRouter();
  const { role, modules } = useSession();
  // ADMIN sees everything regardless of modules; everyone else is filtered by
  // both role (capability) and module assignment (per-employee feature gate).
  const userModules: string[] | undefined =
    role === "ADMIN" ? undefined : modules ?? undefined;
  const visibleNav = NAV.filter((n) => {
    if (n.roles && (!role || !n.roles.includes(role))) return false;
    if (!n.module) return true;
    return canUseModule(userModules, n.module);
  });

  async function signOut(e: React.MouseEvent) {
    e.preventDefault();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
      style={{
        background: "rgba(11,9,20,0.85)",
        backdropFilter: "blur(18px) saturate(1.2)",
        borderColor: "var(--sage-soft)",
      }}
    >
      {/* Brand mark */}
      <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 cursor-dot">
        <div className="flex items-center justify-center bg-matcha-600 text-white font-bold rounded" style={{ width: 22, height: 22, fontSize: 12 }}>
          T
        </div>
        <span className="font-semibold text-sm text-stone-50 tracking-tight font-mono">Tricognita</span>
        <span className="text-[9px] font-mono text-matcha-400 border border-matcha-400/30 px-1.5 py-0.5 rounded-full">ARIA</span>
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-1">
        {visibleNav.map(({ href, label }) => {
          const active = href === "/dashboard" ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-dot ${
                active
                  ? "bg-matcha-300/15 text-matcha-200 border border-matcha-300/25"
                  : "text-stone-400 hover:text-stone-200 hover:bg-moss-rise"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* User pill */}
      <div className="flex items-center gap-3 shrink-0">
        {role && (
          <span className="hidden sm:block text-[9px] font-bold px-2 py-1 rounded-full bg-moss-hi text-matcha-300 border border-sage-soft font-mono uppercase tracking-widest">
            {role}
          </span>
        )}
        <Link
          href="/dashboard/settings"
          className="text-[10px] text-stone-400 hover:text-stone-200 font-mono border border-sage-soft px-2 py-1 rounded cursor-dot hover:border-matcha-300/30 transition-colors"
        >
          Settings
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="text-[10px] text-stone-500 hover:text-stone-300 font-mono cursor-dot transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
