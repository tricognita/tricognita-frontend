# Tricognita

> Multi-tenant cloud security posture management with AI-assisted remediation.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](./tsconfig.json)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](./CODE_OF_CONDUCT.md)

Tricognita is an AI-native cloud security platform. It scans AWS / Azure / GCP environments for posture drift, surfaces findings with attack-path context, and orchestrates remediation through a tiered approval workflow. This repository is the **public frontend** — the Next.js dashboard plus the BFF (backend-for-frontend) layer that fronts the Go API.

## What's in this repository

- **Dashboard** (`app/`) — Next.js 16 + React 19 App Router. Workflow surfaces: findings, attack graph, incidents, SOC, queue, executive reporting.
- **BFF routes** (`app/api/`) — server-side routes that handle session verification, RBAC, tenant scoping, and proxying to the Go API.
- **Middleware** (`middleware.ts`) — edge-layer auth + RBAC + CSRF defense.
- **Shared libraries** (`lib/`) — typed building blocks: telemetry, plans, lifecycle, usage accounting, feedback, webhooks, notifications.
- **Demo data** (`lib/demo-data.ts`) — synthetic dataset so local development works without real cloud credentials.
- **Documentation** (`docs/`) — architecture, security, integration, and pricing documentation. Public-safe.

## What's NOT in this repository

- Production operational tactics, deployment recovery procedures, or scale-ceiling probing data.
- Customer-specific commercial assessments.
- Real production identifiers (Fly app names, region codes, account IDs, customer ARNs, secrets).

See [`OSS_SAFE.md`](./OSS_SAFE.md) and [`PUBLIC_REPO_SCOPE.md`](./PUBLIC_REPO_SCOPE.md) for the public/private boundary rationale.

## Architecture philosophy

Tricognita's design choices around the dashboard layer:

1. **Tenant isolation enforced at four layers** — session cookie, BFF route, Go API, and database row. No single layer is load-bearing. See [`docs/SECURITY_ARCHITECTURE.md`](./docs/SECURITY_ARCHITECTURE.md).

2. **Three-layer RBAC** — edge middleware, per-route handler check, page-level guard. Adding a role-restricted route requires editing a single declarative source.

3. **Plans as data, not code branches** — plan tiers, quotas, and features live in [`lib/plans.ts`](./lib/plans.ts). Adding a tier is one object edit.

4. **Telemetry without compromises** — usage signals are captured with a truncated SHA-256 email hash; no plaintext PII, no third-party SDK, no cross-session fingerprinting. See [`docs/TELEMETRY_GOVERNANCE.md`](./docs/TELEMETRY_GOVERNANCE.md).

5. **Fail-open telemetry, fail-closed auth** — telemetry writes never block user actions; auth failures never silently succeed. The platform stays usable when Redis is down; the platform refuses to grant access when a session is invalid.

6. **Honest about gaps** — every public doc names what we do not yet support. SOC 2 Type II is in progress; BYOK is not yet shipped; self-serve billing is not yet wired. These are stated in the same docs that describe what works.

## Tech stack

- **TypeScript** strict mode end-to-end.
- **Next.js 16** App Router, React 19, React Compiler.
- **Tailwind v4** with CSS-variable design tokens.
- **SWR** for client-side cache.
- **Upstash Redis** for sessions, queues, notifications, telemetry.
- **HMAC-SHA256** for session signing and webhook delivery signing.
- **Vercel** edge runtime for middleware; Node runtime for BFF routes.

## Local development

