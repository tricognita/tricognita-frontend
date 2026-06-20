<!-- Thanks for the PR. Filling this out makes review fast. -->

## Summary

One or two sentences on what this PR does and why.

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor (no behavior change)
- [ ] Build / tooling
- [ ] Accessibility improvement
- [ ] Test addition

## Linked issue

Closes #

## Target branch

> **Standard PRs should target `develop`, not `main`.**
> Target `main` only for hotfixes, release PRs, or docs-only fixes.
> See [docs/BRANCH_STRATEGY.md](./docs/BRANCH_STRATEGY.md) for details.

- [ ] This PR targets the correct branch.

## Pre-flight checklist

- [ ] `npx tsc --noEmit` is clean.
- [ ] `npm run lint` is clean.
- [ ] `npm run build` succeeds.
- [ ] I tested this locally and verified the behavior matches the description.
- [ ] No production identifiers, secrets, or operational internals were added (see `OSS_SAFE.md`).
- [ ] If documentation changed, the change is in the appropriate scope (public docs in `docs/`, internal in `docs/internal/`).
- [ ] Commits are signed off (`git commit -s`) per the DCO.

## Breaking changes

Does this PR introduce any breaking changes? If yes, describe what breaks and what consumers need to do.

- [ ] No breaking changes.
- [ ] Breaking changes (described below):

## Security impact

Does this PR touch auth, session, RBAC, tenant isolation, or any security boundary?

- [ ] No security impact.
- [ ] Security-relevant changes (described below):

## Dependency changes

Does this PR add, remove, or update dependencies?

- [ ] No dependency changes.
- [ ] Dependency changes (described below):

## Screenshots / before-after

If this is a UI change, include before/after screenshots.

## Test plan

What did you do to verify this works? Bullet steps a reviewer can re-run.

## Notes for reviewers

Anything non-obvious you want a reviewer to look at, or known-limitations of this PR.
