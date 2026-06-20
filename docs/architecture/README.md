# Architecture Documentation

> Visual + structural intelligence for Tricognita's public frontend platform.
> Designed to be read in any order; each file is self-contained.

## Who this is for

- **Contributors** — to understand the codebase fast.
- **Investors** — to evaluate architectural credibility.
- **Enterprise reviewers** — to audit trust boundaries.
- **Universities** — to study multi-tenant SaaS patterns.
- **Future hires** — to onboard in days, not weeks.

## How to read

If you have **15 minutes**: `SYSTEM_OVERVIEW.md` only. You'll understand what Tricognita is and how the pieces fit.

If you have **45 minutes**: + `FRONTEND_MAP.md` + `AUTH_AND_TENANT.md`. You'll understand the application architecture and the security model.

If you have **90 minutes**: read everything in order below.

## Contents

| File | What's in it |
|---|---|
| [`SYSTEM_OVERVIEW.md`](./SYSTEM_OVERVIEW.md) | High-level system diagram + runtime topology + tech stack rationale |
| [`FRONTEND_MAP.md`](./FRONTEND_MAP.md) | App router structure + component organization + design primitives + SWR patterns |
| [`AUTH_AND_TENANT.md`](./AUTH_AND_TENANT.md) | Auth sequence diagram + 4-layer tenant isolation + 3-layer RBAC |
| [`TELEMETRY_AND_WORKFLOWS.md`](./TELEMETRY_AND_WORKFLOWS.md) | Telemetry flow + per-workflow maps (scan, incident, remediation, feedback, lead, pilot) |
| [`DEPENDENCY_MAP.md`](./DEPENDENCY_MAP.md) | Module dependency graph + feature-to-library matrix |

## Diagram convention

All diagrams use [Mermaid](https://mermaid.js.org) — text-based, version-controlled, renders natively on GitHub.

To render locally:
- Use the [Mermaid live editor](https://mermaid.live)
- Or VS Code: install the "Markdown Preview Mermaid Support" extension
- Or any modern Markdown viewer with Mermaid support

## What you won't find here

This is the public OSS architecture documentation. The following are deliberately **not** here:

- Production deployment specifics (region codes, app names, infrastructure identifiers).
- Operational recovery procedures.
- Customer-specific commercial assessments.
- Internal scaling ceiling probing data.

These live in a separate private engineering repository. See [`OSS_SAFE.md`](../../OSS_SAFE.md) for the public/private boundary rationale.

## Consistency promise

Every diagram in this directory matches the actual implementation at the commit when the diagram was last reviewed. If you spot a divergence, please open an issue or PR — diagram drift is treated as a real bug.

Last reviewed: 2026-05-23 (Phase 23).
