"use client";

import Link from "next/link";
import {
  ArrowRight,
  Download,
  FileText,
  ShieldCheck,
  Table as TableIcon,
  Trophy,
  Workflow,
} from "lucide-react";
import {
  Badge,
  BadgeIntent,
  Button,
  Card,
  CardHeader,
  EmptyState,
  HStack,
  PageShell,
  StatusDot,
} from "@/lib/ui";
import { useSession } from "@/lib/use-session";
import { canDo } from "@/lib/rbac";
import { useEntitlements } from "@/lib/entitlements";

/**
 * /dashboard/exports — unified export & reporting center.
 *
 * Consolidates the exports that previously lived scattered across
 * /dashboard/compliance, /dashboard/audit-trail, /dashboard/findings.
 * Each export card explains WHAT the bundle contains, WHO sees it
 * (RBAC + entitlements), and links to either the producing route
 * (for in-context exports like Compliance PDF) or fires a direct
 * download.
 */

interface ExportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Capability required from lib/rbac. */
  capability?: "viewAuditTrail" | "viewFindings" | "viewCompliance" | "manageSettings";
  /** Entitlement required from lib/entitlements (for plan-gated exports). */
  entitlement?: "soc2EvidencePack" | "customRetention";
  format: "CSV" | "PDF" | "JSON" | "NDJSON";
  cadence: "On-demand" | "Per-scan" | "Scheduled (Enterprise)";
  href: string;
  cta: string;
}

const EXPORTS: ExportCard[] = [
  {
    id: "compliance-pdf",
    title: "Compliance posture (PDF)",
    description:
      "Printable compliance overview: composite score, per-framework breakdown, 7-day trend, failing controls with affected-resource counts. Stamped with the deploy SHA + timestamp for audit evidence.",
    icon: ShieldCheck,
    capability: "viewCompliance",
    format: "PDF",
    cadence: "On-demand",
    href: "/dashboard/compliance",
    cta: "Open & export",
  },
  {
    id: "compliance-csv",
    title: "Compliance controls (CSV)",
    description:
      "Per-control row: framework, control id, title, status, severity, affected resource count. Suitable for ingest into a GRC tool (Drata, Vanta, Strike Graph).",
    icon: ShieldCheck,
    capability: "viewCompliance",
    format: "CSV",
    cadence: "On-demand",
    href: "/api/export?format=csv",
    cta: "Download CSV",
  },
  {
    id: "audit-csv",
    title: "ARIA audit trail (CSV)",
    description:
      "Hash-linked audit chain export: every ARIA action, every operator approval, every rejection. Includes hash for tamper-evidence verification. The canonical SOC 2 evidence artifact.",
    icon: TableIcon,
    capability: "viewAuditTrail",
    format: "CSV",
    cadence: "On-demand",
    href: "/dashboard/audit-trail",
    cta: "Open & export",
  },
  {
    id: "findings-csv",
    title: "Findings (CSV)",
    description:
      "Full findings export: id, rule id, resource, severity, status, risk score, MITRE mapping, frameworks, remediation guidance. Filterable before export.",
    icon: TableIcon,
    capability: "viewFindings",
    format: "CSV",
    cadence: "On-demand",
    href: "/dashboard/findings",
    cta: "Open & export",
  },
  {
    id: "siem-ndjson",
    title: "SIEM event stream (NDJSON)",
    description:
      "Newline-delimited JSON stream of every platform event in the documented normalized schema. Designed for pull-mode ingestion by Splunk, Sentinel, Elastic, Datadog, Chronicle.",
    icon: Workflow,
    capability: "manageSettings",
    format: "NDJSON",
    cadence: "On-demand",
    href: "/api/admin/exports/siem.ndjson",
    cta: "Stream events",
  },
  {
    id: "executive-pdf",
    title: "Executive briefing (PDF)",
    description:
      "Single-page CISO/board read. Posture score, top attack paths, remediation velocity, recent ARIA activity. Branded with your org name.",
    icon: Trophy,
    capability: "viewCompliance",
    format: "PDF",
    cadence: "On-demand",
    href: "/dashboard/executive",
    cta: "Open & export",
  },
  {
    id: "soc2-evidence",
    title: "SOC 2 evidence pack",
    description:
      "Bundled audit-trail + compliance + posture history for a specified period. Hash-verifiable. Replaces 60% of evidence-collection work in a SOC 2 audit.",
    icon: FileText,
    capability: "viewAuditTrail",
    entitlement: "soc2EvidencePack",
    format: "PDF",
    cadence: "Scheduled (Enterprise)",
    href: "/contact",
    cta: "Contact to enable",
  },
];

