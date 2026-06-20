# Tricognita Integrations Guide

**Audience:** customer engineering, integration partners, internal engineering.
**Companion to:** `docs/SECURITY_ARCHITECTURE.md`, `docs/PRODUCTION_READINESS.md`.
**Last reviewed:** Phase 12, 2026-05-22.

This document is the canonical reference for everything that touches the outbound integration boundary: webhooks, Slack, SIEM, exports.

---

## 1. Event envelope (canonical)

Every event Tricognita emits — to webhooks, to the SIEM stream, to the audit chain — uses the same outer envelope. Modeled on the CloudEvents spec so you can map it to AWS EventBridge, Knative, Eventarc, etc. directly.

```json
{
  "id": "evt_lh3z9k5t_a1b2c3d4e5f6g7h8",
  "envelope_version": 1,
  "type": "scan.completed",
  "version": 1,
  "tenant_id": "demo-tenant-prod",
  "actor": { "email": "soc-lead@demo-tenant.example.com", "role": "SOC_LEAD" },
  "occurred_at": "2026-05-22T14:32:08.123Z",
  "correlation_id": "a1b2c3d4e5f6",
  "data": {
    "scan_id": "scn_2026-05-22-0042",
    "findings_count": 12,
    "critical_count": 2,
    "high_count": 5,
    "duration_ms": 8432,
    "simulated": false
  }
}
```

**Field invariants:**

| Field | Notes |
|---|---|
| `id` | Globally unique, time-sortable. Use this for deduplication. |
| `envelope_version` | Bumped only on structural changes to the wrapper. Currently 1. |
| `type` | Typed enum (see §2). |
| `version` | Per-`type` schema version. Branch on this when consuming. |
| `tenant_id` | `null` for platform-level events. |
| `actor` | `null` for system-emitted events. |
| `correlation_id` | BFF request id; allows cross-tier debugging. |

---

## 2. Event types

The full registry lives in `lib/events.ts`. The current catalog (Phase 12):

| Namespace | Types |
|---|---|
| `scan.*` | `queued`, `started`, `completed`, `failed` |
| `finding.*` | `created`, `resolved`, `suppressed` |
| `remediation.*` | `proposed`, `approved`, `rejected`, `executed`, `failed` |
| `incident.*` | `declared`, `acknowledged`, `resolved` |
| `credentials.*` | `connected`, `tested`, `removed` |
| `api_key.*` | `created`, `revoked` |
| `settings.*` | `healing_mode_changed`, `aria_threshold_changed` |
| `compliance.*` | `score_changed` |
| `platform.*` | `degraded`, `recovered` |

Subscribe to a single type (`scan.completed`) or a wildcard (`scan.*`).

---

## 3. Outbound webhooks

### 3.1 Subscription model

`/dashboard/integrations/webhooks` (Phase 13 UI; CRUD API exists at `/api/admin/webhooks` today):

- Tenant-scoped — each tenant manages its own subscriptions.
- One subscription = one event type + one target URL.
- HMAC-SHA256 secret generated at creation; shown **once**.
- States: `enabled` | `disabled`.

### 3.2 Signature verification

Every outbound delivery sets:

```
X-Tricognita-Signature: t=<unix_ts>,v1=<hex_signature>
X-Tricognita-Event-Type: scan.completed
X-Tricognita-Event-Id:   evt_lh3z9k5t_a1b2c3d4
X-Tricognita-Delivery-Attempt: 1
```

Modeled on Stripe's webhook signature header — any customer who's integrated Stripe webhooks already has the verification pattern.

**Verification (Node.js example):**

```js
import crypto from "crypto";

function verify(req, secret) {
  const header = req.headers["x-tricognita-signature"];
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (!parts.t || !parts.v1) return false;
  const signedPayload = `${parts.t}.${req.rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}
```

**Reject the request if:**
- Signature header is missing.
- HMAC doesn't match.
- `parts.t` is more than 5 minutes old (replay defense).

### 3.3 Retry policy

| Attempt | Delay |
|---|---|
| 1 | immediate |
| 2 | +30 s |
| 3 | +5 min |
| 4 | +30 min |
| 5 | +2 h |
| 6+ | **dead-letter** (visible in admin UI) |

A subscription's `consecutive_failures` field tracks repeated failures. After dead-lettering, the subscription stays enabled but operators are alerted via the platform notification feed.

### 3.4 Idempotency contract

Tricognita **may** deliver the same event more than once (retry, drain race, etc.). Consumers MUST deduplicate by `event.id`. The id is monotonically time-sortable so a 24-hour window of recent ids is sufficient.

### 3.5 Delivery history

`/dashboard/admin/operations` surfaces per-subscription history (last 50 attempts) and the dead-letter queue. Programmatic access via the (future) `/api/admin/webhooks/<id>/history` endpoint.

---

## 4. Slack integration

### 4.1 Setup (5 minutes)

1. Slack admin → https://api.slack.com/apps → "Create New App" → "From scratch"
2. Choose your workspace, app name (e.g. "Tricognita Alerts")
3. **Incoming Webhooks** → toggle on → **Add New Webhook to Workspace**
4. Pick the destination channel (`#sec-alerts`, `#oncall`, etc.); click Allow.
5. Copy the URL: `https://hooks.slack.com/services/T.../B.../...`
6. Paste into Tricognita: **`/dashboard/integrations/slack`** (Phase 13 UI; today this requires the generic webhook form at `/api/admin/webhooks` POST with that URL).
7. Pick the event types you want delivered.

