# Branch Protection Configuration Guide

> Last reviewed: 2026-05-25
>
> This document specifies the exact GitHub branch protection settings that
> must be applied to the Tricognita repository. These settings cannot be
> configured via files — they require manual setup in the GitHub UI or API.

## Why branch protection matters

Without branch protection:
- Anyone with write access can push directly to `main`, bypassing CI and review
- A direct push to `main` triggers automatic production deployment (Vercel + Fly.io)
- Force pushes could rewrite public history
- Accidental merges could ship untested code

Branch protection eliminates these risks.

---

## `main` branch protection

> **Priority: CRITICAL**
> This branch triggers production deployments. Every setting below is mandatory.

### GitHub UI path

**Settings → Branches → Add branch protection rule**

### Settings to configure

| Setting | Value | Rationale |
|---|---|---|
| **Branch name pattern** | `main` | Exact match |
| **Require a pull request before merging** | ✅ Enabled | No direct pushes |
| → Required approving reviews | `1` | At least one human review |
| → Dismiss stale pull request approvals when new commits are pushed | ✅ Enabled | New code needs fresh review |
| → Require review from Code Owners | ✅ Enabled | CODEOWNERS enforced |
| → Require approval of the most recent reviewable push | ✅ Enabled | Last push must be approved |
| **Require status checks to pass before merging** | ✅ Enabled | CI must pass |
| → Require branches to be up to date before merging | ✅ Enabled | No stale merges |
| → Status checks that are required | See table below | |
| **Require signed commits** | ⚠️ Recommended | Cryptographic commit verification |
| **Require linear history** | ✅ Enabled | Squash merges only |
| **Do not allow bypassing the above settings** | ✅ Enabled | Admins obey the same rules |
| **Restrict who can push to matching branches** | ✅ Enabled | Only via PR merge |
| **Allow force pushes** | ❌ Disabled | Never rewrite production history |
| **Allow deletions** | ❌ Disabled | Never delete production branch |

### Required status checks for `main`

| Check name | Workflow | Why |
|---|---|---|
| `Lint` | `ci.yml` | Code quality gate |
| `Build & Test Go API` | `ci.yml` | Backend correctness |
| `Frontend TypeScript Check` | `ci.yml` | Frontend type safety |
| `Build Docker Image` | `ci.yml` | Container build verification |
| `Go Backend (Test & Build)` | `deploy.yml` | Deploy pipeline gate |
| `Next.js Frontend (Lint & Build)` | `deploy.yml` | Frontend build gate |

---

## `develop` branch protection

> **Priority: HIGH**
> This branch is the integration point for all feature work.

### Settings to configure

| Setting | Value | Rationale |
|---|---|---|
| **Branch name pattern** | `develop` | Exact match |
| **Require a pull request before merging** | ✅ Enabled | No direct pushes |
| → Required approving reviews | `1` | Peer review |
| → Dismiss stale pull request approvals when new commits are pushed | ✅ Enabled | Fresh review on new code |
| → Require review from Code Owners | ✅ Enabled | CODEOWNERS enforced |
| **Require status checks to pass before merging** | ✅ Enabled | CI must pass |
| → Require branches to be up to date before merging | ✅ Enabled | No stale merges |
| → Status checks that are required | `Lint`, `Build & Test Go API`, `Frontend TypeScript Check` | Core quality gates |
| **Require linear history** | ✅ Enabled | Squash merges only |
| **Do not allow bypassing the above settings** | ✅ Enabled | Consistency |
| **Allow force pushes** | ❌ Disabled | No history rewriting |
| **Allow deletions** | ❌ Disabled | Integration branch is permanent |

---

## Step-by-step setup instructions

### Via GitHub UI

1. Navigate to your repository on GitHub
2. Click **Settings** (gear icon)
3. In the left sidebar, click **Branches**
4. Click **Add branch protection rule** (or **Add classic branch protection rule**)
5. Enter the branch name pattern (e.g., `main`)
6. Enable each setting as specified in the tables above
7. Click **Create** (or **Save changes**)
8. Repeat for `develop`

### Via GitHub CLI

```bash
# main branch protection
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Lint","Build & Test Go API","Frontend TypeScript Check","Build Docker Image"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# develop branch protection
gh api repos/{owner}/{repo}/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Lint","Build & Test Go API","Frontend TypeScript Check"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

---

## Vercel deployment safety

Vercel's GitHub integration auto-deploys based on branch:

| Branch | Vercel behavior | Action required |
|---|---|---|
| `main` | Production deployment | Ensure Vercel's "Production Branch" is set to `main` only |
| `develop` | Preview deployment | No change needed (Vercel auto-creates preview for non-production branches) |
| `feature/*` | Preview deployment | No change needed |
| PRs | Preview deployment | No change needed |

### Vercel settings to verify

1. Go to **Vercel Dashboard → Project → Settings → Git**
2. Confirm **Production Branch** is set to `main`
3. Confirm **Automatically expose System Environment Variables** is disabled (or reviewed)
4. Confirm preview deployments do NOT have access to production secrets

---

## Post-setup verification checklist

After applying branch protection:

- [ ] Attempt a direct push to `main` — should be rejected
- [ ] Attempt a direct push to `develop` — should be rejected
- [ ] Open a PR to `main` without CI passing — should not be mergeable
- [ ] Open a PR to `main` without review — should not be mergeable
- [ ] Attempt a force push to `main` — should be rejected
- [ ] Verify Vercel deploys only from `main` to production
- [ ] Verify Vercel creates preview deploys for PRs

---

## Emergency procedures

### If a critical fix must bypass branch protection

This should be extraordinarily rare. If it happens:

1. The founder (repository admin) can temporarily modify the branch protection rule
2. Apply the fix via a fast-tracked PR (still requires a PR, just faster review)
3. Re-enable the full protection immediately after
4. Document the bypass in the PR description with rationale
5. Post-incident: review whether the emergency process needs improvement

**Never disable branch protection and forget to re-enable it.**

---

## Related documents

- [`BRANCH_STRATEGY.md`](./BRANCH_STRATEGY.md) — branch naming, workflow, and merge rules
- [`RELEASE_PROCESS.md`](./RELEASE_PROCESS.md) — release checklist and versioning
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — contributor setup and PR process
- [`../../.github/CODEOWNERS`](../../.github/CODEOWNERS) — code ownership and review requirements
