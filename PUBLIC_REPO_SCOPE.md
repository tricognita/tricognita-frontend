# Public Repository Scope

This document is the operational rule for what belongs in this repository. `OSS_SAFE.md` describes the philosophy; this document describes the practice.

## The single test

Before adding anything to this repository, answer:

> *If a competitor, attacker, or unauthorized party reads this in five years,
> does it expose information that helps them harm Tricognita or its customers?*

If yes → do not add it. Put it in `docs/internal/` if the internal team needs it; otherwise keep it out of the repository entirely.

## What this repository accepts

| Category | Examples |
|---|---|
| Application code | UI components, BFF routes, libraries, middleware. |
| Type definitions | Interfaces, types, exported enums. |
| Architecture documentation | How systems are designed, why decisions were made. |
| Security philosophy | Threat model overview, control descriptions. |
| Public-facing docs | Onboarding, integration contracts, pricing structure. |
| Synthetic demo data | `lib/demo-data.ts`-style synthetic datasets prefixed `DEMO_`. |
| Governance | License, contributing guide, security policy, code of conduct. |

## What this repository does NOT accept

| Category | Why |
|---|---|
| Real customer identifiers | Privacy, contractual. |
| Production environment names | Probing surface. |
| Production region codes | Probing surface. |
| Production deployment names | Probing surface. |
| Real cloud account IDs | Customer-specific. |
| Real ARNs of customer resources | Customer-specific. |
| Production secrets, tokens, or keys | Catastrophic. |
| `.env` files (not `.env.example`) | Secret leakage. |
| Customer commercial details (price, contract length, MRR) | Confidentiality. |
| Exact failure-recovery commands targeting production | Operational risk. |
| Internal incident response tactics | Operational risk. |
| Internal personnel names or org structure | Privacy + social-engineering surface. |
| Internal Slack channels, Linear projects, support tools | Internal-only references. |

## Treatment of demo data

Demo data is expected and welcomed when it makes local development possible. Rules:

- Variable / constant names must use `DEMO_` or `EXAMPLE_` prefix.
- AWS account IDs in demo data must use the AWS canonical placeholder `123456789012` (or similar 12-digit pattern that is obviously fake).
- Emails in demo data must use `@example.com`, `@demo.tricognita.invalid`, or `@example.tricognita.com`.
- ARNs in demo data must include `demo-` or `example-` somewhere in the resource portion.
- A reader skimming the file should be able to tell within 5 seconds that the data is synthetic.

## Treatment of generic references

These are fine in the repository:

- "Tricognita" the product name.
- "tricognita.com" as a marketing domain.
- "Fly.io", "Vercel", "Neon", "Upstash", "AWS" as vendor names.
- "AWS Bedrock", "AWS SageMaker", "AWS STS" as vendor service names.
- Generic role names like `ADMIN`, `SECOPS`, `AUDITOR`.

These are NOT fine:

- Specific production app names (e.g. `<product>-api` Fly app names).
- Specific production URLs (e.g. `<product>-api.fly.dev`).
- Specific Vercel deployment URLs.
- Specific Neon project names.
- Specific Upstash database names.
- Specific region codes used in production (e.g., `ap-southeast-1`).

## Pull request review checklist

Reviewers should explicitly check that new additions:

- [ ] Do not introduce any of the "does NOT accept" categories above.
- [ ] If they add demo data, follow the demo data rules.
- [ ] If they reference infrastructure, use generic terms.
- [ ] If they reference operational tactics, either generalize them or move them to `docs/internal/`.
- [ ] Do not contradict the public `OSS_SAFE.md` boundary.

## How sensitive content arrives anyway

Sensitive content sometimes appears in repositories through:

- Copy-paste from internal docs or chat.
- Auto-generated code with embedded identifiers.
- Test fixtures with real data.
- Hardcoded fallbacks in env-var lookups.
- Forgotten debug logging.

When this happens, the fix is straightforward: sanitize the file, commit the fix, and (if the leak is severe) rotate the affected identifier. For widespread or historical leaks, consider `git filter-repo` or BFG — but only with the founder's explicit go-ahead, because history rewrites are destructive.

## When in doubt

Ask. It's faster to ask than to retroactively sanitize, and it's much faster than rotating a leaked production identifier.
