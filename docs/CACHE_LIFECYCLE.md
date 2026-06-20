# Frontend Cache & Data Lifecycle Policy

**Last reviewed:** Phase 8.
**Companion to:** `docs/SECURITY_TENANT_AUDIT.md`, `docs/SECURITY_ARCHITECTURE.md`, `docs/PRODUCTION_READINESS.md`.

This document is the canonical answer to *"what data lives where, for how long, and what happens when it expires?"*. Any new caching layer or data-store touch should be added below.

---

## 1. Server-side (BFF + Redis + cookies)

### 1.1 Session + auth cookies

| Cookie | TTL | Storage | Rotation | Reset trigger |
|---|---|---|---|---|
| `trico_session` | 15 min | Browser (HttpOnly, SameSite=Lax, Secure prod) | Re-issued on `/api/auth/refresh` | Logout / expiry / role change |
| `trico_refresh` | 7 days | Browser (HttpOnly, SameSite=Strict, Secure prod, Path=/api/auth/refresh) | Atomic rotate on every refresh | Logout / explicit revoke |
| `trico_logout_at` (localStorage) | until cleared | Browser localStorage | Set on signOut, read by `useMultiTabLogout` | Logout |

Refresh tokens are recorded in Redis (`tricognita:refresh:{jti}`) with the same 7-day TTL; lookup miss = replay attempt → 401.

### 1.2 Redis-backed lists + counters

| Key pattern | TTL | LTRIM cap | Owner | Notes |
|---|---|---|---|---|
| `tricognita:notifications:admin` | none (LTRIM-bounded) | 200 entries | `lib/notify.ts:notify()` | Cross-tenant ADMIN feed |
| `tricognita:notifications:tenant:{tenantId}` | none (LTRIM-bounded) | 200 entries | `lib/notify.ts:notify()` | Per-tenant feed (Phase 7 G1) |
| `tricognita:email:logs` | none (LTRIM-bounded) | 500 entries | `lib/notify.ts:logEmail()` | SES dispatch audit |
| `tricognita:refresh:{jti}` | 7 days (Redis EXPIRE) | n/a | `lib/token-store.ts` | Refresh token store (replay detection) |
| `tricognita:revoked:{jti}` | varies | n/a | `lib/token-store.ts` | Access-token blacklist |
| `tricognita:quota:scan:{tenantId}` | 60 s | n/a | `lib/tenant-quota.ts` (Phase 8) | Per-tenant scan concurrency counter |
| `tricognita:quota:remediate:{tenantId}` | 60 s | n/a | `lib/tenant-quota.ts` (Phase 8) | Per-tenant remediation concurrency counter |

**Eviction guarantees:**
- Notification + email lists are LTRIM-bounded — Redis size is bounded by `200 × (#tenants + 1) + 500`. At 100 tenants this is ~20k entries total; well within Upstash's free-tier limit.
- Quota counters self-expire via `EXPIRE` in `acquireQuota()`. An orphaned counter (caller crashed before `releaseQuota`) frees within `windowSec`.
- Refresh tokens use native Redis EXPIRE matching the 7-day cookie TTL.

### 1.3 BFF in-memory caches

| Cache | TTL | Scope | File |
|---|---|---|---|
| System health snapshot | 30 s | Module-singleton | `app/api/system-health/route.ts` |
| Redis client | process lifetime | Module-singleton | `lib/notify.ts`, `lib/tenant-quota.ts` |
| SES client | process lifetime | Module-singleton | `lib/notify.ts` |

These die on Vercel cold-start. Acceptable: they're optimization, not correctness — every cache miss falls through to the source-of-truth path.

### 1.4 HTTP response cache headers

| Route class | Cache-Control | Set by |
|---|---|---|
| `/api/*` (default) | `no-store, max-age=0, must-revalidate` | `next.config.ts:apiHeaders` (Phase 7) |
| `/api/system-health` | `no-store` + `X-Health-Cache: HIT\|MISS` | Per-route override |
| Static `/_next/*` | `public, max-age=31536000, immutable` | Next.js default (hashed filenames) |

No shared cache (CDN, ISP proxy, corporate gateway) is permitted to retain `/api/*` responses — they're tenant-scoped and short-lived by design.

---

## 2. Client-side (browser)

### 2.1 SWR cache