```bash
git clone https://github.com/tricognita/tricognita-frontend.git
cd tricognita-frontend

npm install
cp .env.example .env.local
# Edit .env.local — every placeholder must be replaced.
# At minimum: SENTINEL_JIT_SECRET (≥32 bytes), SESSION_SECRET (≥32 bytes),
# DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD (≥12 chars).

npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with the demo admin credentials you set in `.env.local`. The dashboard runs against synthetic demo data; no real cloud connection is required.

If you hit issues, see [`docs/SETUP_TROUBLESHOOTING.md`](./docs/SETUP_TROUBLESHOOTING.md).

## Useful scripts

```bash
npm run dev        # development server with hot reload
npm run build      # production build
npm run lint       # ESLint with the project's flat config
npx tsc --noEmit   # type-check without emitting
```

## Contributing

We welcome contributions! Start here:

1. **Read** [`CONTRIBUTING.md`](./CONTRIBUTING.md) — setup, scope, and PR process
2. **Explore** [`docs/CONTRIBUTOR_ARCHITECTURE_MAP.md`](./docs/CONTRIBUTOR_ARCHITECTURE_MAP.md) — visual codebase map
3. **Understand** [`docs/BRANCH_STRATEGY.md`](./docs/BRANCH_STRATEGY.md) — our branch workflow
4. **Find** an issue labeled `good first issue` or `help wanted`

### Branch workflow (quick version)

```
feature/* ──PR──▶ develop ──PR──▶ main (production)
```

All standard PRs target `develop`. Production deploys happen only when `develop` is merged to `main` after CI + review.

### For security reviewers

1. [`docs/SECURITY_REVIEW.md`](./docs/SECURITY_REVIEW.md) — reviewer-facing posture pack
2. [`OSS_SAFE.md`](./OSS_SAFE.md) — public/private boundary
3. [`ARCHITECTURE_OVERVIEW.md`](./ARCHITECTURE_OVERVIEW.md) — three load-bearing patterns
4. [`SECURITY.md`](./SECURITY.md) — vulnerability reporting (private, not public issues)

## Repository governance

This repository is governed as a professionally-managed enterprise OSS project:

- **Branch protection**: `main` and `develop` are protected branches. No direct pushes.
- **Required reviews**: All PRs require at least 1 approving review. Security-sensitive paths require founder review (CODEOWNERS).
- **CI gating**: PRs must pass lint, type-check, and build before merge.
- **Release discipline**: Semantic versioning, release checklists, annotated tags. See [`docs/RELEASE_PROCESS.md`](./docs/RELEASE_PROCESS.md).
- **Security**: Coordinated disclosure via [`SECURITY.md`](./SECURITY.md). No public issue for vulnerabilities.

For the full governance model, see [`GOVERNANCE.md`](./GOVERNANCE.md).

## Documentation map

Public documentation lives in [`docs/`](./docs). Suggested reading order:

1. [`docs/SECURITY_REVIEW.md`](./docs/SECURITY_REVIEW.md) — security posture pack for reviewers.
2. [`docs/SECURITY_ARCHITECTURE.md`](./docs/SECURITY_ARCHITECTURE.md) — auth, tenant isolation, RBAC architecture.
3. [`docs/WORKFLOW_ENGINE.md`](./docs/WORKFLOW_ENGINE.md) — incident lifecycle + notification routing.
4. [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md) — webhook contract, retry policy, Slack adapter.
5. [`docs/TELEMETRY_GOVERNANCE.md`](./docs/TELEMETRY_GOVERNANCE.md) — what we capture and why.
6. [`docs/PRICING_MODEL.md`](./docs/PRICING_MODEL.md) — plan tier structure + lifecycle thresholds.
7. [`docs/PROCUREMENT_FAQ.md`](./docs/PROCUREMENT_FAQ.md) — reviewer FAQ for enterprise procurement.

### Governance & contributor docs

- [`docs/BRANCH_STRATEGY.md`](./docs/BRANCH_STRATEGY.md) — branch model and merge rules.
- [`docs/BRANCH_PROTECTION.md`](./docs/BRANCH_PROTECTION.md) — GitHub settings configuration.
- [`docs/RELEASE_PROCESS.md`](./docs/RELEASE_PROCESS.md) — versioning and release checklist.
- [`docs/CONTRIBUTOR_ARCHITECTURE_MAP.md`](./docs/CONTRIBUTOR_ARCHITECTURE_MAP.md) — visual codebase navigation.
- [`docs/SETUP_TROUBLESHOOTING.md`](./docs/SETUP_TROUBLESHOOTING.md) — local development troubleshooting.

## Roadmap direction

Tricognita is in active pilot phase. Next milestones (in priority order):

- Self-serve billing wiring (Stripe + per-tier usage enforcement).
- SOC 2 Type II completion.
- MSSP unified multi-customer queue.
- BYOK / customer-managed KMS keys.
- Bulk-action triage for findings.

These are tracked at a high level in the public documentation; detailed roadmaps are an internal artifact.

## License

MIT. See [`LICENSE`](./LICENSE).

## Acknowledgments

Tricognita's frontend stands on the shoulders of [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com), [SWR](https://swr.vercel.app), and [xyflow](https://reactflow.dev). Thanks to the maintainers of those projects.