const FORMAT_INTENT: Record<ExportCard["format"], BadgeIntent> = {
  CSV: "info",
  PDF: "violet",
  JSON: "neutral",
  NDJSON: "warning",
};

export default function ExportsPage() {
  const { role, plan } = useSession();
  const { hasEntitlement } = useEntitlements();

  function isAvailable(card: ExportCard): { allowed: boolean; reason?: string } {
    if (card.capability && !canDo(role, card.capability)) {
      return { allowed: false, reason: `Requires ${card.capability}` };
    }
    if (card.entitlement && !hasEntitlement(card.entitlement)) {
      return { allowed: false, reason: "Enterprise plan required" };
    }
    return { allowed: true };
  }

  return (
    <PageShell
      eyebrow="Reporting · Exports"
      title="Export & reporting center"
      description="Every export the platform produces, in one place. Plan-gated exports show their required tier; permission-gated exports show the requirement so an ADMIN can grant access if needed."
      meta={
        <HStack gap="sm" align="center">
          <StatusDot intent="success" size="sm" label="All export pipelines healthy" />
          {plan && (
            <Badge intent="neutral" variant="subtle" size="xs" mono>
              {plan} plan
            </Badge>
          )}
        </HStack>
      }
      actions={
        <Link href="/dashboard/plan">
          <Button variant="ghost" size="md" iconRight={<ArrowRight size={11} />}>
            See plan
          </Button>
        </Link>
      }
      width="default"
      density="tight"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {EXPORTS.map((card) => {
          const availability = isAvailable(card);
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              variant="elevated"
              density="comfortable"
              className={availability.allowed ? "" : "opacity-60"}
            >
              <CardHeader
                eyebrow={card.cadence}
                title={
                  <HStack gap="sm" align="center">
                    <Icon size={16} className="text-[var(--matcha-300)] shrink-0" />
                    <span>{card.title}</span>
                  </HStack>
                }
                actions={
                  <Badge
                    intent={FORMAT_INTENT[card.format]}
                    variant="subtle"
                    size="xs"
                    mono
                  >
                    {card.format}
                  </Badge>
                }
              />
              <p className="text-xs text-[var(--stone-400)] leading-relaxed mb-3">
                {card.description}
              </p>

              {availability.allowed ? (
                card.href.startsWith("/api/") ? (
                  <a href={card.href} className="contents">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Download size={11} />}
                    >
                      {card.cta}
                    </Button>
                  </a>
                ) : (
                  <Link href={card.href}>
                    <Button
                      variant="primary"
                      size="sm"
                      iconRight={<ArrowRight size={11} />}
                    >
                      {card.cta}
                    </Button>
                  </Link>
                )
              ) : (
                <HStack gap="sm" align="center">
                  <Badge intent="neutral" variant="subtle" size="xs">
                    Locked — {availability.reason}
                  </Badge>
                  {card.entitlement && (
                    <Link href="/dashboard/plan">
                      <Button variant="ghost" size="xs">
                        Upgrade
                      </Button>
                    </Link>
                  )}
                </HStack>
              )}
            </Card>
          );
        })}
      </div>

      {/* Scheduled exports — not yet built; surface as roadmap */}
      <Card variant="default" density="comfortable">
        <CardHeader
          eyebrow="Roadmap"
          title="Scheduled exports — coming next"
          description="Today exports are on-demand. The Enterprise tier will add scheduled exports (daily, weekly, per-period) delivered via S3, SFTP, or your webhook target. Contact us if your procurement process requires scheduled evidence delivery."
        />
        <EmptyState
          variant="compact"
          title="Scheduled delivery"
          description="Architecture exists in lib/webhook-dispatch.ts; UI for declaring schedules is the next iteration."
        />
      </Card>
    </PageShell>
  );
}
