# Telemetry + Workflow Maps

> How telemetry flows through the system, and how the major user-facing workflows execute end-to-end.

## Telemetry architecture

```mermaid
flowchart TB
    subgraph Sources["Event sources"]
        Client[Client-side<br/>page_view + interactions<br/>via TelemetryTracker]
        Server[Server-side<br/>workflow events<br/>direct emitTelemetry call]
    end

    subgraph Validation["Validation + scope"]
        Route[/api/telemetry<br/>allow-list check<br/>data sanitize]
        Direct[Internal call path<br/>tenantId from verified session]
    end

    subgraph Lib["lib/telemetry.ts"]
        Emit[emitTelemetry<br/>fail-open]
        Hash[user_hash =<br/>SHA-256 truncated 16 chars]
    end

    subgraph Storage["Redis storage"]
        Raw[Raw stream LTRIM 5000]
        Tenant[Per-tenant stream LTRIM 1000]
        Daily[Daily aggregate hash<br/>TTL 90 days]
        Tenants[Active tenants set<br/>TTL 90 days]
        Users[Active users set<br/>TTL 90 days]
        Feature[Feature last-seen<br/>per event type]
    end

    subgraph Consumers["Read paths (ADMIN-only)"]
        Insights[/api/admin/insights<br/>+ /dashboard/admin/insights]
    end

    Client --> Route --> Emit
    Server --> Direct --> Emit
    Emit --> Hash --> Raw
    Hash --> Tenant
    Hash --> Daily
    Hash --> Tenants
    Hash --> Users
    Hash --> Feature
    Daily --> Insights
    Tenants --> Insights
    Users --> Insights
    Feature --> Insights

    classDef src fill:#1e3a8a,stroke:#3b82f6,color:#fff
    classDef val fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef lib fill:#065f46,stroke:#10b981,color:#fff
    classDef store fill:#7c2d12,stroke:#ea580c,color:#fff
    classDef cons fill:#0f766e,stroke:#14b8a6,color:#fff

    class Client,Server src
    class Route,Direct val
    class Emit,Hash lib
    class Raw,Tenant,Daily,Tenants,Users,Feature store
    class Insights cons
```

**Privacy properties:**

- No plaintext email — only `user_hash` (one-way truncated SHA-256).
- No IP address.
- No cookies / localStorage contents.
- No mouse / scroll / form contents.
- No third-party SDK loaded.

**Retention properties:**

- Raw stream: ~7 days at typical load (LTRIM 5000).
- Per-tenant stream: ~30 days at typical tenant load (LTRIM 1000).
- Daily aggregates: 90 days (Redis EXPIRE).
- Feature last-seen: until next emission of that type.

**Failure properties:**

- Redis-down → emissions dropped silently, logged at warn.
- User actions NEVER blocked by telemetry write failure.

For the full event taxonomy + governance rules see [`docs/TELEMETRY_GOVERNANCE.md`](../TELEMETRY_GOVERNANCE.md).

## Workflow maps

Each workflow below: **trigger → flow → output**, with the roles involved, the APIs touched, and the telemetry emitted.

### Scan workflow

```mermaid
sequenceDiagram
    actor U as User (SECOPS+)
    participant Page as /dashboard/credentials
    participant BFF as /api/scan
    participant Quota as lib/tenant-quota
    participant GoAPI as Go API
    participant Notify as lib/notify
    participant Usage as lib/usage-accounting
    participant Tel as lib/telemetry

    U->>Page: click "Scan now"
    Page->>BFF: POST /api/scan
    BFF->>Quota: acquireQuota(scan, tenantId)
    alt quota available
        Quota-->>BFF: ok
        BFF->>GoAPI: forward + JIT token
        GoAPI-->>BFF: scan result
        BFF->>Notify: notifyScanComplete
        BFF->>Usage: recordUsage(scans)
        BFF->>Tel: scan.completed
        BFF-->>Page: 200 + findings count
    else quota exceeded
        Quota-->>BFF: retry-after
        BFF-->>Page: 429
    end
```

**Roles:** SECOPS, SOC_LEAD, DEVSECOPS, ADMIN (anyone who can trigger a scan).
**APIs touched:** `/api/scan` → Go `/api/scan`.
**Telemetry emitted:** `scan.completed` OR `scan.failed`.
**Usage counters:** `scans`.

