# Tricognita Documentation

Welcome. This directory is the public documentation surface for Tricognita.

## What's here

Reader-facing documentation describing what Tricognita is, how it works, and how to integrate with or evaluate it.

### Architecture & security

- **`SECURITY_ARCHITECTURE.md`** — How authentication, tenant isolation, audit, and the layered RBAC model work.
- **`SECURITY_REVIEW.md`** — Reviewer-facing security posture pack. Threat model, controls, what we do not yet certify.
- **`TELEMETRY_GOVERNANCE.md`** — What product telemetry we capture, what we do not capture, retention, privacy boundaries.

### Product & workflow

- **`WORKFLOW_ENGINE.md`** — Incident lifecycle, notification routing, SOC surfaces.
- **`INTEGRATIONS.md`** — Webhook signing format, retry policy, Slack adapter, SIEM NDJSON contract.
- **`CACHE_LIFECYCLE.md`** — Client-side cache invalidation model (SWR + tenant boundary flushing).
- **`CUSTOMER_ONBOARDING.md`** — Customer-facing onboarding walkthrough.

### Commercial

- **`PRICING_MODEL.md`** — Plan tier structure, quota dimensions, lifecycle stage thresholds, pricing philosophy during pilot phase.
- **`PROCUREMENT_FAQ.md`** — Reviewer FAQ for enterprise procurement: deployment model, support, operational guarantees.

## What's not here

`docs/internal/` contains operational tactics, exact failure-recovery procedures, scale ceiling specifics, and internal commercial assessments. It is partitioned from the public docs for security and competitive reasons. External contributors do not need it to contribute to the public OSS surface.

See `../OSS_SAFE.md` and `../PUBLIC_REPO_SCOPE.md` for the full public/private boundary rationale.

## How to read this

If you're a **customer or prospect**, start with `SECURITY_REVIEW.md` and `PROCUREMENT_FAQ.md`.

If you're an **engineer evaluating the codebase**, start with `SECURITY_ARCHITECTURE.md` and `WORKFLOW_ENGINE.md`.

If you're a **contributor**, start with `../CONTRIBUTING.md` at the repository root.
