"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterChip,
  HStack,
  KPI,
  Section,
  Skeleton,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Timeline,
  TimelineItem,
  VStack,
} from "@/lib/ui";
import { AutonomousRemediationView } from "@/app/components/product";

/**
 * DESIGN SYSTEM SPECIMEN — dev-only. Not linked from any production nav.
 *
 * Proves the canonical token architecture (styles/tokens/primitives.css +
 * semantic.css) and the shared component language BEFORE either is
 * propagated across marketing or dashboard pages. Nothing on this page is
 * live product data — every number/label below is illustrative.
 *
 * The "product visual grammar" section reuses the EXISTING, tested, frozen
 * product-component layer (app/components/product/**, see
 * docs/02_Company/Design/PRODUCT_COMPONENTS.md) rather than inventing a new
 * one — AutonomousRemediationView already IS the Finding → Evidence →
 * Control → Reasoning → Remediation → Verification grammar this checkpoint
 * asked to prove, built on the frozen Geometry + Motion + Contracts layer.
 */
export default function DesignSystemSpecimen() {
  if (process.env.NODE_ENV === "production") {
    return <main className="p-6 text-[var(--text-primary)]">Not available in production.</main>;
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10 space-y-16 bg-[var(--surface-canvas)] text-[var(--text-primary)] min-h-screen">
      <header className="space-y-2 border-b border-[var(--border-subtle)] pb-8">
        <div className="eyebrow text-[var(--brand-300)]">Dev-only · Not in production nav</div>
        <h1 className="text-4xl font-bold tracking-tight">Tricognita Design System</h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          Canonical foundation: graphite/bone institutional surfaces + Royal Violet as
          a controlled brand signal. Status semantics are independent of brand —
          success is green, never violet.
        </p>
      </header>

      {/* ── COLORS ──────────────────────────────────────────────────────── */}
      <Section eyebrow="Foundations" title="Colors" description="Canonical roles only — legacy --matcha-*/--moss/--sage names are deprecated aliases onto these.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Swatch name="surface-canvas" varName="--surface-canvas" />
          <Swatch name="surface-base" varName="--surface-base" />
          <Swatch name="surface-raised" varName="--surface-raised" />
          <Swatch name="surface-overlay" varName="--surface-overlay" />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Swatch name="border-subtle" varName="--border-subtle" bordered />
          <Swatch name="border-default" varName="--border-default" bordered />
          <Swatch name="border-strong" varName="--border-strong" bordered />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <TextSwatch name="text-primary" varName="--text-primary" />
          <TextSwatch name="text-secondary" varName="--text-secondary" />
          <TextSwatch name="text-tertiary" varName="--text-tertiary" />
        </div>

        <p className="eyebrow text-[var(--text-tertiary)] mt-8 mb-2">
          Royal Violet — brand/interaction/relationship signal only, never status
        </p>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"].map((step) => (
            <Swatch key={step} name={step} varName={`--brand-${step}`} compact />
          ))}
        </div>
        <div className="flex gap-3 mt-3">
          <Swatch name="brand-primary" varName="--brand-primary" />
          <Swatch name="brand-hover" varName="--brand-hover" />
          <Swatch name="brand-subtle" varName="--brand-subtle" />
        </div>

        <p className="eyebrow text-[var(--text-tertiary)] mt-8 mb-2">
          Status — independent of brand
        </p>
        <div className="grid grid-cols-4 gap-4">
          <Swatch name="status-success" varName="--status-success" />
          <Swatch name="status-warning" varName="--status-warning" />
          <Swatch name="status-danger" varName="--status-danger" />
          <Swatch name="status-info" varName="--status-info" />
        </div>

        <p className="eyebrow text-[var(--text-tertiary)] mt-8 mb-2">
          Evidence object states — semantically scoped to evidence/provenance UI
        </p>
        <div className="grid grid-cols-3 gap-4">
          <Swatch name="evidence-verified" varName="--evidence-verified" />
          <Swatch name="evidence-pending" varName="--evidence-pending" />
          <Swatch name="evidence-failed" varName="--evidence-failed" />
        </div>
      </Section>

      {/* ── TYPOGRAPHY ──────────────────────────────────────────────────── */}
      <Section eyebrow="Foundations" title="Typography">
        <VStack gap="md" divide>
          <div>
            <div className="eyebrow text-[var(--text-tertiary)] mb-1">Display</div>
            <div className="text-5xl font-bold tracking-tight">Evidence-first assurance</div>
          </div>
          <div>
            <div className="eyebrow text-[var(--text-tertiary)] mb-1">H1</div>
            <h1 className="text-3xl font-bold tracking-tight">Security Posture Briefing</h1>
          </div>
          <div>
            <div className="eyebrow text-[var(--text-tertiary)] mb-1">H2</div>
            <h2 className="text-xl font-semibold tracking-tight">Compliance frameworks</h2>
          </div>
          <div>
            <div className="eyebrow text-[var(--text-tertiary)] mb-1">H3</div>
            <h3 className="text-sm font-semibold">Top attack paths</h3>
          </div>
          <div>
            <div className="eyebrow text-[var(--text-tertiary)] mb-1">Body</div>
            <p className="text-sm text-[var(--text-secondary)] max-w-xl leading-relaxed">
              Findings are mapped to signed evidence, then to the compliance controls your
              auditor actually checks — every step producible on demand, not assembled annually.
            </p>
          </div>
          <div>
            <div className="eyebrow text-[var(--text-tertiary)] mb-1">Label / eyebrow (mono, uppercase, tracked)</div>
            <div className="eyebrow text-[var(--brand-300)]">Posture · Compliance</div>
          </div>
          <div>
            <div className="eyebrow text-[var(--text-tertiary)] mb-1">Metadata (mono, small)</div>
            <p className="text-[10px] font-mono text-[var(--text-tertiary)]">
              seq=00482 · hash=8f21c…a90e · verified 2026-08-03T09:14:02Z
            </p>
          </div>
        </VStack>
      </Section>

      {/* ── INTERACTION ─────────────────────────────────────────────────── */}
      <Section eyebrow="Foundations" title="Interaction">
        <HStack gap="md" wrap>
          <Button variant="primary">Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Destructive</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </HStack>
        <p className="text-xs text-[var(--text-tertiary)] mt-3">
          Tab to any button above to see the focus ring — Royal Violet by design (focus is
          one of the sanctioned brand-signal uses, alongside selection and relationships),
          never used to mean status/success.
        </p>
      </Section>

      {/* ── PRODUCT VISUAL GRAMMAR ──────────────────────────────────────── */}
      <Section
        eyebrow="Product mechanism"
        title="Finding → Evidence → Control → Reasoning → Remediation → Verification"
        description="Reference workflow, reused from the existing frozen product-component layer (app/components/product) — not new geometry. Illustrative sequence, not live telemetry: Observation → Evaluation → Policy → Execution → Evidence → Verification → Rollback → Archive."
      >
        <Card variant="ghost" density="spacious">
          <AutonomousRemediationView />
        </Card>
      </Section>

      {/* ── PRODUCT COMPONENTS ──────────────────────────────────────────── */}
      <Section eyebrow="Product components" title="Finding, evidence, and verification">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card variant="danger" density="comfortable">
            <CardHeader
              eyebrow="Finding · CRITICAL"
              title="s3://sample-bucket is world-readable"
              actions={<Badge intent="danger" variant="solid">CRITICAL</Badge>}
            />
            <p className="text-xs text-[var(--text-secondary)]">
              Example finding — illustrative, not a live scan result.
            </p>
          </Card>
          <Card variant="success" density="comfortable">
            <CardHeader
              eyebrow="Evidence · Verified"
              title="Signed evidence block #00482"
              actions={<Badge intent="success" variant="solid">VERIFIED</Badge>}
            />
            <p className="text-[10px] font-mono text-[var(--text-tertiary)]">
              prev_hash → content_hash chain intact
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Card density="comfortable">
            <CardHeader eyebrow="Compliance" title="CIS_AWS · 2.1.1" actions={<Badge intent="violet" variant="outline" mono>Control</Badge>} />
            <p className="text-xs text-[var(--text-secondary)]">Mapped from 1 finding · 1 evidence record.</p>
          </Card>
          <Card density="comfortable">
            <CardHeader eyebrow="ARIA reasoning" title="Recommend: restrict bucket policy to VPC endpoint" actions={<Badge intent="warning" variant="subtle">Awaiting approval</Badge>} />
            <p className="text-xs text-[var(--text-secondary)]">Human-gated by default — nothing executes without OPERATOR approval.</p>
          </Card>
        </div>

        <div className="mt-4">
          <Timeline density="comfortable">
            <TimelineItem intent="warning" time="14:32:08" title="ARIA flagged s3://sample-bucket as world-readable">
              <p className="text-xs text-[var(--text-secondary)]">Illustrative — risk score 0.94</p>
            </TimelineItem>
            <TimelineItem intent="violet" time="14:32:44" title="ARIA recommended a remediation" />
            <TimelineItem intent="success" time="14:41:02" title="Operator approved — bucket policy hardened" />
          </Timeline>
        </div>
      </Section>

      {/* ── DATA COMPONENTS ─────────────────────────────────────────────── */}
      <Section eyebrow="Data components" title="Tables, filters, metrics, states">
        <HStack gap="md" wrap className="mb-4">
          <KPI label="Open findings" value={12} intent="warning" />
          <KPI label="Verified evidence" value={482} intent="success" />
          <KPI label="Awaiting approval" value={3} intent="info" />
        </HStack>

        <FilterBar label="Severity" className="mb-3">
          <FilterChip active>All</FilterChip>
          <FilterChip intent="danger">Critical</FilterChip>
          <FilterChip intent="warning">High</FilterChip>
          <FilterChip intent="info">Medium</FilterChip>
        </FilterBar>

        <Table density="compact">
          <THead>
            <TR>
              <TH>Resource</TH>
              <TH>Severity</TH>
              <TH align="right">Evidence</TH>
            </TR>
          </THead>
          <TBody>
            <TR>
              <TD>s3://sample-bucket</TD>
              <TD><Badge intent="danger" size="xs">CRITICAL</Badge></TD>
              <TD align="right"><Badge intent="success" variant="dot">Signed</Badge></TD>
            </TR>
            <TR>
              <TD>sg-0a1b2c3</TD>
              <TD><Badge intent="warning" size="xs">HIGH</Badge></TD>
              <TD align="right"><Badge intent="warning" variant="dot">Pending</Badge></TD>
            </TR>
          </TBody>
        </Table>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <div>
            <p className="eyebrow text-[var(--text-tertiary)] mb-2">Empty state</p>
            <EmptyState variant="bordered" title="No active findings" description="Your environment is clean against the current policy set." />
          </div>
          <div>
            <p className="eyebrow text-[var(--text-tertiary)] mb-2">Loading state</p>
            <Skeleton variant="kpi" />
          </div>
          <div>
            <p className="eyebrow text-[var(--text-tertiary)] mb-2">Error state</p>
            <ErrorState variant="offline" title="Backend unreachable" description="Showing the last cached posture snapshot." density="inline" />
          </div>
        </div>
      </Section>

      {/* ── NAVIGATION CONCEPTS ─────────────────────────────────────────── */}
      <Section eyebrow="Navigation" title="Marketing header + dashboard sidebar concepts">
        <p className="eyebrow text-[var(--text-tertiary)] mb-2">Marketing header</p>
        <div className="flex items-center justify-between rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-5 py-3 mb-6">
          <HStack gap="sm" align="center">
            <span className="size-2 rounded-full bg-[var(--brand-primary)]" />
            <span className="text-sm font-semibold">Tricognita</span>
          </HStack>
          <HStack gap="lg" className="text-xs text-[var(--text-secondary)]">
            <span>How it works</span>
            <span>Trust</span>
            <span>Pricing</span>
          </HStack>
          <Button variant="primary" size="sm">Apply for pilot</Button>
        </div>

        <p className="eyebrow text-[var(--text-tertiary)] mb-2">Dashboard sidebar</p>
        <div className="flex gap-4">
          <div className="w-48 shrink-0 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 space-y-1">
            {["Command", "Accounts", "Findings", "Evidence", "Compliance", "ARIA", "Audit"].map((label, i) => (
              <div
                key={label}
                className={
                  i === 0
                    ? "rounded-[var(--radius-tight)] bg-[var(--brand-700)]/15 text-[var(--brand-300)] px-3 py-1.5 text-xs font-medium"
                    : "rounded-[var(--radius-tight)] text-[var(--text-secondary)] px-3 py-1.5 text-xs"
                }
              >
                {label}
              </div>
            ))}
          </div>
          <div className="flex-1 rounded-[var(--radius-panel)] border border-dashed border-[var(--border-subtle)] flex items-center justify-center text-xs text-[var(--text-tertiary)]">
            page content
          </div>
        </div>
      </Section>
    </main>
  );
}

function Swatch({ name, varName, bordered, compact }: { name: string; varName: string; bordered?: boolean; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={compact ? "h-10 rounded-[var(--radius-tight)]" : "h-16 rounded-[var(--radius-panel)]"}
        style={{
          background: `var(${varName})`,
          border: bordered ? `2px solid var(${varName})` : "1px solid var(--border-subtle)",
          backgroundColor: bordered ? "var(--surface-base)" : undefined,
        }}
      />
      {!compact && <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{name}</span>}
    </div>
  );
}

function TextSwatch({ name, varName }: { name: string; varName: string }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
      <p style={{ color: `var(${varName})` }} className="text-sm font-medium">
        The quick brown fox
      </p>
      <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{name}</span>
    </div>
  );
}