Tricognita detects Slack URLs by hostname (`hooks.slack.com`) and automatically formats payloads as Block Kit. The customer never has to write a Slack adapter.

### 4.2 What customers see

- **scan.completed**: header + KPI grid (findings/critical/high/mode) + deep link to findings.
- **finding.created**: severity emoji + resource + risk score + deep link.
- **remediation.\***: action id + target ARN.
- **incident.declared**: severity + scope.
- **platform.degraded**: heads-up to the channel; **platform.recovered** clears.

Every Slack message includes a context block with actor, tenant, event id, and correlation id — operators reading the channel can immediately correlate to BFF logs.

---

## 5. SIEM export

### 5.1 NDJSON pull mode

`GET /api/admin/exports/siem.ndjson` (ADMIN-only) streams platform events as newline-delimited JSON.

**Configure your SIEM:**

| SIEM | Configuration |
|---|---|
| Splunk | Universal Forwarder `inputs.conf` with `sourcetype=tricognita:events`; pull every 60s. |
| Microsoft Sentinel | Custom Logs ingestion with NDJSON parser; map `type` → table partition. |
| Elastic | Filebeat with `decode_json_fields` processor; route to `tricognita-events-*` indices. |
| Datadog | Logs Custom Endpoint; map `type` → `service` tag. |
| Google Chronicle | UDM webhook ingest; map our envelope to Chronicle UDM. |

### 5.2 Filtering

```
GET /api/admin/exports/siem.ndjson?type=scan.completed&since=2026-05-22T00:00:00Z&limit=5000
```

Response headers include `X-Tricognita-Event-Count` and `X-Tricognita-Truncated` so the consumer knows whether to paginate.

### 5.3 Push mode (future)

Phase 13+: configure the SIEM as a webhook destination directly. Same dispatch infrastructure as Slack, just a different formatter.

---

## 6. Jira / ticketing (foundations)

The webhook infrastructure already supports Jira webhook ingestion. The integration model:

- Subscribe `finding.created` (severity ≥ HIGH) → webhook to Jira `POST /rest/api/3/issue`.
- The customer's webhook handler maps the Tricognita event to a Jira issue payload (we don't manage Jira credentials — bring-your-own-integration).

Phase 13: bundled Jira adapter (similar to the Slack adapter) so customers paste a Jira API token + project key instead of writing the mapping themselves.

---

## 7. Exports

The Export Center (`/dashboard/exports`) is the canonical surface. Today:

| Export | Format | Cadence | Status |
|---|---|---|---|
| Compliance posture | PDF | On-demand | Live (links to /compliance) |
| Compliance controls | CSV | On-demand | Live (`/api/export?format=csv`) |
| ARIA audit trail | CSV | On-demand | Live (links to /audit-trail) |
| Findings | CSV | On-demand | Live (links to /findings) |
| SIEM event stream | NDJSON | On-demand | Live (`/api/admin/exports/siem.ndjson`) |
| Executive briefing | PDF | On-demand | Live (links to /executive) |
| SOC 2 evidence pack | PDF | Scheduled | Enterprise-tier — contact sales |

### 7.1 Scheduled delivery (Enterprise)

The webhook dispatch infrastructure can fire scheduled exports identically to event-driven webhooks. Phase 13: UI for declaring schedules (`daily 09:00 UTC`, `weekly Mon`, etc.).

---

## 8. Automation hooks (incoming)

Tracked for Phase 13:
- `POST /api/automation/scan` — trigger a scan via API key.
- `POST /api/automation/incidents` — declare an incident programmatically (incident.declared event).
- `POST /api/automation/findings/{id}/suppress` — programmatic suppression with audit row.

All would gate on the `apiKeyManagement` entitlement (Enterprise).

---

## 9. Failure surfaces customers can read

| What | Where |
|---|---|
| "Did Tricognita try to deliver event X to me?" | `/dashboard/admin/operations` → webhook history (Phase 13 UI) |
| "Did my SIEM ingest the last hour of events?" | `X-Tricognita-Event-Count` header on the SIEM endpoint |
| "Did Slack lose a message?" | Dead-letter queue (admin UI) |
| "Why is my webhook returning 401?" | Verify signature header parse + secret correctness |

Last reviewed: 2026-05-22 (Phase 12).
