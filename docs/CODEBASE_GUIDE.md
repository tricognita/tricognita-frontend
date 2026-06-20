# Codebase Guide

> "Where things live" for new contributors. Pair this with `ARCHITECTURE_OVERVIEW.md` (system shape) and `CONTRIBUTOR_GUIDE.md` (contribution process).

## Read this first

If you've never opened the codebase before, run this once:

```bash
git clone https://github.com/tricognita/tricognita-frontend.git
cd tricognita-frontend
npm install
cp .env.example .env.local
# Edit .env.local — every "change-me" must be replaced
npm run dev
```

Open `http://localhost:3000`. The dashboard renders against synthetic demo data; no real cloud connection is required.

## Where things live

### Top-level directories

```
app/              Next.js App Router (pages + BFF routes)
lib/              Shared TypeScript libraries
docs/             Public documentation (you are here)
.github/          Issue + PR templates
public/           Static assets (mostly framework SVGs)
middleware.ts     Edge middleware (auth + RBAC + CSRF)
next.config.ts    Next.js config + security headers + CSP
package.json      Dependencies + scripts
.env.example      Template — copy to .env.local for local dev
```

### Public marketing pages — `app/(marketing)/`

Unauthenticated pages reachable without login.

```
app/(marketing)/
├── layout.tsx                Marketing layout (nav + footer)
├── page.tsx                  Homepage
├── components/               Marketing-specific React components
├── trust/                    Trust Center
├── how-it-works/             5-step product overview
├── for-cloud-teams/          Audience page — security teams
├── for-mssps/                Audience page — MSSPs (honest gaps)
├── request-demo/             Lead capture (qualified form)
├── pilot-application/        Lead capture (qualified form)
├── waitlist/                 Lead capture (minimal form)
├── about/, pricing/, privacy/, terms/, contact/   ...
└── solutions/, services/, architecture/, security/, resources/   ...
```

**Adding a new marketing page:** create the directory + `page.tsx`. Use the marketing layout's existing styling (zinc dark theme, emerald accent).

### Authenticated dashboard — `app/dashboard/`

The application UI behind auth.

```
app/dashboard/
├── ClientLayout.tsx          Top-level layout: SWRConfig + TenantBoundary + Nav
│                             + CommandPalette + FeedbackWidget + TelemetryTracker + GuidedTour
├── components/               Dashboard-specific React components
│   ├── DashboardNav.tsx      Sidebar nav (declarative, role-gated)
│   ├── PageRestrictedGuard.tsx   Capability + entitlement check wrapper
│   ├── NotificationCenter.tsx
│   ├── CommandPalette.tsx
│   ├── FeedbackWidget.tsx
│   ├── TelemetryTracker.tsx
│   ├── GuidedTour.tsx
│   ├── AttackGraph.tsx
│   └── ...
├── admin/                    ADMIN-only operational consoles
│   ├── operations/, platform/, trace/
│   ├── feedback/, insights/, commercial/, leads/, pilot-health/
│   └── ...
├── findings/, attack-graph/, incidents/, queue/, soc/, executive/
├── aria/, alert-routes/, api-keys/, audit-trail/, audit/
├── compliance/, credentials/, datasets/, dspm/, executive/, exports/
├── finops-security/, guard/, iac/, k8s/, services/, threat-intel/
├── plan/                     Customer-visible plan + usage page
└── error.tsx                 Top-level error boundary
```

**Adding a new dashboard page:**

1. Create `app/dashboard/<feature>/page.tsx`.
2. Wrap in `<PageRestrictedGuard capability="...">` for capability gating.
3. Add to `app/dashboard/components/DashboardNav.tsx` entries.
4. Add to `lib/auth.ts` `ROLE_ROUTES` for role gating.

### BFF routes — `app/api/`

Server-side routes that handle session, RBAC, tenant scoping, and call the Go API.

```
app/api/
├── auth/                     login, register, logout, refresh, me
├── admin/                    ADMIN-only routes (mirror /dashboard/admin)
│   ├── feedback/, insights/, commercial/, leads/, pilot-health/
│   ├── deployment-verify/, health-aggregate/, demo-reset/
│   ├── incidents/, exports/siem.ndjson/, webhook-drain/, webhooks/
│   ├── platform/, ops/, trace/
│   └── ...
├── feedback/                 Authenticated feedback POST
├── leads/                    Public lead capture POST
├── telemetry/                Client-side telemetry ingest
├── usage/                    Tenant usage summary
├── notifications/            Notification feed
├── scan/, remediate/         Scan + remediation triggers
├── findings/, audit-trail/   Read-only data
├── credentials/, organizations/
├── aria/                     ARIA-related routes
├── compliance/, cloud/, dspm/, iac/, k8s/, guard/, threatintel/
├── system-health/, healthz/
└── marketing/, contact/      Public marketing-form endpoints
```

