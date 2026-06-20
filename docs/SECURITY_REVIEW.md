# Tricognita — Security Review Pack

**Audience:** External security reviewers, CISOs, procurement security teams.
**Purpose:** Single document answering the questions enterprise security reviews ask before granting a production agreement.
**Companion to:** `SECURITY_ARCHITECTURE.md` (internal architecture), `SECURITY_TENANT_AUDIT.md` (boundary evidence), `INTEGRATIONS.md` (webhook signing), `OPERATIONAL_RUNBOOK.md`.
**Last reviewed:** 2026-05-22 (Phase 14).

This pack is structured around the questions that recur in enterprise security review. Each section is short by design — supporting evidence lives in the linked internal docs.

---

## 1. Threat model overview

Tricognita is a multi-tenant cloud security posture platform. Customer data consists of: AWS/Azure/GCP asset inventories, security findings, remediation actions, audit logs, and incident workflow records. The platform never stores customer credentials in cleartext at rest — only encrypted credential material and STS-issued session tokens.

**Primary threats considered:**

| # | Threat | Primary control | Secondary control |
|---|---|---|---|
| T1 | Cross-tenant data access | tenantId enforced in every BFF route + every Postgres query | Edge middleware re-derives tenantId from session |
| T2 | Forged session / cookie tampering | HMAC-SHA256 signed cookies; UA-bound (`uat` claim) | Server-side `jti` revocation list in Redis |
| T3 | API key compromise | Hashed-at-rest (SHA-256); scoped to ADMIN-only mint | Audit event on every mint/revoke; revocation is immediate |
| T4 | Webhook spoofing toward customer | Stripe-style `t=<ts>,v1=<hmac>` signing; tenant-scoped secrets | Documented constant-time verification example |
| T5 | Webhook abuse / replay against us | Per-tenant rate limiting; CSRF Origin allow-list | All inbound webhook channels are outbound-only (we send, we don't receive) |
| T6 | Privilege escalation via BFF route | RBAC enforced in 3 layers (middleware, route handlers, page guards) | Drift between layers prevented by `ROLE_ROUTES` single source |
| T7 | Audit log tampering | Hash-linked append-only audit chain (`auditchain.go`) | Sequential block linkage detects gaps |
| T8 | DoS via unbounded resource | `maxLimiters = 50_000` cap on Go rate limiter; Redis LTRIM caps on lists | Vercel + Fly platform-level DDoS |
| T9 | Secret leak via logs | Structured logging only; no token/cookie/header bodies logged | Pre-commit + CI grep for known secret patterns |
| T10 | Supply chain (npm/Go modules) | Dependency pinning in `package-lock.json` + `go.sum` | Renovate proposes upgrades — humans review |

**Out of scope:** physical security of cloud providers (delegated to AWS/Vercel/Fly), customer endpoint security, customer IdP security.

---

## 2. Authentication boundaries

The platform has **two distinct auth systems** that share one HMAC secret (`SENTINEL_JIT_SECRET`, ≥32 bytes, enforced at startup):

### 2.1 Browser → BFF (Next.js)

- Cookie `trico_session`, HMAC-SHA256 signed, 15-minute lifetime.
- Cookie `trico_refresh`, 7-day lifetime, scoped to `/api/auth/refresh` path.
- Payload claims: `email, role, tenantId, exp, iat, jti, uat`.
- `jti` is checked against a Redis revocation blacklist on every request.
- `uat` is a 64-bit truncated SHA-256 of the User-Agent — binds the session to a client.
- Cookies are `Secure; HttpOnly; SameSite=Lax`. Production sets `Domain=.tricognita.com`.
- Refresh rotates both the session and the refresh token (token-rotation pattern) on every use.

### 2.2 BFF → Go API (JIT tokens)

- Separate HMAC-SHA256 tokens — never reuses the session cookie.
- Tier claim: `AUTO | OPERATOR | DUAL_CONTROL | CISO`.
- Scope claims: `ScopeScanRead, ScopeAuditRead, ScopeRemediationWrite, …`.
- BFF mints tokens via `frontend/lib/jit-token.ts` with the minimum scope required for the call.
- Go API validates tier + scope before reaching any handler.

### 2.3 Origin enforcement

- BFF middleware enforces an `Origin` allow-list: `tricognita.com`, `www.tricognita.com`.
- Direct-to-Fly traffic from anything other than the Vercel BFF is rejected by `CLOUDFLARE_SHARED_SECRET` header. `/healthz`, `/readyz`, `/` exempt.

---

## 3. Tenant isolation

Tenant isolation is enforced at **four layers**, with no single layer being load-bearing:

1. **Session:** `tenantId` is a signed claim in every session cookie. Tampering invalidates the cookie HMAC.
2. **BFF:** Every BFF route reads `tenantId` from the verified session and passes it explicitly to downstream calls — never from query/body.
3. **Go API:** Every Postgres query includes `WHERE tenant_id = $1`. The same `tenantId` is on the JIT claim.
4. **Database:** Every customer-data row carries `tenant_id` as a foreign key. No row is queryable without it.

Evidence: `docs/SECURITY_TENANT_AUDIT.md` lists every table + every read/write path with tenant-scoping verified.

**TenantBoundary component** in `app/dashboard/ClientLayout.tsx` flushes the SWR client-side cache when `tenantId` changes (defensive against impersonation mid-session).

---

## 4. Webhook security model

**We send webhooks; we do not receive them from customers.**

Outbound webhook delivery (`lib/webhook-dispatch.ts`):

- Signed with HMAC-SHA256, Stripe-style header: `X-Tricognita-Signature: t=<unix_ts>,v1=<hex>`.
- Secret is per-subscription, generated server-side, displayed once on creation, never logged.
- Signed payload is the raw request body (not JSON.stringify result).
- Customers must verify signatures **and** verify the timestamp is within 5 minutes to mitigate replay.
- Customer verification example in `INTEGRATIONS.md §4`.

**Failure handling:**

- 4xx response → marked permanent failure, no retry. Goes to dead-letter.
- 5xx / network failure → retry with exponential backoff: 30s, 5m, 30m, 2h (max 5 attempts).
- Retry queue is drained by cron-triggered admin route requiring `CRON_SECRET` Bearer auth.
- Dead-letter list capped at 200 entries (LTRIM).
- Per-subscription history capped at 50 entries (LTRIM).

**Slack adapter** (`lib/integrations/slack.ts`) detects `hooks.slack.com` URLs and formats payloads as Block Kit. Slack signing happens via Slack's own incoming webhook contract (URL is the secret).

---

## 5. Auditability guarantees

Every state change is audit-logged:

- **Go API:** `LogAudit(userID, action, resource, metadata)` inserts into `audit_logs`.
- **Audit chain:** `api/auditchain.go` computes a hash-linked block for each new audit row. Each row stores the previous block's hash. Gap or hash-mismatch is detectable by a periodic verifier.
- **BFF:** `emitAuditEvent(...)` (fire-and-forget) writes operationally significant events that don't cross to Go API (settings changes, export downloads, webhook subscription edits).

**Retention:** audit logs are never deleted. They can be exported to S3 (`ARIA_AUDIT_S3_BUCKET`) for long-term archive.

**What the customer can export:**

- CSV audit log filtered by tenant + date range.
- NDJSON SIEM stream filtered by event type + since cursor.
- SOC 2 evidence pack PDF (collated audit snippets + system inventory).

---

## 6. Data handling summary

| Data category | Storage | Encryption at rest | Encryption in transit | Retention |
|---|---|---|---|---|
| Customer credentials (AWS/Azure/GCP) | Postgres + KMS-envelope | Yes (KMS) | TLS 1.2+ | Until customer removes |
| Cloud asset inventories | Postgres (Neon) | Yes (Neon-managed) | TLS | Customer-controlled; default 365 days |
| Security findings | Postgres + Redis (recent) | Yes | TLS | 365 days hot, archived to S3 |
| Audit logs | Postgres + S3 archive | Yes | TLS | Forever (never deleted) |
| Session cookies | Browser only | N/A (signed, not encrypted) | TLS (Secure cookie) | 15 min session, 7 day refresh |
| Webhook secrets | Redis (per-subscription) | At-rest by Upstash | TLS | Until subscription deleted |
| Notification feed | Redis lists, per-tenant | At-rest by Upstash | TLS | LTRIM 200 entries |
| Incident records | Redis (sorted set + JSON) | At-rest by Upstash | TLS | LTRIM 50 resolved, active forever |

**Data residency:** primary region `ap-southeast-1` (Singapore). Postgres on Neon — regional. S3 archive bucket configurable per tenant.

**Data deletion:** customer-initiated full deletion on contract termination — removes tenant rows from all tables, purges Redis keys by pattern, leaves audit logs (regulatory requirement) for the contracted retention window.

---

## 7. Secrets handling

**Where secrets live:**

- `SENTINEL_JIT_SECRET` — env var on both Vercel and Fly. Loaded once at startup. Never logged.
- `DATABASE_URL` — env var with Postgres password embedded; never logged in connection-error messages (sanitized in `db.go`).
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — env vars; the token is the bearer.
- Customer cloud credentials — Postgres + KMS envelope encryption; never returned to the BFF in cleartext.
- Webhook secrets — Redis, returned once to the customer on creation, never displayed again.
- `CRON_SECRET` — env var; Bearer required for `/api/admin/webhook-drain` and other cron routes.

**Secret rotation procedures:**

- `SENTINEL_JIT_SECRET`: documented procedure requires staged rotation (deploy with both old + new, then drop old). See `OPERATIONAL_RUNBOOK.md`.
- `DATABASE_URL`: Neon supports password rotation; coordinate Vercel + Fly env update in a single window.
- API keys: ADMIN can revoke instantly via `/api/admin/api-keys` — revocation is enforced at next request.

**What we explicitly do NOT do:**

- Do not store cleartext customer cloud credentials anywhere.
- Do not log Authorization headers, cookies, or any field whose name matches `/secret|password|token|key/i`.
- Do not include secrets in error responses returned to clients.
- Do not commit secrets to git — pre-commit + CI scan for known patterns; `.env*` is gitignored.

---

## 8. Operational logging

**Format:** every server-side log is one JSON line — parsed by Fly + Vercel log aggregators.

**Fields included:**
`ts, level, msg, request_id, tenant_id, user_id (when applicable), route, status, duration_ms, op` + structured event-specific fields.

**Fields explicitly excluded:**
`Authorization, Cookie, Set-Cookie, X-Tricognita-Signature, password, secret, token, api_key` (sanitizer in `lib/bff-log.ts`).

**Levels:**
- `info` — normal traffic, state changes.
- `warn` — recoverable degradation, retries, fallback paths taken.
- `error` — failed operation, returned 5xx or surfaced to user.

**Correlation:** every request carries an `X-Request-Id` (or generates one); BFF logs and downstream Go API logs share it. `ApiError` thrown from `lib/swr-fetcher.ts` carries the same `correlation_id` back to the UI so support requests can be traced end-to-end.

**Retention:**
- Vercel: 7 days hot, 30 days cold (Pro plan).
- Fly: 7 days hot.
- Long-term: customer-relevant events archived to S3 audit bucket forever.

---

## 9. What we cannot promise (yet)

This pack is honest about gaps. Reviewers will ask; the answer should be the same in writing and on a call.

- **SOC 2 Type II:** not yet certified. Audit in progress; expected completion timeline shared under NDA.
- **HIPAA / PCI:** not in scope today. The platform does not process PHI or cardholder data.
- **24/7 on-call:** primary on-call coverage is business hours + best-effort overnight; full follow-the-sun rotation depends on Series A staffing.
- **Multi-region failover:** the platform runs in a single Fly region today. Postgres on Neon supports read replicas; full multi-region active-active is on the roadmap.
- **Customer-managed KMS keys (CMK / BYOK):** not yet — single platform-managed KMS key today.

---

## 10. Where to verify each claim

| Claim | Verification |
|---|---|
| Tenant isolation | `docs/SECURITY_TENANT_AUDIT.md` + grep for `tenantId` and `WHERE tenant_id` |
| HMAC cookie signing | `frontend/lib/auth.ts` `signSession` + `verifySession` |
| JIT scope enforcement | `api/main.go` `jitMiddleware` + `requireScope` |
| Webhook signature format | `frontend/lib/webhook-dispatch.ts` `attemptDelivery` + `INTEGRATIONS.md §4` |
| Audit chain | `api/auditchain.go` |
| RBAC drift prevention | `frontend/middleware.ts` `ROLE_ROUTES` + `frontend/lib/auth.ts` `isRoleAllowed` |
| Production headers | `frontend/middleware.ts` security-header section + `next.config.mjs` headers() |

---

Reviewers: if a question isn't answered here, it belongs here. Email the security contact in the customer agreement for additions.

Last reviewed: 2026-05-22 (Phase 14).
