# Security Policy

> **First principle:** if you discover a vulnerability that affects Tricognita
> in production, please report it privately — never via a public GitHub
> issue. We will treat the report with the urgency it deserves.

## Reporting a vulnerability

Use whichever channel is easiest:

- **Email:** `security@tricognita.com` (preferred).
- **GitHub Security Advisory:** click *Security* → *Report a vulnerability* on this repository.

We commit to:

- **Acknowledge** receipt within 2 business days.
- **Substantively respond** within 7 business days with an expected remediation timeline.
- **Credit** reporters who request acknowledgment in the resulting advisory, unless they prefer anonymity.

## Scope

### In scope

The following affecting the public OSS surface in this repository:

- Authentication / authorization bypass.
- Tenant isolation violations.
- Privilege escalation across user roles.
- Cryptographic weaknesses in session or signature primitives.
- Server-side request forgery.
- Insecure direct object references.
- Sensitive data exposure (PII, credentials, customer cloud credentials).
- Cross-site scripting against the dashboard.
- Cross-site request forgery against state-changing routes.
- Supply-chain risk in third-party dependencies we ship.

### Out of scope

- Denial-of-service through rate-limit exhaustion. The platform's rate-limit caps are intentional trade-offs and documented.
- Social engineering of Tricognita personnel or customers.
- Findings that require physical access to a user's device.
- Findings in third-party services we depend on (please report to those vendors directly).
- Self-XSS, missing security headers without demonstrated impact, or "best-practice" reports without an exploitable scenario.

## Coordinated disclosure

We follow coordinated disclosure. Once we have validated and remediated a report, we will:

1. Publish a GitHub Security Advisory.
2. Credit the reporter (with permission).
3. Add the fix to the standard release stream.

We aim to disclose within 90 days of report unless the issue requires a customer migration that takes longer; in that case we will share the timeline with the reporter directly.

## What this policy does NOT cover

This security policy covers the public OSS surface only. Production operational tactics, deployment recovery procedures, and internal incident response are intentionally not part of the public repository (see `OSS_SAFE.md`). If your report concerns production behavior that you can only reproduce against the live platform, please include that detail in your report and we will route it appropriately.
