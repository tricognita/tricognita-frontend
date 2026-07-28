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
import { apiRequiredRoles } from "@/lib/api-authz";

// ── Security headers added to every response ─────────────────────────────────
//
// NOTE: the primary security headers — including an enforcing
// Content-Security-Policy, COOP, CORP, HSTS and Permissions-Policy — are set
// site-wide in next.config.ts:headers(), which (unlike this middleware) applies
// to ALL routes including the marketing pages. The duplicate subset below is a
// defence-in-depth belt-and-braces for the middleware-matched routes.

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

  // Internal design-validation pages (/dev/*) render component/mock scenarios,
  // never customer data. They must not be reachable in production (QA F-WEB4).
  if (pathname.startsWith("/dev")) {
    if (process.env.NODE_ENV === "production") {
      return sec(new NextResponse(null, { status: 404 }));
    }
    return sec(NextResponse.next());
  }

  // The Executive summary currently renders synthetic data. Disabled in
  // production by default so customers are never shown fabricated board metrics;
  // opt in for dev/demo via NEXT_PUBLIC_ENABLE_DEMO_EXECUTIVE=true.
  if (pathname === "/dashboard/executive" && process.env.NEXT_PUBLIC_ENABLE_DEMO_EXECUTIVE !== "true") {
    return sec(NextResponse.redirect(new URL("/dashboard", req.url)));
  }

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

    // Fail closed: a route with no authorization policy is denied even to a
    // valid session. This is the Batch 2.1 default-deny backstop — a new /api
    // route that nobody classified will 403 here rather than silently allow.
    if (required === "deny") {
      return sec(NextResponse.json(
        {
          error: "forbidden",
          message: "This resource has no authorization policy and is denied by default. Classify it in lib/api-authz.ts.",
        },
        { status: 403 }
      ));
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
    "/dev/:path*",
    "/login",
    "/register",
  ],
};
