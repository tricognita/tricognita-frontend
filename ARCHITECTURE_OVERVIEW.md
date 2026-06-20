# Architecture Overview

> A 10-minute read describing how the Tricognita frontend is organized. Designed for new contributors, security reviewers, and engineers evaluating the codebase.

## The 30-second version

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser                                  │
│   React 19 components, SWR for client cache, no SDK telemetry    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HMAC-signed session cookie
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Next.js Edge Middleware                          │
│   Verifies session, enforces RBAC by path prefix, CSRF Origin    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ verified session
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Next.js BFF Routes (app/api/)                    │
│   Per-handler RBAC check, tenant scope from session,             │
│   mints short-lived JIT tokens to call the Go API                │
└──────┬───────────────────────────┬────────────────────────┬──────┘
       │                           │                        │
       │ JIT-signed Bearer        │ Redis (REST)            │ Postgres
       ▼                           ▼                        ▼
┌──────────────┐         ┌──────────────────┐    ┌──────────────────┐
│   Go API     │         │ Upstash Redis    │    │ Neon Postgres    │
│  (separate   │         │ Sessions, queue, │    │ Users, audit_log,│
│   repo)      │         │ telemetry, etc.  │    │ findings, etc.   │
└──────────────┘         └──────────────────┘    └──────────────────┘
```

## Repository layout

```
.
├── app/                    Next.js App Router
│   ├── (marketing)/        Public marketing pages (not behind auth)
│   ├── dashboard/          Authenticated dashboard surfaces
│   │   ├── admin/          ADMIN-only operational consoles
│   │   ├── components/     Dashboard-specific React components
│   │   └── <feature>/      Per-feature pages (findings, incidents,
│   │                        queue, soc, executive, etc.)
│   ├── api/                BFF routes (server-side)
│   │   ├── admin/          ADMIN-only routes
│   │   ├── auth/           Login, register, refresh, logout
│   │   └── <resource>/     Per-resource routes
│   ├── login/              Auth pages
│   ├── onboarding/         Post-registration flow
│   └── error.tsx           Top-level error boundary
├── lib/                    Shared libraries (typed)
│   ├── ui/                 UI primitives (Button, Card, Table, etc.)
│   ├── auth.ts             Session signing + verification
│   ├── plans.ts            Plan-tier catalog as data
│   ├── usage-accounting.ts Per-tenant monthly counters
│   ├── lifecycle.ts        Lifecycle stage derivation
│   ├── telemetry.ts        Event taxonomy + emission
│   ├── webhook-dispatch.ts Outbound webhook dispatcher
│   ├── notify.ts           In-app + email notification fan-out
│   └── ...                 50+ more typed building blocks
├── middleware.ts           Edge middleware (auth + RBAC + CSRF)
├── next.config.ts          Next.js + security headers + CSP
└── docs/                   Public documentation
```

## Three load-bearing patterns

### 1. Tenant isolation at four layers

Tenant boundary is enforced independently at:

1. **Session cookie.** `tenantId` is a signed claim. Tampering invalidates the HMAC.
2. **BFF route.** Every handler reads `tenantId` from the verified session, never from request body or query string.
3. **Go API.** Every query includes `WHERE tenant_id = $1`. JIT token carries the same `tenantId`.
4. **Client cache.** `<TenantBoundary />` flushes the SWR cache on `tenantId` change.

No single layer is load-bearing; a leak would require simultaneous bugs in all four.

### 2. Three-layer RBAC

| Layer | File | Enforces |
|---|---|---|
| Edge middleware | `middleware.ts` | Path-prefix → allowed-role lists. Runs on every request. |
| BFF handler | each `app/api/**/route.ts` | Per-handler `session.role !== "ADMIN"` style checks. |
| Page guard | `<PageRestrictedGuard />` | Capability + entitlement check. Never trusted alone — server already enforced. |

`ROLE_ROUTES` in `lib/auth.ts` is the single declarative source for dashboard-route permissions. Adding a new role-restricted route requires editing exactly one place.

### 3. Plans-as-data + capabilities-as-data

```
lib/plans.ts        — plan catalog (quotas + features) as a typed const
lib/rbac.ts         — capability matrix per role + min plan per capability
lib/role-utils.ts   — plan + entitlement helpers
```

Adding a tier is a single object edit. Adding a capability is one map entry. Adding a feature flag is one type-union addition + one boolean per tier. The UI reads the catalog and renders comparison + upgrade prompts without bespoke per-tier UI code.

## Key abstractions

### `authedRoute` and `proxyRoute` (`lib/bff-log.ts`)

Most BFF routes use one of these two wrappers:

```typescript
export const POST = authedRoute(async ({ ctx, session, token, req }) => {
  if (session.role !== "ADMIN") return ctx.errorJson({ error: "forbidden" }, 403);
  // session.tenantId is verified; use it directly
  // token is a freshly-minted JIT token for upstream calls
});
```

`authedRoute` provides: session verification, JIT minting, request context (with request_id propagation), structured logging.

`proxyRoute` is the one-liner specialization for forwarding GETs to the Go API.

### `<PageRestrictedGuard />` (`app/dashboard/components/`)

Wraps every dashboard page. Handles:
- Capability check (plan + role).
- "Your plan doesn't include this" empty state with upgrade CTA.
- Loading skeleton while session is being verified.
- Single source of truth for "is this page reachable for this user?".

### UI primitives (`lib/ui/`)

Tailwind-v4 + CSS-variable design tokens. Single primitives composed everywhere:

- `Button`, `Card`, `CardHeader`, `Table`, `Badge`, `Stat`, `KPI`, `Skeleton`, `EmptyState`, `ErrorState`, `FilterBar`, `Timeline`, `StatusDot`, `PageShell`, `Section`, `Stack` (with `HStack` / `VStack` aliases), `DegradedBanner`.

A new dashboard page is typically `<PageShell><HStack><KPI/></HStack><Card><Table/></Card></PageShell>` — no bespoke layout code.

### Telemetry (`lib/telemetry.ts`)

37 typed event types across 9 categories. Every emission carries `tenant_id` (from verified session), `user_hash` (SHA-256 truncated), `role`, `route`, optional `data`. Fail-open: a Redis outage drops events silently rather than blocking user actions. Aggregates feed the admin Insights dashboard.

### Plans + usage accounting (`lib/plans.ts`, `lib/usage-accounting.ts`, `lib/lifecycle.ts`)

Three modules that together drive the customer Plan page and the admin Commercial console:

- `plans.ts` defines the tier catalog (Free / Starter / Professional / Enterprise) with 5 quotas + 13 features.
- `usage-accounting.ts` increments per-tenant per-month counters as scans, exports, webhooks, incidents happen.
- `lifecycle.ts` derives a lifecycle stage (signed_up / activating / activated / engaged / dormant / churning) from a usage history.

## Stack choices and why

| Choice | Why |
|---|---|
| Next.js 16 App Router | Modern React, edge middleware for auth, file-system routing matches the security model |
| React 19 + React Compiler | Compiler purity checks catch render bugs at lint time |
| TypeScript strict | No `any`, no `unknown` slipping through, catches contract drift at build |
| Tailwind v4 | CSS-variable tokens let dark mode + brand customization be data |
| SWR | Per-key caching with focus/reconnect revalidation matches "operator dashboard with 30s refresh" perfectly |
| Upstash Redis (REST) | Edge-compatible, no connection pooling complexity, fail-open friendly |
| HMAC-SHA256 signatures | Stateless verification at the edge, no session DB lookup on every request |
| Vercel + Fly.io | Vercel for BFF (edge + Node.js), Fly.io for the Go API (geographically pinned compute) |

## Where to start as a new contributor

1. Read `README.md` for what the platform is.
2. Run `npm install && cp .env.example .env.local && npm run dev` and click around.
3. Read `docs/SECURITY_ARCHITECTURE.md` for the auth + tenant model.
4. Read `docs/WORKFLOW_ENGINE.md` for incident lifecycle and routing.
5. Read `CONTRIBUTOR_GUIDE.md` (companion to this doc) for what to work on.

## Where to start as a security reviewer

1. Read `docs/SECURITY_REVIEW.md` (reviewer-facing posture pack).
2. Read `OSS_SAFE.md` (public/private boundary).
3. Audit the three load-bearing patterns above.
4. Open a private security advisory for anything concerning (`SECURITY.md`).

## Things to know

- The Go API lives in a separate (private) repository. The BFF here treats it as an authenticated upstream and never trusts its output for authorization decisions.
- The dashboard works against synthetic demo data with no real cloud connection. `lib/demo-data.ts` and `lib/demo.ts` cover demo-mode behavior.
- Most admin routes are tenant-scoped; a small set are intentionally cross-tenant (incidents, exports, health-aggregate, deployment-verify, insights, commercial, leads, feedback). Each carries the per-handler `session.role !== "ADMIN"` check as defense in depth on top of the middleware path-prefix gate.
- We do not capture PII for telemetry beyond a one-way truncated SHA-256 of the user's email. No third-party SDK loads in the browser.

For the deeper why behind these decisions, see the docs in `docs/`.
