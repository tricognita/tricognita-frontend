# Tricognita Workflow Engine

**Audience:** SOC operators, customer engineering, internal engineering.
**Companion to:** `docs/INTEGRATIONS.md`, `docs/OPERATIONAL_RUNBOOK.md`, `docs/SECURITY_TENANT_AUDIT.md`.
**Last reviewed:** Phase 13, 2026-05-22.

This document covers the SOC operational layer: incident lifecycle, analyst queue, notification routing, and the surfaces that knit them together.

---

## 1. Incident lifecycle

### 1.1 States

```
   declared ──ack──▶ acknowledged ──resolve──▶ resolved
        │                                          ▲
        └──────────────resolve─────────────────────┘
```

- **active** — declared but not yet acknowledged.
- **acknowledged** — an operator has accepted responsibility but the incident is still open.
- **resolved** — terminal state; moves to the resolved history list (LTRIM 50).

Resolving an active incident skips acknowledged; both transitions are valid and audited.

### 1.2 Workflow fields

Every incident carries:

| Field | Type | Purpose |
|---|---|---|
| `severity` | info \| minor \| major \| critical | Current understanding |
| `scope` | platform \| tenant \| subsystem | Blast-radius classification |
| `assigned_to` | email \| null | Who owns the response |
| `escalation_level` | 0–3 | 0 unescalated → 3 executive |
| `severity_history` | array | Every severity transition with `from/to/ts/by` |
| `linked_findings` | string[] | Cross-ref to /dashboard/findings |
| `linked_attack_paths` | string[] | Cross-ref to /dashboard/attack-graph |
| `notes` | IncidentNote[] | Operator handoff trail |

Every state-changing operation appends a note so the timeline survives.

### 1.3 Endpoint operations

```
PATCH /api/admin/incidents?id=<id>&op=ack
PATCH /api/admin/incidents?id=<id>&op=resolve
PATCH /api/admin/incidents?id=<id>&op=note      body: {note}
PATCH /api/admin/incidents?id=<id>&op=assign    body: {assign_to: email|null}
PATCH /api/admin/incidents?id=<id>&op=escalate  body: {escalation: 0|1|2|3, note?: reason}
PATCH /api/admin/incidents?id=<id>&op=severity  body: {severity: info|minor|major|critical}
PATCH /api/admin/incidents?id=<id>&op=link      body: {link_kind: finding|attack_path, link_id}
```

All ADMIN-only at the BFF gate. Every successful op logs `incidents.updated { incident_id, op, new_state }` at info level with the request id.

---

## 2. SOC surfaces

| Surface | Purpose | Refresh | Width |
|---|---|---|---|
| `/dashboard/soc` | Live triage dashboard — active incidents + critical findings + platform posture | 15 s | wide |
| `/dashboard/queue` | Unified analyst queue across incidents + findings | 30 s | default |
| `/dashboard/incidents` | Full incident management — declare, assign, escalate, note | 30 s | wide |
| `/dashboard/executive` | 30-second CISO read | 5 min | default |

### 2.1 SOC dashboard (`/dashboard/soc`)

High-density operator view. Designed for the analyst-on-shift opening the platform first thing in the morning or during an active incident.

**Above the fold:**
- 4 hero KPIs (active incidents / critical findings / high findings / platform)
- Active incidents card with **quick-ack** and **quick-assign** buttons (no detour to /incidents)
- Top critical findings (links to filtered findings view)
- Recent platform events Timeline (ADMIN-only)

**Empty states:**
- "Nothing to triage" with bordered Inbox icon when active incidents = 0 AND critical findings = 0 (the "clean shift" signal).

### 2.2 Analyst queue (`/dashboard/queue`)

Unified triage view normalizing incidents + OPEN HIGH/CRITICAL findings into a single priority-sorted list.

**Priority formula:**
```
priority = severity_base + escalation_boost + risk_score_boost
where:
  severity_base    = 100 critical, 80 high, 50 medium, 30 info
  escalation_boost = 10 × incident.escalation_level
  risk_score_boost = min(20, finding.risk_score / 5)
```

**SLA chips** (informational, not server-enforced):
- Critical incident, age > 1h → SLA breach (danger badge)
- Critical anything, age > 4h → SLA breach
- Anything, age > 24h → Aging (warning badge)
- Otherwise → on track (no chip)

