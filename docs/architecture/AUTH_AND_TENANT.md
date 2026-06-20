# Auth + Tenant Model

> How sessions are signed, how RBAC is enforced, and how tenant isolation works at four independent layers.

## Authentication flow (login → session)

```mermaid
sequenceDiagram
    actor U as User
    participant L as /login UI
    participant A as /api/auth/login
    participant DB as Users (Postgres)
    participant J as lib/auth.ts (HMAC)
    participant R as Redis (jti revocation)
    participant C as Browser cookie

    U->>L: email + password
    L->>A: POST credentials
    A->>DB: verifyPassword(email, password)
    DB-->>A: User record
    A->>J: signSession({email, role, tenantId, jti, uat})
    J-->>A: signed cookie value
    A->>R: SADD jti to revocation set (Phase later)
    A->>C: Set-Cookie trico_session (15min) + trico_refresh (7d)
    C-->>U: cookie persisted
    Note over U,C: Subsequent requests carry the cookie automatically.
```

**What's in the session payload:**

```ts
{
  email: string,        // user identity
  role: Role,           // ADMIN, SECOPS, AUDITOR, ...
  tenantId: string,     // tenant scope
  exp: number,          // Unix seconds expiry
  iat: number,          // issued-at
  jti: string,          // unique token id (revocation key)
  uat: string,          // SHA-256(userAgent, 16 chars) — client binding
}
```

**What's NOT in the session payload:**
- No plaintext password (obviously).
- No customer cloud credentials.
- No personally identifying data beyond email.

## Session verification on every request

```mermaid
sequenceDiagram
    actor U as User
    participant C as Browser cookie
    participant MW as middleware.ts (edge)
    participant J as lib/auth.ts
    participant R as Redis (jti check)
    participant H as Route handler

    U->>C: navigate / click
    C->>MW: request + cookie
    MW->>J: verifySession(cookie)
    J->>J: HMAC verify
    J->>R: jti in revocation set?
    R-->>J: no
    J-->>MW: session valid
    MW->>MW: ROLE_ROUTES check
    alt path allowed for role
        MW->>H: forward request
    else not allowed
        MW-->>U: 403
    end
```

Three checks happen at the edge before any handler runs:

1. **HMAC verification** — cookie tampering invalidates.
2. **Revocation check** — `jti` lookup in Redis revocation set (post-logout-everywhere).
3. **Role check** — path-prefix to allowed-roles via `ROLE_ROUTES`.

## Refresh-token rotation

```mermaid
sequenceDiagram
    actor U as User
    participant C as Browser cookie
    participant API as /api/auth/refresh
    participant J as lib/auth.ts

    Note over U,C: Session cookie expires after 15 min.
    U->>C: next request after expiry
    C->>API: POST with refresh cookie (still valid for 7d)
    API->>J: verifyRefresh
    J-->>API: valid
    API->>J: signSession (new jti)
    API->>J: signRefreshToken (new jti — rotation)
    J-->>API: both new
    API->>C: Set-Cookie both rotated
    C-->>U: transparent — no user action needed
```

**Refresh rotation is the design** — each refresh issues a new refresh token, invalidating the previous. A stolen refresh token can only be used until the legitimate user next refreshes.

The refresh cookie is scoped `Path=/api/auth/refresh` + `SameSite=Strict` — tighter than the session cookie's `SameSite=Lax`.

## Three-layer RBAC

```mermaid
flowchart TB
    Request[HTTP request]

    subgraph Layer1["Layer 1 — Edge middleware"]
        MW[middleware.ts<br/>ROLE_ROUTES for /dashboard/*<br/>ADMIN_API / SECOPS_API / AUDITOR_API for /api/*]
    end

    subgraph Layer2["Layer 2 — BFF handler"]
        Handler[Per-route handler<br/>if session.role !== ADMIN: return 403<br/>else proceed with session.tenantId]
    end

    subgraph Layer3["Layer 3 — Page guard"]
        Guard[PageRestrictedGuard<br/>capability check + entitlement check]
    end

    Request --> Layer1
    Layer1 -->|allowed| Layer2
    Layer2 -->|allowed| Layer3
    Layer3 -->|allowed| Render[Render]

    Layer1 -.->|denied| Deny1[403]
    Layer2 -.->|denied| Deny2[403]
    Layer3 -.->|denied| Deny3[Empty state with explanation]

    classDef gate fill:#7f1d1d,stroke:#ef4444,color:#fff
    class MW,Handler,Guard gate
```

**Why three layers and not one:**

- **Layer 1** rejects unauthorized requests before any application code runs (cheap, fast, broad).
- **Layer 2** enforces context-specific rules (e.g., "ADMIN of THIS tenant" vs "ADMIN of any tenant").
- **Layer 3** gives the user a recoverable empty state ("your plan doesn't include this") instead of a 403.

A bug in any one layer is contained by the other two.

## Role hierarchy

```mermaid
flowchart TB
    Admin[ADMIN]
    Secops[SECOPS]
    Auditor[AUDITOR]
    Viewer[VIEWER]
    SOCLead[SOC_LEAD]
    DevSecOps[DEVSECOPS]
    CloudEng[CLOUD_ENGINEER]
    RedTeam[RED_TEAMER]
    FinOps[FINOPS_ANALYST]
    Client[CLIENT]

    Admin --> Secops
    Secops --> Auditor
    Auditor --> Viewer

    Admin -.specialty.-> SOCLead
    Admin -.specialty.-> DevSecOps
    Admin -.specialty.-> CloudEng
    Admin -.specialty.-> RedTeam
    Admin -.specialty.-> FinOps
    Admin -.specialty.-> Client

    classDef tier fill:#1e3a8a,stroke:#3b82f6,color:#fff
    classDef specialty fill:#7c2d12,stroke:#ea580c,color:#fff

    class Admin,Secops,Auditor,Viewer tier
    class SOCLead,DevSecOps,CloudEng,RedTeam,FinOps,Client specialty
```

