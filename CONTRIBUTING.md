# Contributing to Tricognita

Thanks for your interest in contributing. This document explains how to set up the project locally, what kinds of changes we welcome, and how to send a pull request that will be straightforward to review.

## What this repository is

This repository is the public OSS surface of Tricognita — a multi-tenant cloud security posture management (CSPM) platform. It contains:

- The Next.js dashboard + BFF (this directory).
- Architecture and security documentation in `docs/`.
- Synthetic demo data (`lib/demo-data.ts`) so a local dev experience works without real cloud credentials.

It does **not** contain production operational tactics, deployment internals, or customer data. See `OSS_SAFE.md` for the full public/private boundary.

## Setting up locally

Prerequisites:

- Node.js 20.x or later
- npm (ships with Node)
- Git

```bash
# 1. Fork and clone
git clone <your fork>
cd frontend

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local — every placeholder must be replaced.
# At minimum: SENTINEL_JIT_SECRET (≥32 bytes), SESSION_SECRET (≥32 bytes),
# DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD (≥12 chars).

# 4. Start the dev server
npm run dev
```

Open `http://localhost:3000`. The dashboard runs against the synthetic demo data; no real cloud connection is required for development.

If you hit issues, see [`docs/SETUP_TROUBLESHOOTING.md`](./docs/SETUP_TROUBLESHOOTING.md).

## Branch workflow

We use a **develop → main** branch model. See [`docs/BRANCH_STRATEGY.md`](./docs/BRANCH_STRATEGY.md) for the full details.

```
feature/* ──PR──▶ develop ──PR──▶ main (production)
```

### Quick start

```bash
# Always branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# ... make changes ...

# Commit with sign-off
git commit -s -m "feat(component): description of change"

# Push and open PR targeting develop
git push origin feature/your-feature-name
```

### Branch naming

| Prefix | Use case |
|---|---|
| `feature/` | New features, enhancements |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `chore/` | Tooling, CI, deps |
| `refactor/` | Code restructuring |
| `test/` | Adding or fixing tests |

### Important rules

- **Target `develop`** for standard PRs, not `main`
- **Target `main`** only for hotfixes, release PRs, or docs-only fixes
- Always branch from the latest `develop`
- Use squash merges (configured in the repository)

## What we welcome

- **Bug fixes** to documented behavior.
- **UI / accessibility improvements** that align with the existing design system in `lib/ui/`.
- **Documentation clarifications** in `docs/` (public docs only).
- **Type-safety improvements** that catch real bugs.
- **Performance improvements** with a measurable case.
- **Test additions** for behavior currently untested.

## What we politely decline

- Sweeping rewrites without prior discussion.
- New features without a use case described in the issue.
- Style-only refactors (whitespace, import-order) without functional benefit.
- Changes that expand the public OSS surface to cover operational internals (see `OSS_SAFE.md`).

## Pull request process

1. **Open an issue first** for anything non-trivial. We will respond with whether the change fits and what direction to take.
2. **Branch from `develop`** with a descriptive name (`fix/incident-empty-state`, `feat/queue-bulk-actions`).
3. **Write small commits** with clear messages. Conventional-commit style (`feat:`, `fix:`, `docs:`) is appreciated but not strictly enforced.
4. **Sign your commits** with the DCO sign-off (`git commit -s`). This certifies you have the right to submit the code.
5. **Run the checks** before pushing:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
   All three must pass.
6. **Open the PR** against `develop`. Fill the PR template; it asks the same questions we would.

## Issue labels

| Label | Meaning |
|---|---|
| `good first issue` | Small, well-scoped, accepted in advance. Best starting point. |
| `help wanted` | Larger work we'd accept contributions for but haven't prioritized. |
| `bug` | Confirmed bug report. |
| `enhancement` | Feature request or improvement. |
| `documentation` | Documentation-only changes. |
| `accessibility` | Accessibility improvements. |
| `type-safety` | TypeScript tightening. |
| `discussion` | Open question — comment before opening a PR. |
| `dependencies` | Dependency updates. |
| `stale` | No activity for 60+ days (auto-applied). |

## Code style

- TypeScript strict mode. No `any`. Use `unknown` and narrow.
- Prefer pure functions where possible.
- No new comments unless the *why* is non-obvious (the code explains the *what*).
- Match the existing patterns in the file you're editing.

## DCO sign-off

We use the [Developer Certificate of Origin](https://developercertificate.org/) (DCO) to certify that contributors have the right to submit their code. Sign off on your commits by adding the `-s` flag:

```bash
git commit -s -m "feat(queue): add bulk select"
```

This adds a `Signed-off-by: Your Name <your@email.com>` line to your commit message. DCO compliance is currently advisory (not blocking), but we encourage all contributors to sign off.

To retroactively add sign-off to existing commits:

```bash
git rebase HEAD~N --signoff   # where N = number of commits to fix
```

## Architecture navigation

New to the codebase? Start with:

1. [`ARCHITECTURE_OVERVIEW.md`](./ARCHITECTURE_OVERVIEW.md) — how the system is designed
2. [`docs/CONTRIBUTOR_ARCHITECTURE_MAP.md`](./docs/CONTRIBUTOR_ARCHITECTURE_MAP.md) — visual map of safe zones for contributors
3. [`docs/BRANCH_STRATEGY.md`](./docs/BRANCH_STRATEGY.md) — how code flows from feature to production

## Documentation expectations

- Public docs (`docs/*.md`) are read by customers, prospects, and contributors. Keep them honest, current, and free of internal operational specifics.
- Don't add new docs about internal operational tactics — those belong in `docs/internal/` and are outside the public OSS scope.

## Reporting bugs

Use the *Bug report* issue template. Include:

- What you did.
- What you expected.
- What actually happened.
- Browser / OS / Node version.
- A minimal reproducer if possible.

## Reporting security issues

Do **not** open a public issue. See `SECURITY.md`.

## Code of conduct

By participating, you agree to follow `CODE_OF_CONDUCT.md`. The short version: behave professionally, focus on the code, and assume good faith.

## License

Contributions are accepted under the project's MIT license (see `LICENSE`). By submitting a pull request you confirm you have the right to license your contribution under those terms.