**Adding a new BFF route:**

1. Create `app/api/<resource>/route.ts`.
2. Use `authedRoute` from `lib/bff-log.ts` (or `proxyRoute` for simple GETs forwarding to Go).
3. Per-handler: `if (session.role !== "ADMIN") return ctx.errorJson({ error: "forbidden" }, 403);` for ADMIN routes.
4. Add to `middleware.ts` `ADMIN_API` / `SECOPS_API` / `AUDITOR_API` allow-list.

### Shared libraries — `lib/`

Typed TypeScript modules used by routes + pages.

```
lib/
├── ui/                       Design primitives
│   ├── Button.tsx, Card.tsx, Table.tsx, Badge.tsx,
│   ├── KPI.tsx, Stat.tsx, Skeleton.tsx, EmptyState.tsx,
│   ├── ErrorState.tsx, FilterBar.tsx, Timeline.tsx,
│   ├── PageShell.tsx, Section.tsx, Stack.tsx (+ HStack, VStack),
│   ├── StatusDot.tsx, DegradedBanner.tsx, ConfirmDangerous.tsx,
│   ├── cn.ts                 className combiner
│   └── index.ts              re-exports
├── auth.ts                   Session signing + verification + ROLE_ROUTES
├── env.ts                    Required env var validation + checkEnv() helper
├── jit-secret.ts             JIT token minting for Go API calls
├── bff-log.ts                authedRoute + proxyRoute + logRoute (logging)
├── users.ts                  User CRUD + bootstrap admin
├── rbac.ts                   Capability matrix per role + plan tier rank
├── plans.ts                  Plan catalog as data
├── usage-accounting.ts       Per-tenant monthly counters
├── lifecycle.ts              Lifecycle stage derivation (pure function)
├── telemetry.ts              Event taxonomy + emission
├── feedback.ts               Feedback inbox storage
├── leads.ts                  Lead capture storage
├── webhook-dispatch.ts       Outbound webhook dispatcher with retry
├── notify.ts                 In-app + email notification fan-out
├── notification-routing.ts   Severity → channels decision engine
├── incidents.ts              Incident workflow model
├── events.ts                 Typed event envelopes
├── demo.ts                   Demo-mode flag + reset utility
├── demo-data.ts              Synthetic data for local dev
├── tenant-quota.ts           Per-tenant rate limiting
├── audit-events.ts           BFF-side audit-event emission (fire-and-forget)
├── role-utils.ts             Plan + entitlement helpers
├── entitlements.ts           Plan-tier entitlement lookups
├── swr-fetcher.ts            Typed fetch wrapper for SWR
├── use-session.ts            Client session hook
├── session-refresh.ts        Session expiry redirect hook
├── posture-state.ts          Platform posture aggregation
├── release.ts                Deployment release metadata
└── ...                       ~50 more
```

**Adding a new lib module:**

1. Create `lib/<name>.ts`.
2. Follow the patterns in `lib/feedback.ts` for Redis-backed storage modules.
3. Follow the patterns in `lib/lifecycle.ts` for pure-function derivation modules.
4. Export from `lib/<name>.ts` directly — there's no central index.

## Important routes to know

### Customer-facing

| Route | Purpose |
|---|---|
| `/dashboard` | Home view; posture + alerts + KPIs |
| `/dashboard/findings` | Prioritized findings list |
| `/dashboard/attack-graph` | Reachable attack-path visualization |
| `/dashboard/queue` | Unified analyst work queue |
| `/dashboard/soc` | SOC operations dashboard |
| `/dashboard/incidents` | Incident workflow |
| `/dashboard/aria` | AI-assisted remediation proposals |
| `/dashboard/executive` | 30-second CISO read |
| `/dashboard/exports` | Compliance / SIEM / audit exports |
| `/dashboard/plan` | Customer plan + usage |
| `/dashboard/credentials` | Cloud-account credential management |

### Admin-only

| Route | Purpose |
|---|---|
| `/dashboard/admin/operations` | Per-tenant quota + Go health |
| `/dashboard/admin/platform` | Aggregate tenant + storage |
| `/dashboard/admin/insights` | Product telemetry rollup |
| `/dashboard/admin/commercial` | Per-tenant plan + usage + lifecycle |
| `/dashboard/admin/leads` | Marketing lead inbox |
| `/dashboard/admin/pilot-health` | Per-tenant pilot risk |
| `/dashboard/admin/feedback` | Cross-tenant feedback |
| `/dashboard/admin/trace` | Request-id correlation tool |

## Telemetry hooks (for "where do I emit a new event?")

Server-side emission from a BFF route:

