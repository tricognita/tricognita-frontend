# How Tricognita Works

> Plain-English end-to-end walkthrough. Suitable for a security leader, board member, or technical evaluator who wants to understand the platform without reading code.

## The 60-second version

Tricognita is a multi-tenant cloud security platform. You grant us read-only access to your AWS / Azure / GCP environments via IAM federation. We scan continuously for posture misconfigurations and reachable attack paths. When we find something that matters, we route it through an incident workflow your team can triage. Our ARIA engine proposes specific remediation actions — including rollback plans — that your team approves before anything executes. Reporting and integrations close the loop.

The architecture is multi-tenant from the first commit, the frontend is open-source so you can verify our security claims, and our pricing is structured for security teams of 5-500 people who've outgrown native cloud tools but can't justify enterprise CSPM pricing.

## What happens when you sign up

```mermaid
flowchart LR
    Sign[Magic link] --> Login[Land on dashboard]
    Login --> Role[Pick your role]
    Role --> Connect[Connect AWS account]
    Connect --> CFN[Apply CFN template]
    CFN --> Paste[Paste IAM role ARN]
    Paste --> Scan[First scan starts]
    Scan --> Findings[Findings populate]

    classDef step fill:#0f766e,stroke:#14b8a6,color:#fff
    class Sign,Login,Role,Connect,CFN,Paste,Scan,Findings step
```

**Time from sign-up to first findings: typically 15-30 minutes.**

You apply a CloudFormation template that creates a read-only IAM role with a trust policy allowing Tricognita to assume it. You paste the role ARN into our UI. We use AWS STS to assume the role for each scan — no long-lived credentials cross the boundary.

For Azure and GCP, the equivalent OIDC / workload-identity federation patterns apply.

## What happens during a scan

```mermaid
flowchart TB
    Trigger[Scan triggered<br/>manual or scheduled] --> STS[Tricognita assumes<br/>IAM role via STS]
    STS --> Walk[Walk cloud control plane<br/>IAM, networking, storage,<br/>compute, services]
    Walk --> Evaluate[Evaluate against:<br/>CIS Benchmarks<br/>AWS Well-Architected<br/>NIST CSF<br/>attack-relevant patterns]
    Evaluate --> Findings[Findings: severity, evidence,<br/>resource, control reference]
    Findings --> Graph[Attack-path analysis:<br/>collapse findings into<br/>reachable attack chains]
    Graph --> Surface[Surface in dashboard:<br/>findings list + attack graph + queue]

    classDef step fill:#1e3a8a,stroke:#3b82f6,color:#fff
    class Trigger,STS,Walk,Evaluate,Findings,Graph,Surface step
```

We're not "scanning your VMs" — we're reading your cloud control plane (IAM, networking, storage configuration, etc.) and evaluating it against frameworks. Then we compute reachability across IAM + network + resource policy to find which findings chain into actual attack paths.

A public S3 bucket alone is a finding. The same bucket reachable through a Lambda with admin IAM is an incident. The attack graph collapses 47 findings into 6 reachable paths — that's the priority list.

## What happens when you triage a finding

```mermaid
sequenceDiagram
    actor U as Operator
    participant F as Findings page
    participant D as Finding detail
    participant I as Incidents
    participant ARIA as ARIA proposal

    U->>F: filter Critical
    U->>D: click a finding
    D->>U: severity, evidence, attack-path context
    U->>U: decide

    alt resolve
        U->>D: mark resolved + reason
        D->>F: list updates
    else accept with reason
        U->>D: dismiss with documented exception
        D->>F: removed from active
    else promote to incident
        U->>I: declare incident
        I->>U: incident detail with full workflow
    else request remediation
        U->>ARIA: ask for proposal
        ARIA->>U: action + rollback plan
    end
```

Four standard outcomes for any finding. The workflow surface gives you all four from the same detail pane.

## What happens during an incident

```mermaid
stateDiagram-v2
    [*] --> Declared: operator declares
    Declared --> Acknowledged: assigned + ack
    Declared --> Resolved: quick close
    Acknowledged --> Escalated: needs higher tier
    Acknowledged --> Resolved
    Escalated --> Acknowledged: new owner acks
    Escalated --> Resolved
    Resolved --> [*]

    note right of Declared
        Severity + scope chosen
        Notification fires per
        routing rules
    end note

    note right of Escalated
        Level 0-3
        Pages higher-tier responder
    end note
```

Every state transition is audit-logged with the operator's email and timestamp. The activity timeline is the canonical handoff record between shifts.

