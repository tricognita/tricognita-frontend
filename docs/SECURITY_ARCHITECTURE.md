# Tricognita Frontend — Security Architecture Summary

**Audience:** enterprise security reviewers, vendor-assessment teams, technical due-diligence.
**Scope:** the Next.js BFF + dashboard UI under `frontend/`. The Go API has its own posture document (`api/SECURITY.md`).
**Last reviewed:** Phase 7, 2026-05-22.

---

## TL;DR

| Concern | Posture |
|---|---|
| Auth | HMAC-SHA256 short-lived (15 min) access + long-lived (7 day) refresh; HttpOnly cookies; SameSite Lax/Strict; refresh rotation w/ Redis replay detection |
| Authorization | 3-layer RBAC (edge middleware → BFF → Go JIT-tier); single source of truth in `lib/rbac.ts` with TS-enforced exhaustive role roster |
| Tenant isolation | Tenant id flows in JIT claims to Go API; client SWR cache flushed on tenant-id change AND on logout; per-tenant Redis keys for notifications (G1 closed in Phase 7) |
| Audit | Hash-linked Go audit_logs (tamper evidence); structured BFF logging w/ correlation IDs; 24 typed client-side audit event types |
| Browser hardening | CSP, HSTS 2yr+preload, X-Frame-Options DENY, CORP/COOP same-origin, Permissions-Policy default-deny |
| Secrets | All in env vars; no secrets in client bundle; refresh cookie path-scoped to `/api/auth/refresh`; API keys shown once at creation |
| Supply chain | npm audit: 2 known issues, both in `next` 16.2.3 → 16.2.6 (dependabot PR #16 in flight) |
| Destructive actions | Typed-confirmation modals (`ConfirmDangerous`) on revoke / disconnect / delete |

---

## 1. Authentication

### 1.1 Cookies

| Cookie | Purpose | TTL | Flags | Path |
|---|---|---|---|---|
| `trico_session` | Access token (HMAC-SHA256 JWT) | 15 min | `HttpOnly`, `Secure` (prod), `SameSite=Lax` | `/` |
| `trico_refresh` | Refresh token | 7 days | `HttpOnly`, `Secure` (prod), `SameSite=Strict` | `/api/auth/refresh` |

JS cannot read either cookie (XSS-resistant). The refresh cookie is path-scoped to the refresh endpoint and uses SameSite=Strict, which is the strongest CSRF defense the browser offers — no cross-origin request can carry it.

### 1.2 Session payload

```
{ email, role, tenantId, exp, iat, jti, uat }
```

- `jti` is checked against a Redis revocation blacklist on every middleware pass (`lib/token-store.ts`).
- `uat` is a 64-bit SHA-256 truncation of the User-Agent header, providing weak client binding (mitigates token-theft-and-replay from a different browser).

### 1.3 Refresh model

`POST /api/auth/refresh` follows a strict 4-step protocol (route-level docs in `app/api/auth/refresh/route.ts`):

1. HMAC + expiry validation on the incoming refresh token.
2. Redis lookup — if the token isn't in the store, it's a **replay attempt** → 401 + security event logged.
3. **Atomic rotation** — old token deleted before new one issued, so two concurrent refreshes can't both succeed.
4. IP/UA change logged as a security event (configurable to reject; currently logs only).

### 1.4 Client-side hardening (Phase 6)

- `lib/session-refresh.ts:tryRefreshOnce` — single-flight refresh, 2-second hard floor between attempts, coalesces concurrent callers (multi-tab, multi-component) to one in-flight request.
- `useSessionExpiry()` — deterministic redirect to `/login?expired=1` when a previously-authenticated session goes unauthenticated; tries refresh once, redirects only if that fails.
- `useMultiTabLogout()` — logout in tab A fires a `storage` event; tab B receives it and routes to `/login`.

---

## 2. Authorization

### 2.1 Three enforcement layers

| # | Layer | File | Role |
|---|---|---|---|
| 1 | Edge middleware | `middleware.ts` | `apiRequiredRoles(path)` returns required role union; 403 if session role mismatched |
| 2 | BFF route handler | per-route + `lib/bff-log.authedRoute` | Verifies session; mints JIT with the session's **actual** role + tenant (never trusts headers) |
| 3 | Go API JIT tier | `api/main.go:jitMiddleware` | Checks `tier ≥ required` for the endpoint |

### 2.2 Capability matrix

`lib/rbac.ts:CAPABILITIES` is the single source of truth for "can role X do Y?". 30+ capabilities mapped to role unions. Mirrored in `lib/rbac-roster.ts:ROLES_BY_CAPABILITY` for UI display — TypeScript exhaustiveness catches drift at compile time.

### 2.3 JIT tier mapping (Phase 7 G4)

`lib/jit-token.ts:tierForRole` maps session role → JIT tier:

| Tier | Roles |
|---|---|
| `OPERATOR` | ADMIN, SECOPS, SOC_LEAD, DEVSECOPS, CLOUD_ENGINEER |
| `AUTO` | AUDITOR, RED_TEAMER, FINOPS_ANALYST, CLIENT, VIEWER |
| `DUAL_CONTROL` | (reserved — future 2-of-N approvals) |
| `CISO` | (reserved — platform-tenant ADMIN cross-tenant view) |

Read-only roles get AUTO tier; write endpoints get rejected at the tier check rather than silently elevated. Prior behavior hardcoded OPERATOR for everyone.

### 2.4 Resolved BFF↔rbac drift (Phase 5)

Previously `middleware.ts:SECOPS_API` allow-list included CLIENT + AUDITOR on write paths (`/api/scan`, `/api/remediate`, `/api/credentials`). Tightened in commit `488c3ec` to match `lib/rbac.ts` triggerScan / triggerRemediate / viewCredentials (which exclude both roles).

---

## 3. Tenant isolation

### 3.1 Server-side

- `tenantId` is in every session claim + every JIT token claim.
- Every BFF route derives `tenantId` from `session.tenantId`. None accepts a client-supplied tenant id.
- See `docs/SECURITY_TENANT_AUDIT.md` for the full 71-route enforcement inventory.

### 3.2 Client-side (Phase 5 + 6)

- `TenantBoundary` (`app/dashboard/ClientLayout.tsx`) — flushes SWR cache when `isAuthenticated → false` OR when `session.tenantId` changes mid-session. Closes the cross-tenant cache-leak window between logout and revalidation.
- `signOut` flushes every `trico_*` / `tricognita_*` localStorage key.
- Multi-tab logout via the `storage` event.

### 3.3 Notification isolation (Phase 7 G1)

- Tenant-keyed Redis writes: `tricognita:notifications:tenant:{tenantId}` per-tenant + `tricognita:notifications:admin` for cross-tenant ADMIN view.
- `/api/notifications` reads the cross-tenant key for ADMIN, the tenant-scoped key for everyone else.
- Defense-in-depth: non-ADMIN reads also filter on `n.tenant_id === session.tenantId` so any legacy untenanted events are excluded.

---

## 4. Audit & traceability

### 4.1 Server side

- Go API writes to `audit_logs` table via `LogAudit(userID, action, resource, metadata)`.
- Rows are hash-linked (`api/auditchain.go`) — tamper-evident chain.

### 4.2 BFF observability spine

- `lib/bff-log.ts:withRequestContext` wraps route handlers with:
  - 12-hex-char correlation id (`X-Request-ID`)
  - Structured JSON logs: `request.start`, `request.end` (with status + elapsed_ms), uncaught exceptions
  - Correlation id echoed on every response header AND in error response bodies
- `lib/bff-log.ts:authedRoute` adds session verification + JIT mint to the wrapper.
- `lib/bff-log.ts:proxyRoute` one-liner for simple upstream-forward GETs.
- 14+ BFF routes migrated; remaining routes work and are correct but emit fewer structured logs.

### 4.3 Client audit events (Phase 6)

`lib/audit-events.ts` emits 24 typed events (auth, scan, remediation, credentials, alerts, API keys, settings) to `/api/audit/client-event`. The BFF route:

1. Validates `type` against an explicit allowlist.
2. **Ignores** client-supplied `actor_email` / `tenant_id` / `role` — derives them from the verified session only.
3. Forwards to Go's audit pipeline for hash-linked write.
4. Returns 200 unconditionally (audit is best-effort from the client's perspective; never blocks a user action).

### 4.4 Error-boundary telemetry (Phase 6)

`/api/telemetry/client-error` receives Next.js error-boundary triggers from both `app/error.tsx` (marketing) and `app/dashboard/error.tsx`. Logs the digest + path + session-derived actor/tenant/role. Client-supplied fields beyond `surface` / `digest` / `ts` / `path` are ignored.

---

## 5. Browser hardening

`next.config.ts` headers (Phase 7):

| Header | Value |
|---|---|
| Content-Security-Policy | restrictive; details below |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` (2 years, preload-eligible) |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | camera/microphone/geolocation/payment/accelerometer/gyroscope/magnetometer/usb all blocked; interest-cohort opt-out |
| Cross-Origin-Opener-Policy | `same-origin` |
| Cross-Origin-Resource-Policy | `same-origin` |
| X-DNS-Prefetch-Control | `off` |
| X-Permitted-Cross-Domain-Policies | `none` |
| Cache-Control (`/api/*`) | `no-store, max-age=0, must-revalidate` |

CSP directives:

```
default-src 'self'
script-src  'self' 'unsafe-inline' https://static.cloudflareinsights.com
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com
font-src    'self' data: https://fonts.gstatic.com
img-src     'self' data: blob: https://avatars.githubusercontent.com
connect-src 'self' {SENTINEL_API_URL} https://*.amazonaws.com https://*.fly.dev
media-src   'none'
object-src  'none'
frame-src   'none'
frame-ancestors 'none'
worker-src  'self' blob:
manifest-src 'self'
base-uri    'self'
form-action 'self'
upgrade-insecure-requests
```

**Known caveat:** `'unsafe-inline'` on `script-src` and `style-src` is required by Next.js's inline runtime + Tailwind v4 preflight. A nonce-based CSP requires a custom edge runtime that mints per-request nonces — non-trivial refactor; tracked.

---

## 6. Secret & credential safety

- All secrets in env vars (no secrets in client bundle).
- `SENTINEL_JIT_SECRET` enforced ≥ 32 bytes at startup; missing → BFF routes return `503 jit_not_configured` rather than crashing (closed in Phase 4).
- API keys shown ONCE at creation and never persisted in plain text on the audit row (resource = prefix only).
- localStorage scoped to `trico_*` / `tricognita_*` prefixes; flushed on logout.
- Refresh cookie path-scoped + SameSite=Strict.
- Error responses include a correlation id but never raw stack traces or env values.

---

## 7. Scan + action safety

| Defense | Implementation |
|---|---|
| Client-side dedup | `lib/resilience.ts:resilientFetch` dedups concurrent identical fetches per tab |
| Server-side dedup | `Idempotency-Key` header propagated client → BFF → Go (Phase 5) |
| Trigger blocking | Scan button `disabled` while `scanState ∈ {queued, running}` (Phase 6) |
| Destructive confirmation | `ConfirmDangerous` typed-phrase modal on revoke / disconnect / delete (Phase 7) |
| Remediation audit lineage | `remediation.approved` / `.rejected` emitted on operator decision; Go writes execution row separately — two events give complete decision-to-execution chain (Phase 7 G6) |
| Multi-tab session sync | Logout propagates via `storage` event (Phase 6) |
| Session expiry handling | Single-flight refresh; deterministic redirect on hard expiry (Phase 6) |

---

## 8. Supply chain

- Build-time TypeScript regression block: `next.config.ts:typescript.ignoreBuildErrors: false`. Builds fail on type regressions.
- `npm audit` post-Phase-7: **2 advisories** (1 moderate, 1 high), both in `next 16.2.3` requiring patch bump to `16.2.6` — dependabot PR #16 in flight.
- All other vulnerabilities (axios, postcss, follow-redirects, fast-xml-builder, brace-expansion) resolved by `npm audit fix` in this phase.
- Direct dependency review tracked separately; transitive surface (e.g. axios via `@aws-sdk/*`) is constrained by AWS SDK upgrade cadence.

---

## 9. Known gaps (full inventory)

See `docs/SECURITY_TENANT_AUDIT.md` §6. Phase 7 status:

| # | Status |
|---|---|
| G1 — per-tenant Redis keys | ✅ Resolved (this phase, commit `6fbf11c`) |
| G2 — /api/scan inline pattern + X-User-Role header | ✅ Resolved (this phase, commit `5e11234`) |
| G3 — /api/auth/users tenant filter test coverage | Open (frontend test gap; Go side correct) |
| G4 — jit-token tier hardcoded | ✅ Resolved (this phase, commit `5e11234`) |
| G5 — ~24 routes on goFetchAuthorized | Open (tenant-correct, lower-priority structured-log gap) |
| G6 — remediation approval audit emissions | ✅ Resolved (this phase, commit `ccf4d19`) |

**New Phase 7 known item:**
- N1 — Next.js 16.2.3 → 16.2.6 patch bump needed (5 advisories). Tracked in dependabot PR #16; not force-fixed here to avoid stepping on the PR.

---

## 10. Reviewer-facing summary

A security reviewer asking *"would I trust this in production for multiple tenants?"* should see:

1. **Tenant isolation is defended at four layers**: edge middleware role check, BFF route session-derived tenantId in JIT claims, Go API tenant filter, client SWR cache flush on auth boundary.
2. **No raw white-screen failures**: every route has an error boundary; every BFF call has a correlation id surfaced in error UI.
3. **Every state-changing user action is auditable**: 24 typed event types flowing into the hash-linked Go audit_logs table; operator decisions captured separately from autonomous executions.
4. **Single-flight session refresh + multi-tab logout sync** eliminate the most common token-handling failure modes.
5. **Destructive actions require typed confirmation**: no one-click "delete" / "revoke" / "disconnect".
6. **Browser security headers are tight**: HSTS preload, COOP/CORP same-origin, Permissions-Policy default-deny, CSP with frame-ancestors none.
7. **Dependency posture is monitored and acted on**: 4 of 6 npm audit findings resolved this phase; the remaining 2 have a dependabot PR in flight.
8. **Tenant-isolation gaps are documented and tracked**: 4 of 6 known gaps resolved this phase; 2 open with explicit ownership.

The platform is not yet SOC 2 Type II certified (founding stage). The architecture, however, is consistent with what a SOC 2 control set would require — defense-in-depth, immutable audit, tenant-bounded data flows, deterministic auth lifecycle.
