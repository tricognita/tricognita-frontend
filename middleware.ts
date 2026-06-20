/**
 * middleware.ts — Tricognita CSPM Edge Auth Guard (Next.js 16)
 *
 * Next.js requires this file to be named middleware.ts and export
 * a function named 'middleware' (or default) to be picked up.
 *
 * Covers ALL protected routes:
 *   - /dashboard/* pages (auth + RBAC page guard)
 *   - /api/* routes except public ones (auth + RBAC API guard → 401/403 JSON)
 *
 * Role hierarchy: ADMIN > SECOPS > AUDITOR > VIEWER
 *
 * Public (no auth):
 *   /login, /register, /api/auth/login, /api/auth/register,
 *   /api/auth/logout, /api/healthz
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession, isRoleAllowed, sessionCookieName } from "@/lib/auth";
import type { Role } from "@/lib/auth";

// ── Security headers added to every response ─────────────────────────────────

function sec(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

// ── Route classification ──────────────────────────────────────────────────────

// Public API paths — no auth required
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/bootstrap-reset",
  "/api/marketing/contact",
  "/api/contact",
  "/api/healthz",
  "/api/leads",                 // marketing-site lead capture (rate-limited)
];

// API paths requiring ADMIN
const ADMIN_API = [
  "/api/auth/users",
  "/api/aria/config/settings",
  "/api/aria/config/healing-mode",
  "/api/guard/policies",  // policy write operations
  "/api/admin/feedback",  // cross-tenant feedback inbox (per-handler also checks)
  "/api/admin/insights",  // product telemetry rollup (per-handler also checks)
  "/api/admin/commercial",  // cross-tenant commercial view (per-handler also checks)
  "/api/admin/demo-reset",  // demo-mode only; per-handler returns 404 outside demo
  "/api/admin/leads",       // founder leads inbox (per-handler also checks)
  "/api/admin/pilot-health",// per-tenant pilot health rollup (per-handler also checks)
];

// API paths requiring ADMIN or SECOPS
const SECOPS_API = [
  "/api/scan",
  "/api/remediate",
  "/api/aria/actions",
  "/api/aria/stream",
  "/api/aria/predictions",
  "/api/aria/rca",
  "/api/aria/zero-trust",
  "/api/approvals",
  "/api/aria/finops",
  "/api/aria/ai-security",
  "/api/guard/proxy",    // AI proxy forwarding
  "/api/cloud/scan",
  "/api/dspm/assets",
  "/api/iac/scan",
  "/api/threatintel/lookup",
  "/api/k8s/audit",
  "/api/credentials",
];

// API paths requiring ADMIN, SECOPS, or AUDITOR (read-only compliance)
const AUDITOR_API = [
  "/api/guard/stats",
  "/api/guard/interactions",
  "/api/guard/report",
  "/api/audit-trail",
  "/api/findings",
  "/api/cloud/resources",
  "/api/compliance/score",
  "/api/compliance/controls",
];

function apiRequiredRoles(path: string): Role[] | "any" | "public" {
  if (PUBLIC_API.some(p => path.startsWith(p)))   return "public";
  if (ADMIN_API.some(p => path.startsWith(p)))    return ["ADMIN"];
  // SECOPS_API contains state-changing and SECOPS-tier read paths. CLIENT
  // and AUDITOR were previously in this list — they shouldn't be, because
  // lib/rbac.ts triggerScan / triggerRemediate / viewCredentials / viewAria
  // explicitly exclude both roles. Read-only access for CLIENT and
  // AUDITOR is covered by AUDITOR_API (findings, compliance, etc.).
  // This tightening closes the BFF↔rbac drift documented in lib/rbac.ts.
  if (SECOPS_API.some(p => path.startsWith(p)))   return ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "RED_TEAMER", "FINOPS_ANALYST", "CLOUD_ENGINEER"];
  if (AUDITOR_API.some(p => path.startsWith(p)))  return ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST", "CLIENT", "VIEWER"];
  return "any"; // authenticated, any role
}

// ── CSRF defense — same-origin guard for state-changing API requests ─────────
const ALLOWED_ORIGINS = new Set<string>([
  "https://tricognita.com",
  "https://www.tricognita.com",
]);
function originAllowed(req: NextRequest): boolean {
  const m = req.method;
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
}

// ── Main proxy handler ────────────────────────────────────────────────────────

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");

  // ── API routes ──────────────────────────────────────────────────────────────
  if (isApi) {
    if (!originAllowed(req)) {
      return sec(NextResponse.json({ error: "bad_origin" }, { status: 403 }));
    }
    const required = apiRequiredRoles(pathname);

    // Public API — pass through
    if (required === "public") return sec(NextResponse.next());

    // Require valid session
    const token = req.cookies.get(sessionCookieName())?.value;
    const session = await verifySession(token);

    if (!session) {
      return sec(NextResponse.json(
        { error: "unauthenticated", message: "Valid session required. Please log in." },
        { status: 401 }
      ));
    }

    // Block API access for bootstrap sessions until rotation completes
    if (session.mustReset) {
      const allow =
        pathname === "/api/auth/reset-password" ||
        pathname === "/api/auth/me" ||
        pathname === "/api/auth/logout";
      if (!allow) {
        return sec(NextResponse.json(
          { error: "password_reset_required", message: "Rotate your bootstrap password before using the API." },
          { status: 403 }
        ));
      }
    }

    // Check role
    if (required !== "any" && !required.includes(session.role)) {
      return sec(NextResponse.json(
        {
          error: "forbidden",
          message: `Your role '${session.role}' cannot access this resource. Required: ${(required as string[]).join(" or ")}.`,
        },
        { status: 403 }
      ));
    }

    // Pass through — inject user context headers for route handlers
    const res = NextResponse.next();
    res.headers.set("x-user-email", session.email);
    res.headers.set("x-user-role",  session.role);
    return sec(res);
  }

  // ── Dashboard pages ─────────────────────────────────────────────────────────
  if (isDashboard) {
    const token = req.cookies.get(sessionCookieName())?.value;
    const session = await verifySession(token);

    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (!isRoleAllowed(pathname, session.role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("denied", pathname);
      return NextResponse.redirect(url);
    }

    // ── Password Reset Force ────────────────────────────────────────────────
    if (session.mustReset && pathname !== "/reset-password") {
      const url = req.nextUrl.clone();
      url.pathname = "/reset-password";
      return NextResponse.redirect(url);
    }

    const res = NextResponse.next();
    res.headers.set("x-user-email", session.email);
    res.headers.set("x-user-role",  session.role);
    return sec(res);
  }

  // ── Login/register — redirect to dashboard if already logged in ─────────────
  if (pathname === "/login" || pathname === "/register") {
    const token = req.cookies.get(sessionCookieName())?.value;
    if (token) {
      const session = await verifySession(token);
      if (session) return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return sec(NextResponse.next());
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/onboarding",
    "/api/:path*",
    "/login",
    "/register",
  ],
};
