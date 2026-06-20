# Tricognita Roadmap

> Last reviewed: 2026-05-23
>
> This roadmap reflects the public scope only. Internal operational
> work, customer-specific commitments, and dated commercial milestones
> are tracked separately.

## Where the platform is today

Tricognita is a multi-tenant cloud security posture management (CSPM) platform with AI-assisted remediation, currently in active pilot phase. The public surface includes:

- A multi-role dashboard (admin / SecOps / auditor / SOC lead / cloud engineer / red teamer / FinOps / client / viewer).
- Three-layer RBAC with HMAC-signed sessions, JIT tokens for upstream API calls, and tenant-isolated storage.
- Workflow engine for incidents, analyst queue, SOC operations, finding triage, remediation approval.
- Webhook delivery with Stripe-style HMAC signing, retry queue, dead-letter handling, Slack adapter.
- Product telemetry with privacy-by-construction (hashed identifiers, no PII).
- Usage accounting + plan-tier catalog as data; lifecycle stage derivation.
- Feedback inbox + commercial overview + product insights consoles.

## What's next

### Near-term (this quarter)

- **Pilot polish.** Onboarding checklist, scan progress indicators, bulk-action finding triage. These three remove the biggest friction points pilot users hit in the first 24 hours.
- **Design partner activation.** Demo mode with deterministic synthetic data, guided tour overlay, lead capture funnel. Public marketing pages for Trust Center, How It Works, audience-specific pages.
- **Soft-launch governance.** OSS contributor docs, "good first issue" labels, public roadmap (this file).

### Mid-term (next quarter)

- **Self-serve billing.** Stripe wiring, per-tier usage enforcement at quota cap, annual vs monthly toggle, pro-rated upgrades. Unblocks paid conversion without bespoke contracts.
- **MSSP foundations.** Cross-customer unified queue, customer roster with health summary, cross-tenant search for analysts authorized across customers. Opens the MSSP segment.
- **Compliance milestones.** SOC 2 Type II completion (in progress with external auditor). Public status page.

### Longer-term

- **Customer-managed KMS (BYOK).** Currently all key material is platform-managed; enterprise customers in regulated industries will need BYOK.
- **Multi-region active-active.** Single-region today; multi-region failover for global enterprise tier.
- **Per-pattern auto-approve policies.** Volume-handling for remediation approvals — orgs with 50+ daily proposals need policy-driven automation, still audit-logged, with auto-pause if a pattern fails N times.
- **Self-hosted exploration.** SaaS only today; self-hosted may become viable for regulated customers if demand justifies the engineering effort.

## Explicitly NOT planned

- **No browser-extension footprint.** Tricognita is a security control plane, not a runtime agent.
- **No agent-based scanning** that requires installing software on customer infrastructure. Cross-account IAM federation only.
- **No collection of PII beyond hashed user identifiers.** This is a privacy commitment, not a feature gap.
- **No autonomous remediation by default.** ARIA's `AUTONOMOUS` mode exists but is opt-in per tenant; the default and customer-facing mode is `MANUAL_APPROVAL`.

## How priorities are set

Three signals, in order:

1. **Customer impact** — feedback from pilots + design partners (captured via the in-product feedback widget).
2. **Security / compliance gaps** — items raised during procurement security reviews.
3. **Platform debt** — engineering can name and quantify the cost.

Items that don't fit one of these three are usually deferred until they do.

## How to influence the roadmap

- **As a user / pilot:** use the in-product feedback widget. Categorized signals (onboarding, workflow, UI confusion, deployment, integration, general) land in the founder's inbox.
- **As an enterprise prospect:** quarterly roadmap review available. Feature requests tied to contract milestones get prioritized.
- **As an OSS contributor:** open an issue describing the use case. Discussion happens publicly; merged contributions ship in the next release-sync window.
- **As a design partner:** direct conversation with the founder. Your usage shapes the next near-term iteration.

## Versioning

The repository is pre-1.0. Releases follow semver:

- `0.x.0` — public OSS release windows, typically monthly during pilot phase.
- `0.x.y` — bug-fix releases as needed between minor versions.
- `1.0.0` will mark the first generally-available enterprise tier with self-serve billing.

The internal engineering repository runs continuously; the public OSS repository is updated on a release cadence via the documented sync process. Each public release is a deliberate, sanitized cut.