**Filters:** kind (incident/finding/all), critical-only toggle, assigned-to-me toggle.

### 2.3 Incidents (`/dashboard/incidents`)

Full management surface. Master/detail layout:

- **Master**: interactive table with filters (state × severity × assignment).
- **Detail**: selected incident pane with all workflow controls (declare-style header → state badges → owner card → lifecycle action row → note composer → Activity Timeline).

`CreateIncidentForm` collapses inline above the filter bar — no modal interrupts.

---

## 3. Notification routing

`lib/notification-routing.ts` is a pure-function decision engine. It accepts a `PlatformEvent` and returns a `RoutingDecision`; the caller fan-outs to the actual dispatch legs.

### 3.1 Severity → channels (default)

| Severity | Channels |
|---|---|
| `critical` | in_app + email + webhook + page |
| `major` | in_app + email + webhook |
| `minor` | in_app + webhook |
| `info` | in_app only |

### 3.2 Quiet-hours policy

Per-tenant config:

```ts
{
  timezone: "Asia/Kolkata",
  start_hour: 22,
  end_hour: 7,
  threshold: "major",       // events ≥ this are NEVER suppressed
  suppress_channels: ["email", "webhook"]  // optional; defaults to these
}
```

- IANA timezone-aware (uses `Intl.DateTimeFormat`).
- Handles wraparound (22:00 → 07:00).
- Bad timezone fails **open** (does NOT silently drop events) — outage in tz handling shouldn't break critical alerts.

### 3.3 Severity inference

The `inferSeverity(event)` helper maps every event type to a routing severity:

- Incident events → use payload severity directly.
- Finding events → CRITICAL→critical, HIGH→major, MEDIUM→minor.
- Scan/remediation failures → major.
- Platform degraded → major.
- Settings/credential/api-key changes → minor (audit-relevant but not page-worthy).
- Recovery + scan.completed → info.

### 3.4 Integration legs

| Channel | Producer |
|---|---|
| `in_app` | `lib/notify.ts:notify()` writes to per-tenant Redis list |
| `email` | `lib/notify.ts:notify()` SES dispatch with retry + fallback |
| `webhook` | `lib/webhook-dispatch.ts:dispatchEvent()` (Slack/Jira/SIEM) |
| `page` | future PagerDuty integration (reserved) |

The routing module makes no outbound calls. Each channel has its own retry + dedup + history surface; see `docs/INTEGRATIONS.md` for webhook retry policy.

---

## 4. Workflow reliability

| Concern | Mechanism |
|---|---|
| State consistency | Each PATCH op reads-modifies-writes the full incident record under a single Redis SET — no partial mutations. |
| Audit continuity | Every state change appends to `notes`; the activity Timeline is the canonical timeline. |
| Multi-user safety | Last-writer-wins on the JSON record. Two concurrent escalations would overwrite each other's notes but neither would be silently lost (BFF logs every op). For high-concurrency tenants, the model is `Phase 14` for optimistic-concurrency tokens. |
| Notification delivery | Severity-based channels; quiet-hours respects threshold; failed webhook → retry queue (Phase 12). |
| Escalation correctness | `escalateIncident()` enforces 0–3 range; logs reason; appends note. |
| Assignment persistence | `assigned_to` is part of the incident record; refresh + multi-tab sync are SWR-driven. |

---

## 5. Where the SOC operator looks

| Question | Where |
|---|---|
| "What's on fire right now?" | `/dashboard/soc` — KPI + active incidents card |
| "What should I triage next?" | `/dashboard/queue` — priority-sorted |
| "Who owns this incident?" | `/dashboard/incidents` → detail pane |
| "Did the notification fire?" | `/dashboard/admin/operations` (admin) → webhook history (Phase 12) |
| "When did this incident escalate?" | Activity Timeline on the incident detail |
| "Which findings caused this incident?" | Detail pane → linked findings section |

---

## 6. Roadmap (Phase 14+)

- Optimistic-concurrency tokens on incident PATCH ops.
- PagerDuty integration (the `page` channel).
- Per-user notification preferences (do-not-disturb on specific event types).
- Incident postmortem template + auto-generation from the activity Timeline.
- Linked attack-path drill-in from the incident detail pane.

Last reviewed: 2026-05-22 (Phase 13).
