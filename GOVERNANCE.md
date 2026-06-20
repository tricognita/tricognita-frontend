# Project Governance

> Last reviewed: 2026-05-25

This document describes how decisions are made in the Tricognita project, who has what authority, and how contributors can grow their involvement.

## Decision-making model

Tricognita is **founder-led with community input**. The founder makes final decisions on:

- Architecture direction
- Security model changes
- Release timing
- Feature prioritization
- Contributor trust escalation

Community input is welcomed and actively sought through:

- GitHub Issues and Discussions
- PR review conversations
- In-product feedback widget (for users)
- Direct founder engagement on notable contributions

## Contributor tiers

| Tier | Who | What they can do |
|---|---|---|
| **First-time contributor** | Anyone who opens their first PR | Submit PRs, open issues, join discussions |
| **Contributor** | Someone with ≥1 merged PR | Same as above, plus may be assigned issues |
| **Trusted contributor** | Regular contributors with a track record of quality | May be added to the `@tricognita-web/frontend` team for review assignments |
| **Maintainer** | Founder + explicitly appointed maintainers | Merge PRs, manage releases, configure repository settings |

### How to advance

- **First-time → Contributor**: Merge one PR. That's it.
- **Contributor → Trusted contributor**: Sustained quality contributions over multiple PRs. Demonstrated understanding of security boundaries and architecture patterns. The founder will invite you.
- **Trusted contributor → Maintainer**: Deep, ongoing engagement. Trust is earned over time, not requested.

There is no formal application process. The founder evaluates contributors based on the quality, consistency, and care of their contributions.

## Authority matrix

| Action | Who | How |
|---|---|---|
| Merge PRs to `develop` | Maintainers | PR review + approval + CI pass |
| Merge PRs to `main` | Founder | PR review + approval + CI pass |
| Create release tags | Founder | `git tag -a v0.x.y` on `main` |
| Modify branch protection | Founder | GitHub Settings |
| Modify CODEOWNERS | Founder | PR + review |
| Respond to security reports | Founder | Via `security@tricognita.com` |
| Publish security advisories | Founder | GitHub Security Advisories |
| Modify CI/CD workflows | Founder | PR + review |
| Add/remove maintainers | Founder | Direct invitation |

## Communication channels

| Channel | Purpose |
|---|---|
| GitHub Issues | Bug reports, feature requests, actionable items |
| GitHub Discussions | Open-ended questions, design discussions, community input |
| GitHub PRs | Code review, technical discussion on specific changes |
| `security@tricognita.com` | Security vulnerability reports (private) |
| `conduct@tricognita.com` | Code of conduct reports (private) |

## Transparency commitments

- **All technical decisions** are discussed publicly in issues or PRs
- **Security vulnerabilities** are disclosed publicly after remediation (see `SECURITY.md`)
- **Roadmap direction** is published in `ROADMAP.md`
- **Changelog** is maintained in `CHANGELOG.md` for every release
- **Architecture decisions** are documented in `docs/`

## Code of Conduct

All participants are expected to follow the [Code of Conduct](./CODE_OF_CONDUCT.md). Violations are handled confidentially by the founder.

## License

Contributions are accepted under the project's [MIT License](./LICENSE). By submitting a PR, you confirm you have the right to license your contribution under those terms.

## Related documents

- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — behavioral expectations
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — how to contribute
- [`CONTRIBUTOR_GUIDE.md`](./CONTRIBUTOR_GUIDE.md) — detailed contributor handbook
- [`SECURITY.md`](./SECURITY.md) — security vulnerability reporting
- [`docs/BRANCH_STRATEGY.md`](./docs/BRANCH_STRATEGY.md) — branch workflow
- [`docs/RELEASE_PROCESS.md`](./docs/RELEASE_PROCESS.md) — release checklist and versioning
