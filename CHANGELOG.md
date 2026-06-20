# Changelog

All notable user-facing changes to the public Tricognita frontend.

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.
Releases follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Repository is
pre-1.0 — minor versions may include changes that would be breaking under stable semver.

## Format

Each release block has the same shape:

```
## [Version] — YYYY-MM-DD

### Added
- New customer-visible features.

### Changed
- Behavior changes worth noting.

### Fixed
- Bug fixes worth noting.

### Security
- Security-relevant changes (always disclose).

### Deprecated
- Features scheduled for removal in a future release.

### Removed
- Features actually removed in this release.
```

Releases that bundle multiple internal commits are summarized at the user-visible level. The internal commit chain is referenced for engineering audit but not detailed here.

## [Unreleased]

Changes accumulating for the next release. See the internal repo for the working commits.

## [0.1.0] — 2026-05-23

### Added

The inaugural public OSS release. Includes the full Tricognita frontend platform
as documented in the architecture set.

- **Multi-tenant dashboard**: findings, attack graph, incidents, SOC, queue,
  executive reporting, exports, ARIA remediation.
- **BFF route layer** with three-layer RBAC, HMAC-signed sessions with
  revocation, four-layer tenant isolation, typed event bus.
- **Shared libraries**: plans-as-data catalog, usage accounting, lifecycle
  derivation, privacy-by-construction telemetry, webhook delivery with
  Stripe-style signing, feedback inbox, notification routing.
- **Marketing surface**: trust center, how-it-works, audience pages
  (for cloud teams / for MSSPs), lead capture (request demo / pilot
  application / waitlist).
- **Admin operational surfaces**: leads inbox, pilot health, feedback
  inbox, product insights, commercial overview, health aggregate,
  deployment verify, demo reset.
- **Demo mode**: deterministic synthetic data, guided tour overlay,
  demo-reset utility.
- **Documentation set**: architecture overview, security architecture,
  workflow engine, integrations, telemetry governance, pricing model,
  procurement FAQ, founding story, executive summary, university
  showcase, how-Tricognita-works master guide, codebase guide,
  full `docs/architecture/` Mermaid diagram set.
- **OSS governance**: MIT license, SECURITY.md (coordinated disclosure),
  CONTRIBUTING.md, CONTRIBUTOR_GUIDE.md, CODE_OF_CONDUCT.md, issue
  templates, PR template with OSS-safety checklist.

### Security

- HMAC-SHA256 session signing with revocation via Redis jti set.
- Stripe-style HMAC webhook signing with documented customer verification.
- Privacy-by-construction telemetry — hashed user identifiers only, no PII,
  no third-party SDKs loaded.
- Four-layer tenant isolation enforced independently at session, BFF,
  Go API, and database layers.

---

## Release process

Releases are cut from the internal engineering repository and pushed to this
public repository via the documented sync workflow. Each public release is a
deliberate, sanitized cut — not a stream of internal development noise.

**Cadence:** Monthly minimum during pilot phase; weekly during active development
windows.

**What a release includes:**
- User-visible feature changes.
- Documentation updates.
- Security-relevant changes (always disclosed).
- Bug fixes worth a customer reviewing.

**What a release does NOT include:**
- Internal operational tactic changes.
- Customer-specific commercial assessments.
- Production deployment specifics.
- Sanitization or sync-mechanic changes (those happen silently).

For the next release cadence + plans, see [`ROADMAP.md`](./ROADMAP.md).

For security disclosure, see [`SECURITY.md`](./SECURITY.md).

For contribution process, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).
