# Branch Audit Report

> Last audited: 2026-05-25
> Auditor: Automated governance scan

## Branch inventory

| Branch | Type | Status | Remote |
|---|---|---|---|
| `main` | Production | ✅ Active | `origin/main` |
| `develop` | Integration | ✅ Active | `origin/develop` |
| `feat/ui-phase3-primitives-a11y` | Feature | 🟡 Merged → develop | `origin/feat/ui-phase3-primitives-a11y` |
| `feat/ui-pr5-audit-trail-and-overview` | Feature | 🟡 Stale | `origin/feat/ui-pr5-audit-trail-and-overview` |
| `feat/ui-primitives-expansion-pr3` | Feature | 🟡 Stale | `origin/feat/ui-primitives-expansion-pr3` |
| `feat/ui-pr2-alertfeed-posture` | Feature | 🟡 Local only | — |
| `fix/cr-8-guard-untrusted-role-header` | Fix | 🟡 Local only | — |
| `incident/phase-0-remediation` | Incident | 🟡 Local only | — |
| `phase-1-iam-option-b` | Feature | 🟡 Stale | `origin/phase-1-iam-option-b` |
| `main-presentation-fixes` | Feature | 🟡 Stale | `origin/main-presentation-fixes` |
| `feat/ui-design-system-foundation` | Feature | 🟡 Stale | `origin/feat/ui-design-system-foundation` |
| `feat/ui-pr4-table-error-routes` | Feature | 🟡 Stale | `origin/feat/ui-pr4-table-error-routes` |

### Cleanup recommendations

- **Delete remote stale branches**: `feat/ui-design-system-foundation`, `main-presentation-fixes`, `phase-1-iam-option-b`, `feat/ui-pr4-table-error-routes` — these are superseded by later work
- **Delete local-only branches** after verifying work is merged: `feat/ui-pr2-alertfeed-posture`, `fix/cr-8-guard-untrusted-role-header`, `incident/phase-0-remediation`
- **Keep**: `main`, `develop`, and any actively worked feature branches

---

## Branch protection status

### `main` branch

| Protection | Required | Current status |
|---|---|---|
| Require PR before merging | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| Required approving reviews (1) | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| Dismiss stale reviews | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| Require CODEOWNERS review | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| Require status checks | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| Require up-to-date before merge | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| Require linear history | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| No force push | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| No deletion | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| Include admins | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |

### `develop` branch

| Protection | Required | Current status |
|---|---|---|
| Require PR before merging | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| Required approving reviews (1) | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| Require status checks | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| No force push | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |
| No deletion | ✅ Required | ⚠️ **NEEDS GITHUB UI SETUP** |

> **ACTION REQUIRED**: Branch protection rules must be configured in GitHub UI.
> See [`BRANCH_PROTECTION.md`](./BRANCH_PROTECTION.md) for exact settings.

---

## CI/CD gating status

| Workflow | Trigger | Blocking? | Status |
|---|---|---|---|
| `ci.yml` — Lint, Build, Test, Docker | push/PR to `main`/`develop` | ✅ Yes (when status checks enabled) | ✅ Active |
| `deploy.yml` — Backend deploy | push to `main` only | ✅ Yes | ✅ Active |
| `frontend-pr.yml` — Frontend fast check | PR to `main`/`develop` (frontend paths) | ✅ Yes (auth boundary guard blocks) | ✅ Active |
| `pr-governance.yml` — Title lint, DCO | PR to `main`/`develop` | ⚠️ Advisory only | ✅ Active |
| `stale.yml` — Stale cleanup | Weekly cron | N/A | ✅ Active |
| `security-scan.yml` — Security scan | Manual dispatch | N/A | ✅ Active |

---

## CODEOWNERS status

CODEOWNERS file exists at `.github/CODEOWNERS` and enforces founder review for:
- `frontend/middleware.ts`
- `frontend/lib/auth.ts`
- `frontend/lib/jit-token.ts`
- `frontend/lib/token-store.ts`
- `frontend/lib/rbac.ts`
- `frontend/lib/role-utils.ts`
- `frontend/app/api/**`
- `frontend/package.json`
- `frontend/next.config.*`

**Status**: ✅ File present. ⚠️ Enforcement requires branch protection to be enabled.

---

## Direct push risk assessment

| Risk | Mitigation | Status |
|---|---|---|
| Direct push to `main` triggers Vercel production deploy | Branch protection blocks direct push | ⚠️ Pending GitHub UI setup |
| Direct push to `main` triggers Fly.io backend deploy | `deploy.yml` `if` guard + branch protection | ⚠️ Pending GitHub UI setup |
| Force push rewrites history | Branch protection blocks force push | ⚠️ Pending GitHub UI setup |
| PR merged without CI passing | Status checks required before merge | ⚠️ Pending GitHub UI setup |
| PR merged without review | Approving review required | ⚠️ Pending GitHub UI setup |

**Bottom line**: All automated governance (CI workflows, auth boundary guard, CODEOWNERS) is in place. The final blocker is enabling branch protection rules in the GitHub UI. Until then, direct pushes to `main` remain technically possible.

---

## Related documents

- [`BRANCH_STRATEGY.md`](./BRANCH_STRATEGY.md) — branch model and workflow
- [`BRANCH_PROTECTION.md`](./BRANCH_PROTECTION.md) — exact GitHub settings to configure
- [`RELEASE_PROCESS.md`](./RELEASE_PROCESS.md) — release checklist and versioning
