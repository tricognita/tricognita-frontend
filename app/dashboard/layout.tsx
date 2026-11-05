/**
 * /dashboard pass-through.
 *
 * Each route group under /dashboard owns its own shell:
 *   (legacy)/layout.tsx  — the pre-Phase-1 dashboard
 *   (product)/layout.tsx — Managed Cloud Control Assurance
 *
 * Auth and RBAC are unchanged: middleware.ts still guards /dashboard/* and
 * lib/auth.ts ROLE_ROUTES still keys off the same URL prefixes.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