### Incident workflow

```mermaid
sequenceDiagram
    actor Op as Operator (ADMIN)
    participant Page as /dashboard/incidents
    participant BFF as /api/admin/incidents
    participant Inc as lib/incidents
    participant Redis as Redis
    participant Route as lib/notification-routing
    participant Notify as lib/notify
    participant Disp as lib/webhook-dispatch
    participant Tel as lib/telemetry
    participant Usage as lib/usage-accounting

    Op->>Page: declare / assign / escalate / resolve
    Page->>BFF: POST or PATCH
    BFF->>Inc: declareIncident / acknowledgeIncident / etc.
    Inc->>Redis: persist incident state
    Inc->>Route: notification routing decision
    Route->>Notify: in_app + email per severity
    Route->>Disp: webhook fan-out (if subscriptions)
    BFF->>Tel: incident.declared / acknowledged / etc.
    BFF->>Usage: recordUsage(incidents_declared) — POST only
    BFF-->>Page: 200 + updated incident
```

**Roles:** ADMIN.
**APIs touched:** `/api/admin/incidents`.
**Telemetry emitted:** `incident.declared`, `incident.acknowledged`, `incident.assigned`, `incident.escalated`, `incident.resolved`, `incident.noted`.
**Usage counters:** `incidents_declared` (on POST only).

### Remediation approval workflow

```mermaid
sequenceDiagram
    actor App as Approver
    participant Page as /dashboard/aria/actions
    participant BFF as /api/remediate
    participant GoAPI as Go API (ARIA)
    participant ARIA as AWS Bedrock + SageMaker
    participant Audit as audit_logs
    participant Tel as lib/telemetry

    App->>Page: view proposal
    Page->>BFF: GET proposal detail
    BFF->>GoAPI: fetch proposal + rollback plan
    GoAPI-->>BFF: full proposal
    BFF-->>Page: render

    App->>Page: click Approve
    Page->>BFF: POST approve
    BFF->>GoAPI: execute remediation
    GoAPI->>ARIA: invoke action plan
    ARIA-->>GoAPI: execution result
    GoAPI->>Audit: log execution + result
    GoAPI-->>BFF: success
    BFF->>Tel: remediation.approved
    BFF-->>Page: 200 + result

    Note over App,Audit: Rollback plan included in every proposal.<br/>Default: MANUAL_APPROVAL.<br/>AUTONOMOUS opt-in per tenant only.
```

**Roles:** SECOPS, ADMIN.
**APIs touched:** `/api/remediate`, `/api/aria/actions`.
**Telemetry emitted:** `remediation.proposed_viewed`, `remediation.approved`, `remediation.rejected`.
**Usage counters:** `remediations_approved`.

### Feedback capture workflow

```mermaid
sequenceDiagram
    actor U as User (any role)
    participant W as FeedbackWidget<br/>(dashboard floating button)
    participant BFF as /api/feedback
    participant Lib as lib/feedback
    participant Redis as Redis
    participant Tel as lib/telemetry

    U->>W: click feedback button
    W->>U: render form (category + message)
    U->>W: type + submit
    W->>BFF: POST with auto-captured page, viewport, timezone
    BFF->>Lib: submitFeedback (tenantId from session)
    Lib->>Redis: write per-tenant + admin lists
    Lib-->>BFF: stored
    BFF->>Tel: feedback.submitted
    BFF-->>W: 201
    W->>U: confirmation toast (auto-close 2s)
```

**Roles:** any authenticated user.
**APIs touched:** `/api/feedback`.
**Telemetry emitted:** `feedback.submitted`.

### Lead capture workflow (unauthenticated)

```mermaid
sequenceDiagram
    actor V as Visitor (no auth)
    participant Page as /request-demo or<br/>/pilot-application or<br/>/waitlist
    participant Form as LeadForm
    participant BFF as /api/leads (public)
    participant Lib as lib/leads
    participant Redis as Redis

    V->>Page: fill form
    Page->>Form: submit
    Form->>BFF: POST kind + name + email + context
    BFF->>BFF: validate (allow-list kind, regex email)
    BFF->>Lib: submitLead (dedup via email-hash SET NX EX)
    alt new submission
        Lib->>Redis: write entry + admin inbox
        Lib-->>BFF: stored
        BFF-->>Form: 201 + "we'll be in touch"
    else deduped (same email + kind within 1h)
        Lib-->>BFF: deduped
        BFF-->>Form: 201 + "already have your details"
    end
```