Notifications route per severity per routing rules. Critical incidents fan out to email + in-app + webhook + (future) PagerDuty. Major to email + in-app + webhook. Minor to in-app + webhook. Info to in-app only.

For the full incident workflow detail see [`docs/WORKFLOW_ENGINE.md`](./WORKFLOW_ENGINE.md).

## What happens when ARIA proposes a remediation

```mermaid
sequenceDiagram
    participant Finding
    participant ARIA
    participant SageMaker as SageMaker (risk scoring)
    participant Bedrock as Bedrock Agent
    actor Approver
    participant Cloud

    Finding->>ARIA: trigger proposal
    ARIA->>SageMaker: risk score the finding
    SageMaker-->>ARIA: risk + context
    ARIA->>Bedrock: ReAct loop with finding + context
    Bedrock-->>ARIA: action plan + rollback plan
    ARIA->>Approver: render proposal card
    Approver->>Approver: review action + rollback + predicted impact

    alt approve
        Approver->>Cloud: execute (via Go API + STS)
        Cloud-->>Approver: success / failure
        Note over Approver,Cloud: Audit log captures every step
    else modify
        Approver->>ARIA: edit + approve modified
    else reject
        Approver->>ARIA: reject with reason
    end
```

The default is **MANUAL_APPROVAL**. Nothing changes in your environment without an explicit human approval. Autonomous mode exists for narrow well-understood patterns (e.g., "remove public-access ACL on storage bucket") and is opt-in per tenant — most pilots stay in MANUAL_APPROVAL for their entire engagement.

Every proposal includes a **rollback plan** as a first-class field. Most CSPM tools propose actions without rollback; we don't.

## What happens with integrations

```mermaid
flowchart LR
    Event[Platform event<br/>e.g. incident.declared] --> Bus[Event bus]
    Bus --> Routing[Notification routing<br/>severity-aware]
    Routing --> InApp[In-app notification<br/>NotificationCenter bell]
    Routing --> Email[Email via SES<br/>per severity]
    Routing --> Webhook[Webhook dispatcher<br/>HMAC-signed]
    Webhook --> Slack[Slack channel]
    Webhook --> SIEM[Your SIEM]
    Webhook --> Jira[Your ticketing]
    Webhook --> Custom[Custom endpoint]

    classDef src fill:#1e3a8a,stroke:#3b82f6,color:#fff
    classDef route fill:#7c2d12,stroke:#ea580c,color:#fff
    classDef dest fill:#065f46,stroke:#10b981,color:#fff

    class Event,Bus src
    class Routing route
    class InApp,Email,Webhook,Slack,SIEM,Jira,Custom dest
```

Webhooks are signed with HMAC-SHA256 using a Stripe-style format. Your verifier rejects signatures with timestamp older than 5 minutes (replay defense). Failed deliveries retry on a documented schedule (30s, 5m, 30m, 2h — max 5 attempts) before dead-letter.

For the full integration contract see [`docs/INTEGRATIONS.md`](./INTEGRATIONS.md).

## What happens with reporting

```mermaid
flowchart LR
    State[Platform state] --> Exec[Executive dashboard<br/>30-sec CISO read]
    State --> Findings[Findings CSV]
    State --> Audit[Audit CSV]
    State --> Compliance[Compliance PDF]
    State --> SOC2[SOC 2 evidence pack]
    State --> SIEM[SIEM NDJSON stream]

    Exec --> Board[Monthly board pack]
    Findings --> Reports[Internal reports]
    Audit --> Auditor[Auditor handoff]
    Compliance --> Compliance2[Compliance program]
    SOC2 --> SOC2Auditor[SOC 2 auditor]
    SIEM --> SecOps[SecOps pipeline]

    classDef src fill:#1e3a8a,stroke:#3b82f6,color:#fff
    classDef out fill:#0f766e,stroke:#14b8a6,color:#fff

    class State src
    class Exec,Findings,Audit,Compliance,SOC2,SIEM,Board,Reports,Auditor,Compliance2,SOC2Auditor,SecOps out
```

The executive dashboard is the 30-second CISO read: posture trend, incident MTTR, remediation throughput. Exports cover the formats auditors actually ask for. The SIEM NDJSON stream is the integration most security teams want to replace their current spreadsheet-based reporting.

## What happens to your data