| Key | Refresh interval | revalidateOnFocus | retry policy | Owner |
|---|---|---|---|---|
| `/api/auth/me` | 5 min | false | none | `lib/use-session.ts` |
| `/api/findings` | none | false | once (skip 401/403/429) | `app/dashboard/findings/page.tsx` |
| `/api/compliance/score` | 5 min | false | none | `app/dashboard/compliance/page.tsx` |
| `/api/compliance/controls` | 5 min | false | none | `app/dashboard/compliance/page.tsx` |
| `/api/admin/ops` | 15 s | true | none | `app/dashboard/admin/operations/page.tsx` |
| All other dashboard fetches | none (default) | false (global config) | 1 retry, 5s delay, never on 401/403/429 | `app/dashboard/ClientLayout.tsx:SWR_CONFIG` |

**Eviction guarantees:**
- `TenantBoundary` (Phase 5) flushes every key except `/api/auth/me` when `isAuthenticated` flips false OR when `session.tenantId` changes.
- `signOut` ALSO flushes every `trico_*` / `tricognita_*` localStorage key.
- The SWR cache itself lives in module memory — it dies on full page reload (a deliberate trade-off: reloads must be cheap to recover from cache poisoning).

### 2.2 localStorage

| Key | Purpose | Lifetime | Flushed on logout |
|---|---|---|---|
| `trico_onboarded` | "Dismiss onboarding nudge" preference | until cleared | Yes |
| `tricognita_notif_thresholds` | User notification preference | until cleared | Yes |
| `trico_logout_at` | Multi-tab logout marker | written + read inside session | Yes (set to logout timestamp) |

All keys prefixed with `trico_` or `tricognita_`. Anything else in localStorage is foreign — not written by this app.

### 2.3 sessionStorage

Currently unused. If introduced, every key MUST be flushed by the same `signOut` loop.

---

## 3. Retention assumptions

### 3.1 What we promise to retain

| Surface | Retention | Source-of-truth |
|---|---|---|
| Audit chain rows | indefinite | Go API `audit_logs` table (Postgres) |
| Email log entries | last 500 dispatches | Redis `tricognita:email:logs` |
| Notifications (per-tenant) | last 200 events | Redis `tricognita:notifications:tenant:{tenantId}` |
| Notifications (admin) | last 200 events | Redis `tricognita:notifications:admin` |
| Refresh tokens | up to 7 days | Redis `tricognita:refresh:{jti}` |
| Findings + scan results | tenant-controlled | Go API + customer S3 dataset |

### 3.2 What we do NOT retain

| Item | Why not |
|---|---|
| Raw access tokens | HttpOnly cookies only — no server-side persistence beyond the JTI |
| Full API keys | Shown once at creation; only the prefix is persisted |
| Client error stack traces | Telemetry receives only the digest + path (Phase 6) — never the raw message |
| Cross-tenant notification view (for non-ADMIN) | Tenant-keyed Redis (Phase 7 G1) — non-ADMIN reads are tenant-scoped |
| MFA secrets after enrollment | Stored encrypted in user record; not in any cache layer |

---

## 4. Large-dataset behavior

| Surface | Strategy | Trigger to revisit |
|---|---|---|
| Findings list | Server-side filter + paginated read (Go API responsibility); client renders top-N | If a tenant ever ships >5k findings |
| Audit trail | Server-side cursor; client uses primary table + drawer for detail | If a tenant accumulates >100k audit rows |
| Attack graph | xyflow renders all nodes; layout cost is O(n log n). 100+ nodes will slow pan/zoom | If a tenant's blast radius exceeds 100 nodes — switch to clustering |
| Notification feed | LTRIM to 200 per key; older events evicted | If tenants need historical replay → move to Go API audit_logs |
| Email log | LTRIM to 500 globally | If multi-tenant prod needs per-tenant email log → split keys like notifications |

---

## 5. Failure modes

| Component | Failure | Behavior |
|---|---|---|
| Redis | Unreachable | `acquireQuota` fails OPEN (Phase 8); notifications swallow + log; refresh-store lookups fail closed (401 returned) |
| Go backend | Unreachable | BFF routes return 502 with structured error body + request_id; dashboards fall back to `DEMO_*` reference data |
| Upstash credentials missing | Notifications + quotas are no-ops; refresh tokens fail (401) | Surfaces in System Health dashboard |
| SES credentials missing | Email dispatch logs warning, no email sent | Visible in System Health |
| User-Agent change mid-session | Logged as `ip_change` / `ua_change` security event | Policy: log only today; can be flipped to reject |
| Refresh token reuse | Logged as `refresh_invalid` (replay attempt); 401 returned | Always-on |

Last reviewed: 2026-05-22 (Phase 8).