```typescript
import { emitTelemetry } from "@/lib/telemetry";

emitTelemetry({
  type: "feedback.submitted",       // must be in TelemetryEventType union
  tenantId: session.tenantId,        // from verified session, NEVER body
  userEmail: session.email,          // hashed to user_hash internally
  role: session.role,
  route: entry.page_path,            // optional
  data: { category: entry.category }, // optional, sanitized to ≤8 fields
});
```

Adding a new event type:

1. Add to `TelemetryEventType` union in `lib/telemetry.ts`.
2. Add to `ALLOWED_CLIENT_EVENTS` in `app/api/telemetry/route.ts` if client-emittable.
3. Add to `ALL_TYPES` in `lib/telemetry.ts:readFeatureLastSeen` so the dormancy detector knows about it.
4. Document in `docs/TELEMETRY_GOVERNANCE.md §1.1`.

## Demo systems

For local development without real cloud:

| File | Purpose |
|---|---|
| `lib/demo.ts` | DEMO_MODE flag + reset utility |
| `lib/demo-data.ts` | Synthetic findings, accounts, attack paths, compliance, audit events, alerts |
| `app/api/admin/demo-reset/route.ts` | ADMIN-only reset endpoint (404 outside DEMO_MODE) |
| `app/dashboard/components/GuidedTour.tsx` | First-time-user walkthrough |

Adding more synthetic data:

1. Add a new `DEMO_*` constant to `lib/demo-data.ts`.
2. Use the `DEMO_` prefix convention.
3. AWS account IDs: use the canonical placeholder `123456789012`.
4. Emails: use `@example.com` or `@demo.tricognita.invalid`.

## Plans + lifecycle

The commercial scaffolding:

| File | Purpose |
|---|---|
| `lib/plans.ts` | 4-tier plan catalog (Free / Starter / Professional / Enterprise) |
| `lib/rbac.ts` | Capability matrix per role + min-plan per capability |
| `lib/usage-accounting.ts` | Per-tenant monthly counters (scans, exports, webhooks, etc.) |
| `lib/lifecycle.ts` | Pure-function lifecycle stage derivation |
| `lib/entitlements.ts` | Plan-tier entitlement lookups |
| `lib/role-utils.ts` | Plan + role helpers |
| `app/dashboard/plan/page.tsx` | Customer plan + usage view |
| `app/api/usage/route.ts` | Tenant usage summary |
| `app/api/admin/commercial/route.ts` | Cross-tenant commercial view |

Adding a new plan tier:

1. Append to `PLANS` in `lib/plans.ts`.
2. Update `PLAN_RANK` in `lib/rbac.ts`.
3. Document in `docs/PRICING_MODEL.md`.

## Common patterns

### A typical authenticated GET route

```typescript
import { authedRoute, logRoute } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = authedRoute(async ({ ctx, session }) => {
  // session is verified; session.tenantId is the only safe tenant scope
  const data = await someLibrary.read(session.tenantId);
  logRoute(ctx, "info", "feature.read", { count: data.length });
  return Response.json({ data });
});
```

### A typical authenticated POST route

```typescript
export const POST = authedRoute(async ({ ctx, session, req }) => {
  const body = (await req.json().catch(() => ({}))) as { ... };
  // validate body
  const result = await someLibrary.write({
    tenantId: session.tenantId,  // from session
    actor: session.email,
    ...body,
  });
  if (!result) {
    return ctx.errorJson({ error: "redis_unavailable" }, 503);
  }
  logRoute(ctx, "info", "feature.created", { id: result.id });
  return Response.json(result, { status: 201 });
});
```

### A typical ADMIN-only route

```typescript
export const GET = authedRoute(async ({ ctx, session }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "feature.forbidden", { actor_role: session.role });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  // ... cross-tenant operation
});
```

### A typical dashboard page

```typescript
"use client";

import useSWR from "swr";
import { PageShell, Card, CardHeader, KPI, HStack, VStack } from "@/lib/ui";
import { PageRestrictedGuard } from "../components/PageRestrictedGuard";
import { fetcher } from "@/lib/swr-fetcher";

export default function Page() {
  return (
    <PageRestrictedGuard capability="manageSettings" title="...">
      <View />
    </PageRestrictedGuard>
  );
}

function View(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useSWR("/api/...", fetcher, {
    refreshInterval: 60_000,
  });
  // render with PageShell + KPI + Card primitives
}
```

## When stuck

- Check `docs/architecture/SYSTEM_OVERVIEW.md` for the big picture.
- Check `docs/architecture/DEPENDENCY_MAP.md` for module relationships.
- Check existing similar features for patterns — most decisions are already made consistently.
- Open a GitHub Discussion if a design question doesn't have an existing answer.

Last reviewed: 2026-05-23 (Phase 23).