```mermaid
flowchart TB
    Customer[Your AWS/Azure/GCP] -->|STS AssumeRole read-only| Tricognita
    Tricognita -->|encrypted at rest| Postgres[Postgres<br/>AES-256 + KMS]
    Tricognita -->|cache + queue| Redis[Upstash Redis<br/>AES-256 at rest]
    Tricognita -->|optional archive| S3[Customer-configurable<br/>S3 bucket]

    Customer -.->|cancellation| Grace[30-day read-only grace]
    Grace -->|after grace| Delete[Data deleted<br/>except audit logs]
    Delete -->|regulatory window| AuditRetain[Audit logs retained<br/>per agreement]

    classDef secure fill:#0f766e,stroke:#14b8a6,color:#fff
    classDef offboard fill:#7f1d1d,stroke:#ef4444,color:#fff

    class Customer,Tricognita,Postgres,Redis,S3 secure
    class Grace,Delete,AuditRetain offboard
```

- **Encryption at rest:** AES-256 across Postgres (Neon-managed), Redis (Upstash-managed), S3.
- **Encryption in transit:** TLS 1.2+ everywhere, HSTS preload-eligible.
- **Long-lived credentials:** never. Customer access via STS AssumeRole only.
- **Data deletion on cancellation:** 30-day grace, then full deletion. Audit logs retained per regulatory window. Deletion certificate provided on request.

For the full data handling commitment see [`docs/SECURITY_REVIEW.md`](./SECURITY_REVIEW.md) and [`docs/TELEMETRY_GOVERNANCE.md`](./TELEMETRY_GOVERNANCE.md).

## What we DON'T do

Stating these explicitly is part of the trust posture.

| Capability | Status |
|---|---|
| Autonomous remediation by default | No — MANUAL_APPROVAL is default; autonomous is opt-in per narrow patterns |
| Browser-extension footprint | No — we don't install anything on your endpoints |
| Agent-based scanning | No — IAM federation only |
| Third-party analytics SDKs | No — no Segment / Mixpanel / Amplitude / similar loaded in browser |
| PII collection | No — only a one-way truncated SHA-256 of email for telemetry |
| Long-lived customer credentials | No — STS AssumeRole every call |
| SOC 2 Type II | Not yet — in progress with external auditor |
| HIPAA / PCI / FedRAMP | Not in scope today |
| BYOK / Customer-managed KMS | Not yet — platform-managed today; roadmap |
| 24/7 on-call | Not yet — best-effort overnight; business-hours primary |
| Multi-region active-active | Not yet — single-region today |
| Self-hosted / on-premise | Not in scope today |

## How a typical 90-day journey looks

```mermaid
gantt
    title 90-Day Customer Journey
    dateFormat YYYY-MM-DD
    axisFormat %d

    section Onboarding
    Sign up + connect first account     :a1, 2026-01-01, 1d
    First scan + findings populate      :a2, after a1, 1d
    Triage first wave of criticals      :a3, after a2, 4d

    section Activation
    Connect 2-3 more accounts            :b1, after a3, 7d
    First ARIA remediation approved      :b2, after a3, 5d
    Webhook to Slack / SIEM connected    :b3, after a3, 7d
    Team members onboarded               :b4, after a3, 14d

    section Steady state
    Weekly scans + triage cadence        :c1, after b4, 21d
    Monthly executive PDF                :c2, after b4, 30d
    Posture trending up                  :c3, after b4, 60d

    section Compliance + scale
    First SOC 2 evidence pack export     :d1, after c3, 1d
    Quarterly review                     :d2, after c3, 7d
```

Most pilots reach "steady state" within 3 weeks. Most paid customers see meaningful posture trend within 90 days.

## Where to dig in

| You're a... | Read this next |
|---|---|
| Security leader evaluating us | [`docs/SECURITY_REVIEW.md`](./SECURITY_REVIEW.md) + [`docs/PROCUREMENT_FAQ.md`](./PROCUREMENT_FAQ.md) |
| Engineer evaluating the codebase | [`docs/architecture/SYSTEM_OVERVIEW.md`](./architecture/SYSTEM_OVERVIEW.md) |
| Investor / advisor | [`docs/FOUNDING_STORY.md`](./FOUNDING_STORY.md) + [`docs/EXECUTIVE_SUMMARY.md`](./EXECUTIVE_SUMMARY.md) |
| Customer success / procurement | [`docs/PRICING_MODEL.md`](./PRICING_MODEL.md) |
| Contributor | [`CONTRIBUTOR_GUIDE.md`](../CONTRIBUTOR_GUIDE.md) + [`docs/CODEBASE_GUIDE.md`](./CODEBASE_GUIDE.md) |
| Academic / researcher | [`docs/UNIVERSITY_SHOWCASE.md`](./UNIVERSITY_SHOWCASE.md) |

Last reviewed: 2026-05-23 (Phase 23).
