# Tricognita — Telemetry Governance

**Audience:** Customers, security reviewers, internal engineering.
**Purpose:** Authoritative answer to "what does Tricognita capture about my usage and what happens to it?"
**Companion to:** `SECURITY_REVIEW.md`, `BOUNDARY_VERIFICATION.md`, `PROCUREMENT_FAQ.md`.
**Last reviewed:** 2026-05-22 (Phase 16).

This doc covers the **product telemetry** system added in Phase 16. It is distinct from:
- `audit_logs` (compliance / forensic record, never deleted)
- structured operational logs (Vercel / Fly log aggregators)
- the customer-pulled SIEM event feed

Customers reading this should end with a clear answer: what's captured, how long it's kept, who can see it, and how to opt out or export.

---

## 1. What we capture

### 1.1 Event taxonomy (Phase 16)

37 named event types across 9 categories. Adding a new type requires updating the `TelemetryEventType` union AND this section. The complete list:

| Category | Events |
|---|---|
| Navigation | `page_view` |
| Onboarding | `onboarding.started`, `onboarding.role_selected`, `onboarding.credentials_added`, `onboarding.first_scan_started`, `onboarding.completed` |
| Scan lifecycle | `scan.initiated`, `scan.completed`, `scan.failed` |
| Findings | `finding.viewed`, `finding.ignored`, `finding.promoted_to_incident` |
| Remediation | `remediation.proposed_viewed`, `remediation.approved`, `remediation.rejected` |
| Incidents | `incident.declared`, `incident.acknowledged`, `incident.assigned`, `incident.escalated`, `incident.resolved`, `incident.noted` |
| Exports | `export.compliance_pdf`, `export.findings_csv`, `export.audit_csv`, `export.executive_pdf`, `export.siem_ndjson`, `export.soc2_pack` |
| Integrations | `integration.webhook_created`, `integration.webhook_deleted`, `integration.slack_connected` |
| Notifications | `notification.opened`, `notification.read`, `notification.cleared` |
| Feedback | `feedback.submitted` |
| Admin | `admin.feedback_triaged`, `admin.health_aggregate_viewed`, `admin.deployment_verified` |

### 1.2 What each event carries

Every event contains exactly these fields:

```ts
{
  id: string,                 // stable event id
  type: TelemetryEventType,
  tenant_id: string,          // from verified session, never client-supplied
  user_hash: string,          // SHA-256 of lowercase(email), truncated to 16 chars
  role: string,
  occurred_at: string,        // ISO timestamp
  route?: string,             // page path (server-emitted) or visit path (client-emitted)
  data?: Record<string, primitive>  // type-specific, ≤8 fields, string values ≤200 chars
}
```

### 1.3 What we explicitly do NOT capture

- Email addresses (only the truncated hash).
- IP addresses.
- Cookie contents.
- localStorage / sessionStorage contents.
- Mouse movements, scroll depth, click coordinates.
- Time-on-page (computed at aggregate level from page_view counts).
- Form field contents.
- Cross-session fingerprinting beyond the session cookie itself.
- The bodies of API responses or scan results.

---

## 2. Tenant isolation

### 2.1 Construction-level isolation

The `emitTelemetry()` signature accepts `tenantId` from the caller, and every BFF route that calls it passes `session.tenantId` from the verified session — never from request body or query string. The client cannot forge events for a different tenant.

### 2.2 Storage isolation

| Key pattern | Scope |
|---|---|
| `tricognita:telemetry:tenant:{tenantId}` | Per-tenant raw stream — only that tenant's events |
| `tricognita:telemetry:journey:{tenantId}:{name}` | Per-tenant journey step log |
| `tricognita:telemetry:events` | Platform-wide raw stream (ADMIN view only) |
| `tricognita:telemetry:daily:*` | Platform-wide daily aggregates (ADMIN view only) |
| `tricognita:telemetry:feature:*:lastSeen` | Platform-wide dormancy detection |

The per-tenant lists are isolated; the platform-wide aggregates contain counts and set memberships only — no per-user message bodies leak across tenants.

### 2.3 Read surfaces

| Endpoint | Tenant scope |
|---|---|
| `/api/admin/insights` | Platform-wide aggregates; ADMIN-only |
| (Phase 17+) per-tenant insights | Caller's tenant only; any authenticated role |

---

## 3. Retention

| Surface | Retention | Mechanism |
|---|---|---|
| Raw event stream (platform-wide) | ~7 days at typical load | `LTRIM 0 4999` — capped at 5000 entries; older roll off |
| Per-tenant event stream | Up to ~30 days at typical tenant load | `LTRIM 0 999` — capped at 1000 entries |
| Daily aggregates (counts, tenant set, user set) | 90 days | Redis `EXPIRE` |
| Feature last-seen | Until next emission of that type | No TTL — overwritten on emit |
| Per-tenant journey log | ~per-journey | `LTRIM 0 99` — capped at 100 entries per (tenant, journey) |

**There is no long-term archive of raw telemetry events.** Long-lived analysis depends on the daily aggregates.

---

## 4. Privacy boundaries

### 4.1 Customer data residency

Telemetry events are stored in the same Redis instance as operational data. Region is the same as the rest of the platform (Singapore primary).

### 4.2 Personally identifiable data

