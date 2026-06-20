# Tricognita for University Showcases

> A public guide for faculty, students, and researchers using Tricognita as a teaching, research, or capstone project artifact.

Tricognita's public OSS repository is a real, production-architecture multi-tenant security platform. It's been used in coursework, capstone projects, and research evaluations. This document explains what's appropriate, what's available, and how to engage with us.

## What Tricognita is good for in a university context

### As a teaching artifact

The codebase exhibits patterns that are difficult to assemble synthetically:

- **Multi-tenant architecture from the first commit.** Four-layer tenant isolation in real production code. Difficult to find OSS examples; easy to study here.
- **Three-layer RBAC.** Edge middleware + per-handler check + page guard, in a single codebase, with the contract between layers documented.
- **HMAC-signed sessions + JIT tokens.** Stateless auth at scale, with revocation, rotation, and refresh-token rotation patterns.
- **Plans-as-data, capabilities-as-data.** Adding a tier is one object edit; the UI renders comparison + upgrade prompts from the catalog. Useful for "data vs code branches" discussions.
- **Privacy-by-construction telemetry.** Hashed user identifiers, no PII, fail-open, no third-party SDK. Contrasts with "analytics integration" tutorials that usually skip these.
- **OSS public/private split.** A real-world example of how a commercial codebase partitions sensitive from sharable surfaces, with the rationale documented.

### As a research artifact

If your research touches:

- Multi-tenant SaaS architecture.
- Authorization model design (RBAC + capabilities + plan tiers).
- Privacy-conscious analytics.
- Webhook delivery + replay handling.
- Cloud security posture management workflow design.
- Human-in-the-loop AI remediation patterns.

...the public codebase has real production code you can study, fork, and cite.

### As a capstone project basis

Students looking for a non-toy project to extend:

- Build a new BFF route that integrates with a third-party API of your choice.
- Add a new UI primitive to `lib/ui/` that fits the design system.
- Implement test coverage for a `lib/` module that currently has none.
- Build a new dashboard surface for a use case not currently covered (e.g., a SAST integration view).
- Write a deeper architecture analysis comparing Tricognita's patterns to other OSS security platforms.

We'd be happy to advise on scoping.

## What Tricognita is NOT good for

To set expectations honestly:

- **Not a research substrate for security ML.** ARIA is a productized AI feature, not a research platform. If you're working on novel ML for security, you want a different starting point.
- **Not a runnable production CSPM out of the box.** The frontend without the Go API is a dashboard with synthetic data. You can study it; you can't deploy it as a working scanner.
- **Not a "build your own CSPM in a weekend" tutorial.** It's a real codebase with real complexity. Set student expectations accordingly.
- **Not a stable academic artifact.** The codebase evolves. Cite a specific commit if you reference it in research.

## How to use Tricognita responsibly in coursework

A few things we ask:

- **Credit the project** if you redistribute substantial portions (MIT license requires this anyway).
- **Don't use the project name** to imply endorsement or affiliation with student work without asking.
- **Don't strip the OSS_SAFE / governance docs** if you fork. Those documents are part of how we operate; preserving them helps your students see how real OSS projects manage their boundaries.
- **Reach out before publishing research that references us.** We're happy to verify factual claims and may have additional context you'd find useful.

## A suggested 4-week capstone outline

For a student or small team taking on a meaningful contribution:

| Week | Activity |
|---|---|
| 1 | Setup, run locally, complete the guided tour, read ARCHITECTURE_OVERVIEW.md and SECURITY_ARCHITECTURE.md. Pick a contribution scope (one new feature, one bug fix, one test coverage area). |
| 2 | Build the contribution. Match existing patterns; ask in a GitHub issue if unsure. |
| 3 | Test, polish, write the PR. Submit. |
| 4 | Address review feedback, merge, write a 2-page reflection on the architecture decisions you encountered. |

By end of week 4, the student has:
- A merged PR to a real OSS project.
- Hands-on experience with multi-tenant TypeScript, Next.js App Router, security-first design.
- A reflection document that demonstrates architecture-level thinking.

This is a stronger resume artifact than most coursework produces.

## How to reach us

- **For coursework questions:** open a GitHub Discussion. Tag it `university` or `coursework`.
- **For research questions:** email `research@tricognita.com`. We respond within a week to thoughtful inquiries.
- **For "we're using this in our class":** we'd love to know. Email the founder; we may be able to give a guest talk or office hour for your students.
- **For "we want a private deployment for our institution":** email `enterprise@tricognita.com`. Educational pricing is available for accredited institutions.

## Three things we will not do

To be clear up front:

1. **We will not write your assignment.** We're happy to clarify the code; we won't tell you which feature to build or how to solve your specific assignment.
2. **We will not endorse student work commercially.** A capstone project is a capstone project; it's not a product partnership.
3. **We will not promise the codebase remains stable for the duration of your course.** It's an active project. Pin a specific commit if stability matters for grading.

## A note on academic integrity

Tricognita's public OSS is MIT-licensed. Students can fork, modify, and submit derived work as part of coursework — but it must be honestly represented as built on Tricognita, not as their original work. Faculty are welcome to use the codebase as a starting point for assignments; in that case, please tell us so we can ensure students get the right entry-point.

We trust faculty to set appropriate boundaries; the codebase is designed to be a tool, not a shortcut.

## What we hope you take away

If you study Tricognita's codebase deeply for any of the above purposes, here are the patterns we'd most want you to internalize:

1. **Architecture decisions are values made concrete.** Privacy-by-construction, fail-open telemetry, plans-as-data, public-private boundary — these aren't features. They're how we believe security software should work.
2. **Honesty is a feature.** The OSS_SAFE.md, PROCUREMENT_FAQ.md, and PRICING_MODEL.md all explicitly name what we can't yet do. This is the hardest discipline in commercial software and the most undervalued.
3. **Multi-tenant is a design constraint, not an implementation detail.** It informs every layer from the cookie to the database query. Decisions made in week 1 compound for years.

These three are worth more than any specific feature you'd build by extending the project.

Last reviewed: 2026-05-23 (Phase 21).