**Roles:** none (public route).
**APIs touched:** `/api/leads`.
**Telemetry emitted:** none (capturing visitor identity beyond what they submit would violate the privacy posture).

### Pilot lifecycle workflow

```mermaid
flowchart TB
    Visit[Visitor on marketing site] -->|submit form| Lead[Lead in /dashboard/admin/leads<br/>status: new]
    Lead -->|founder triage| Contact[Status: contacted]
    Contact -->|discovery call| Qualified{ICP fit?}
    Qualified -->|yes| Pilot[Pilot proposed]
    Qualified -->|no| Decline[Polite decline + referral]
    Pilot -->|signed| Tenant[Tenant created<br/>lifecycle: signed_up]
    Tenant -->|first scan completes| Activate[lifecycle: activating]
    Activate -->|integration + remediation + incident| Active[lifecycle: activated]
    Active -->|3+ months and 3+ surfaces| Engaged[lifecycle: engaged]
    Active -->|current month zero| Dormant[lifecycle: dormant]
    Dormant -->|2+ consecutive zero months| Churning[lifecycle: churning]
    Active -->|conversion call| ConvDecide{Convert?}
    ConvDecide -->|paid| Customer[Paid customer]
    ConvDecide -->|extend| Active
    ConvDecide -->|close| Close[Pilot closed]
    Engaged -->|conversion call| ConvDecide

    classDef stage fill:#0f766e,stroke:#14b8a6,color:#fff
    classDef bad fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef good fill:#065f46,stroke:#10b981,color:#fff

    class Tenant,Activate,Active stage
    class Dormant,Churning,Close bad
    class Engaged,Customer good
```

**Roles:** ADMIN (founder operates the funnel via `/dashboard/admin/leads` → `/dashboard/admin/pilot-health` → `/dashboard/admin/commercial`).
**APIs touched:** `/api/admin/leads`, `/api/admin/pilot-health`, `/api/admin/commercial`.
**Telemetry emitted:** various per stage transition.
**Lifecycle stage** derived from usage signals — see [`docs/PRICING_MODEL.md §4`](../PRICING_MODEL.md) for thresholds.

### Commercial lifecycle workflow

```mermaid
flowchart LR
    Pilot[Pilot signed<br/>Free plan] -->|conversion| Starter[Starter / Professional]
    Starter -->|outgrows quotas or features| Pro[Professional / Enterprise]
    Pro -->|outgrows or asks for special terms| Ent[Enterprise]
    Ent -.contract end.-> Renewal{Renew?}
    Renewal -->|yes| Ent
    Renewal -->|no| Cancel[Cancellation<br/>30-day grace]
    Cancel --> Delete[Data deletion<br/>per regulatory window]

    classDef tier fill:#1e3a8a,stroke:#3b82f6,color:#fff
    classDef end_ fill:#7f1d1d,stroke:#ef4444,color:#fff

    class Pilot,Starter,Pro,Ent tier
    class Cancel,Delete end_
```

**Roles:** ADMIN (founder for tier changes today; self-serve in Phase 18+).
**APIs touched:** `/api/admin/users` (for plan updates), `/api/usage` (customer view), `/api/admin/commercial` (founder view).
**Telemetry emitted:** plan-change events (when Phase 18+ self-serve ships).

## Cross-workflow observation

All workflows share three properties by design:

1. **Tenant scope from session** — every BFF route reads `session.tenantId`, never from body or query.
2. **Audit-logged** — every state change writes to `audit_logs` (via the Go API for customer data, via `emitAuditEvent` for BFF-only events).
3. **Fail-open telemetry** — Redis failure never blocks the user action; telemetry write is fire-and-forget.

These properties hold across every workflow above and across new workflows added later.

## Where to dig next

- For the auth + session detail: [`AUTH_AND_TENANT.md`](./AUTH_AND_TENANT.md)
- For module dependencies: [`DEPENDENCY_MAP.md`](./DEPENDENCY_MAP.md)
- For the public workflow engine description: [`docs/WORKFLOW_ENGINE.md`](../WORKFLOW_ENGINE.md)

Last reviewed: 2026-05-23 (Phase 23).