The `user_hash` is a one-way truncated SHA-256 of the lowercased email. A reviewer with access to the user list could compute the hash for a given email and correlate; but the hash alone is non-reversible. We don't store user-hash → email mappings.

### 4.3 Customer opt-out

Today: there is no per-user telemetry opt-out. The data captured is the minimum necessary for operational visibility, and is documented here for transparency.

If a customer requires opt-out as a contract term:
- We can set a per-tenant `TELEMETRY_DISABLED` flag (Phase 17+).
- Events for that tenant are short-circuited in `emitTelemetry()` before any Redis write.
- Aggregates retain only events from non-opted-out tenants.

### 4.4 Customer access to their own telemetry

A customer ADMIN can request a per-tenant export of telemetry data. Today this is a manual support request; Phase 17+ adds `/api/admin/insights/export` as a self-serve surface.

### 4.5 Customer-initiated deletion

On tenant termination, the per-tenant Redis keys (`tricognita:telemetry:tenant:{tenantId}`, `tricognita:telemetry:journey:{tenantId}:*`) are deleted as part of the standard data-deletion procedure in `PROCUREMENT_FAQ.md §6`.

Per-tenant counts in the daily aggregate sets ARE retained (deletion of a set member would also re-introduce the user's set membership through replay — and we no longer have the events to re-derive an accurate count). The retained data is a set membership only, no event bodies.

---

## 5. Operational transparency

### 5.1 The `/dashboard/admin/insights` page

Platform-operator surface (ADMIN-only) showing exactly the aggregates Tricognita uses for product decisions. Every count visible there is the count we use internally — no hidden tier of data.

The page footer states retention, isolation, and aggregation rules so the admin can answer reviewer questions without leaving the page.

### 5.2 Failure mode

Telemetry is **fail-open**: when Redis is unavailable, emissions are dropped silently (logged at warn level on the BFF). A user action NEVER fails because telemetry couldn't be written.

Consequence: during a Redis outage, the daily aggregates undercount. This is documented in `RECOVERY_PLAYBOOK.md §2.1`.

### 5.3 Caller-visible behavior

Server-side emissions are fire-and-forget — the response is not delayed waiting for the Redis write. Client-side emissions use `fetch` with `keepalive: true` so they survive a navigation away.

---

## 6. Reviewer FAQ

**Q: Is this an analytics SDK?**
No. There is no third-party JavaScript loaded. Telemetry is written by our own code to our own Redis. No data leaves the Tricognita perimeter for telemetry purposes.

**Q: Does this feed into a third-party platform (Segment, Amplitude, Mixpanel)?**
No. There is no third-party integration for telemetry today and the design does not require one. If a customer requests a per-tenant export to their own analytics platform, that's a per-customer feature request — not a default behavior.

**Q: Could a malicious admin pull all customer event details?**
The `/dashboard/admin/insights` page returns AGGREGATES only — counts, set sizes, dormancy lists. The raw event store is not exposed via API. The Redis keys themselves are accessible only to operators with Upstash credentials. Access to Upstash is the same restricted operator-level access as access to the Postgres database — covered in `SECURITY_REVIEW.md §6`.

**Q: How does this interact with audit logs?**
Distinct systems. Audit logs are the forensic record of state changes (Postgres, never deleted). Telemetry is product-usage signal (Redis, time-bounded). The same action may produce both — e.g., a webhook subscription create produces an audit_logs row AND an `integration.webhook_created` telemetry event.

**Q: Will you commit to never expanding the taxonomy without notice?**
The taxonomy will expand as the product expands. Each addition updates §1.1 of this document. We commit to:
- Never capturing fields explicitly named in §1.3.
- Documenting any new field types in this document before deploying them to production.
- Disclosing the addition in release notes.

---

## 7. Compliance posture

| Question | Status |
|---|---|
| GDPR-style "right to access" | Per-tenant export available on request today; self-serve Phase 17+ |
| GDPR-style "right to be forgotten" | Per-tenant deletion on termination is automated; daily aggregate set membership retained per §4.5 |
| Sensitive personal data | None captured (no PII beyond user_hash) |
| Children's data | N/A — Tricognita is a B2B product |
| Healthcare data | N/A — see PROCUREMENT_FAQ on HIPAA |
| Cross-border transfer | Platform region is configurable per deployment |

---

## 8. Internal product decisions made from this data

This is the loop the system is designed to support:

1. **Adoption questions**: which features are dormant after 14 days? (`/dashboard/admin/insights → Dormant features`)
2. **Friction questions**: which feedback categories are growing? (`Feedback by category` correlated with `feedback.submitted` event counts)
3. **Workflow questions**: are incidents being resolved? (count ratio of `incident.declared` vs `incident.resolved` over the window)
4. **Operational questions**: are exports being run? (export.* counts → drives whether we invest in scheduled exports per `WORKFLOW_VALIDATION §7`)
5. **Onboarding questions**: drop-off between `onboarding.started` and `onboarding.completed` (journey log analysis, Phase 17+ dashboard)

If a question can't be answered from the current telemetry, the answer is either:
- Add a new event type (update §1.1), OR
- Direct customer conversation (the feedback widget is the cheap path).

Vanity metrics are explicitly out of scope. "Total events" is the only count that doesn't directly inform a decision; it's surfaced as a context number, not a goal.

---

Last reviewed: 2026-05-22 (Phase 16).
