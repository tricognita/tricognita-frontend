# OSS Safety & Disclosure Boundary

This document explains what is intentionally public in this repository, what stays private, and why.

## What this repository IS

A public showcase of the Tricognita frontend platform. Specifically:

- Next.js 16 + React 19 dashboard implementing a multi-tenant cloud security posture management (CSPM) workflow.
- BFF route layer with three-layer RBAC, HMAC session signing, and tenant boundary enforcement.
- Synthetic demo data so a contributor can run the full stack locally without real cloud credentials.
- Public-facing architecture and security documentation in `docs/`.
- Governance scaffolding (CONTRIBUTING, SECURITY, code of conduct, issue + PR templates).

## What this repository IS NOT

- A complete production deployment.
- A runbook for operating Tricognita in production.
- A failure-mode simulation guide.
- An inventory of production identifiers, region codes, or infrastructure topology.
- A customer-specific commercial assessment.

The above are deliberately partitioned (see `docs/internal/`) or kept entirely out of the repository.

## Public surface

### Code

- `app/` — App Router pages and BFF routes.
- `lib/` — typed library code shared between server and client. All telemetry, plan, lifecycle, and usage-accounting libs are public.
- `middleware.ts` — edge auth middleware.
- `next.config.ts` — Next.js config including security headers and CSP.
- `public/` — static assets (no production identifiers).
- `eslint.config.mjs`, `tsconfig.json`, `postcss.config.mjs` — tooling.

### Documentation (public)

- `docs/SECURITY_ARCHITECTURE.md` — how auth, tenant isolation, and RBAC work.
- `docs/SECURITY_REVIEW.md` — reviewer-facing security posture pack.
- `docs/TELEMETRY_GOVERNANCE.md` — what we capture, what we don't, why.
- `docs/WORKFLOW_ENGINE.md` — incident lifecycle + notification routing.
- `docs/INTEGRATIONS.md` — webhook signing format, retry policy, Slack adapter.
- `docs/CACHE_LIFECYCLE.md` — client cache invalidation model.
- `docs/CUSTOMER_ONBOARDING.md` — customer-facing onboarding walkthrough.
- `docs/PRICING_MODEL.md` — plan tier structure + lifecycle thresholds.
- `docs/PROCUREMENT_FAQ.md` — reviewer FAQ for enterprise procurement.

### Governance (public)

- `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
- `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`.
- `OSS_SAFE.md` (this document), `PUBLIC_REPO_SCOPE.md`.

## Private surface (NOT in this repository)

The following exist for the internal engineering team and are **not** included in or visible from the public repository:

- Production deployment procedures and runbooks.
- Exact recovery procedures per failure mode.
- Production environment configuration values (region codes, deployment names, secret rotation cadence).
- Customer-specific commercial assessments.
- Internal incident response tactics.
- Detailed scale-ceiling probing data.
- Production telemetry identifiers and aggregation queries.

These are present in `docs/internal/` for the internal team. That directory is part of the repository's working tree for the internal team's convenience but is not considered part of the public OSS surface. External contributors do not need any of it to contribute meaningfully.

## Disclosure philosophy

The same philosophy that underpins Tricognita's customer security model also applies here:

1. **Honest about gaps.** The public docs explicitly name what we do not yet certify (SOC 2 Type II in progress, no BYOK yet, no MSSP product yet). Hiding gaps in a public repo would break the trust that the product depends on.

2. **Specific where useful, general where leakage matters.** Architecture is described concretely. Production identifiers, exact thresholds, and operational tactics are described generically or moved to `docs/internal/`.

3. **Coordinated disclosure.** Security vulnerabilities are reported privately via `SECURITY.md` and disclosed publicly only after remediation.

## What changes if you discover something this document missed

If you find a public-surface artifact that you believe contains operational leakage, a real production identifier, or anything from the "private surface" list, please:

1. Do not open a public issue describing the leak.
2. Email `security@tricognita.com` with the specific file and line.
3. We will assess and rotate / sanitize as appropriate, then thank you publicly (with your permission) in the resulting fix.

## Why this boundary exists

A public OSS repository for a security product serves three legitimate purposes — none of which require exposing production internals:

1. **Engineering credibility** — show how the platform is built so developers can evaluate it.
2. **Community contribution** — allow contributors to extend, fix, and improve the platform.
3. **Reviewer transparency** — let security reviewers and procurement teams audit the architecture without an NDA.

None of these require detailed knowledge of where the platform deploys, how it recovers, or what specific customer cohorts pay. Disclosing those would harm the product and its customers without serving any of the three purposes above.