The linear hierarchy (ADMIN > SECOPS > AUDITOR > VIEWER) is for general escalation. Specialty roles (SOC_LEAD, DEVSECOPS, etc.) have explicit allow-lists per route — they don't inherit linearly.

## Tenant isolation — the four layers

```mermaid
flowchart TB
    subgraph Layer1["Layer 1 — Session cookie"]
        Cookie[Signed claim: tenant_id<br/>HMAC tampering invalidates]
    end

    subgraph Layer2["Layer 2 — BFF route"]
        BFF[Handler reads session.tenantId<br/>NEVER from request body or query]
    end

    subgraph Layer3["Layer 3 — Go API"]
        Go[JIT token claim: tenant_id<br/>BFF mints token with session.tenantId]
    end

    subgraph Layer4["Layer 4 — Database"]
        DB[Every query: WHERE tenant_id = $1<br/>Foreign key constraint]
    end

    Layer1 --> Layer2 --> Layer3 --> Layer4

    classDef layer fill:#0f766e,stroke:#14b8a6,color:#fff
    class Cookie,BFF,Go,DB layer
```

**Why four independent layers:**

- A bug in the BFF (forgets to pass tenant) is caught by the Go API check.
- A bug in the Go API (accepts wrong tenant) is caught by the DB constraint.
- A compromised session cookie (forged tenant) fails at HMAC verification.
- All four would have to fail simultaneously for cross-tenant data leakage.

## Tenant isolation in the client cache

```mermaid
sequenceDiagram
    actor U as User
    participant L as ClientLayout
    participant TB as TenantBoundary
    participant SWR as SWR cache
    participant API as /api/auth/me

    U->>L: navigate
    L->>API: useSession() → /api/auth/me
    API-->>L: { tenantId, role, ... }
    L->>TB: tenantId
    TB->>TB: compare to previous tenantId

    alt tenantId unchanged
        TB-->>SWR: no-op
    else tenantId changed
        TB->>SWR: mutate() — flush all keys
        SWR-->>SWR: clear cache
        SWR-->>L: empty — refetch from clean state
    end
```

`<TenantBoundary />` in `app/dashboard/ClientLayout.tsx` is the client-side defense — even if the server side somehow served the wrong tenant's data once, the client cache is wiped on tenant transition.

## Admin-platform routes (intentionally cross-tenant)

A small set of admin routes operate at the platform level. They're documented in [`BOUNDARY_VERIFICATION.md`](../../docs/internal/BOUNDARY_VERIFICATION.md) (internal). The pattern:

| Route | Cross-tenant scope | Why |
|---|---|---|
| `/api/admin/incidents` | All platform incidents | Incidents are platform-level operational events |
| `/api/admin/exports/siem.ndjson` | Platform event feed | SIEM operator pull surface |
| `/api/admin/webhook-drain` | Platform retry queue | Cron-triggered queue maintenance |
| `/api/admin/health-aggregate` | Platform subsystems | No per-tenant data returned |
| `/api/admin/insights` | Platform telemetry aggregates | No raw events; counts only |
| `/api/admin/commercial` | Per-tenant plan + usage | Founder operating view |
| `/api/admin/leads` | Marketing leads | Founder operating view |
| `/api/admin/pilot-health` | Per-tenant risk | Founder operating view |
| `/api/admin/feedback` | Cross-tenant feedback | Founder triage view |

Properties common to all of these:

1. **ADMIN role required** (middleware + per-handler check).
2. **No customer asset data returned** — only aggregate counts, lifecycle stage, feedback envelopes (no message bodies cross tenant).
3. **Audit-logged** — every admin action is recorded.

## Webhook auth (outbound only)

```mermaid
sequenceDiagram
    participant Event as Platform event
    participant Disp as lib/webhook-dispatch.ts
    participant Sig as HMAC signer
    participant Cust as Customer endpoint

    Event->>Disp: dispatchEvent(event)
    Disp->>Disp: lookup subscriptions for event.type
    Disp->>Sig: signPayload(secret, body)
    Sig-->>Disp: t=ts,v1=hex
    Disp->>Cust: POST event body<br/>X-Tricognita-Signature header
    Cust->>Cust: verify signature (constant-time)
    Cust-->>Disp: 2xx (success)

    Note over Disp,Cust: On failure: retry queue<br/>30s, 5m, 30m, 2h (5 max)<br/>then dead-letter
```

We send webhooks; we never receive them. No inbound webhook endpoint exists to attack.

Customer-side verification example is in `docs/INTEGRATIONS.md`. The recommended pattern:
1. Reject signatures with timestamp older than 5 minutes (replay defense).
2. Use constant-time comparison on the signature.
3. Reject anything that fails either check; don't try to "recover."

## Production safety primitives

The auth + tenant model is the load-bearing security layer. Three commitments hold across every code change:

1. **Sessions are stateless to verify** but **revocable in real time** via Redis jti set.
2. **Tenant scope comes from the verified session**, never from the request body or query string.
3. **All cross-tenant admin routes** explicitly check `session.role !== "ADMIN"` per handler, on top of the middleware path-prefix gate.

These three are non-negotiable. Any change that weakens any of them should fail review.

Last reviewed: 2026-05-23 (Phase 23).
