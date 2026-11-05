"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, AlertTriangle, ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import { Badge, Card, HStack, VStack, cn } from "@/lib/ui";

interface Alert {
  id: string;
  title: string;
  resource: string;
  severity: "P0" | "P1";
  time: string;
  details: string;
  mitigation: string;
}

// Reference stream populated from /api/aria/stream when the live source is
// connected. Values follow real AWS ARN conventions and reference the same
// fictional account (123456789012 — AWS docs canonical placeholder).
const referenceAlerts: Alert[] = [
  {
    id: "ALT-8891",
    title: "Public S3 bucket policy allows Principal:*",
    resource: "arn:aws:s3:::demo-prod-billing-exports",
    severity: "P0",
    time: "2 min ago",
    details:
      'Bucket policy contains an Allow statement with Principal "*" and no aws:SourceIp or aws:SourceVpce condition. Inventory snapshot lists 1,847 objects; ARIA detected 14 PII field types in samples.',
    mitigation:
      "Proposed policy revision removes the wildcard principal and retains the cross-account role grant for billing-pipeline. OPERATOR approval required; rollback path: restore previous policy version 5 (stored).",
  },
  {
    id: "ALT-8892",
    title: "IAM role with AdministratorAccess unused 67 days",
    resource: "arn:aws:iam::123456789012:role/legacy-bastion-ssm",
    severity: "P1",
    time: "11 min ago",
    details:
      "Role has AWS-managed AdministratorAccess attached. Last AssumeRole event: 2026-03-12. Trust policy permits any principal within account 123456789012.",
    mitigation:
      "Detach AdministratorAccess; replace with a least-privilege policy scoped to ssm:StartSession + ec2:DescribeInstances. Reversible from CloudTrail event archive.",
  },
  {
    id: "ALT-8893",
    title: 'RDS snapshot shared with "all"',
    resource: "arn:aws:rds:ap-south-1:123456789012:snapshot:metrics-rollup-2026-05-15",
    severity: "P1",
    time: "58 min ago",
    details:
      'Snapshot attribute restore is set to "all" rather than a specific account list. Source DB instance is internal metrics-rollup; ARIA classifier found no customer PII fields in the schema.',
    mitigation:
      "ModifyDBSnapshotAttribute → reset restore to private. No downtime. Audit trail records the prior shared list for evidence.",
  },
];

type SeverityFilter = "ALL" | "P0" | "P1";

export function AlertFeed() {
  const [expandedId, setExpandedId] = useState<string | null>(referenceAlerts[0].id);
  const [filter, setFilter] = useState<SeverityFilter>("ALL");

  const filteredAlerts = useMemo(
    () => (filter === "ALL" ? referenceAlerts : referenceAlerts.filter((a) => a.severity === filter)),
    [filter],
  );

  return (
    <div
      className="flex flex-col h-full rounded-[var(--radius)] overflow-hidden border border-[var(--sage-soft)]"
      style={{ background: "var(--moss-rise)" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 border-b border-[var(--sage-soft)]"
        style={{ background: "var(--moss)" }}
      >
        <HStack gap="sm" align="center" justify="between" className="min-w-0 mb-2">
          <HStack gap="sm" align="center" className="min-w-0">
            <ShieldAlert className="text-[var(--ember-glow)] shrink-0" size={18} />
            <h3 className="text-sm font-semibold text-[var(--stone-50)] truncate">
              Critical Alert Feed
            </h3>
            <Badge intent="success" size="xs" mono>
              Reference Stream
            </Badge>
          </HStack>
          <span className="text-[10px] font-mono text-[var(--stone-500)] shrink-0 tabular-nums">
            {filteredAlerts.length} of {referenceAlerts.length}
          </span>
        </HStack>
        {/* Severity filter chips */}
        <HStack gap="xs" align="center">
          {(["ALL", "P0", "P1"] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setFilter(sev)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest transition-colors",
                filter === sev
                  ? "bg-[var(--matcha-300)]/15 text-[var(--matcha-200)] ring-1 ring-inset ring-[var(--matcha-300)]/30"
                  : "text-[var(--stone-500)] hover:text-[var(--stone-300)] hover:bg-[var(--moss-rise)]",
              )}
              aria-pressed={filter === sev}
            >
              {sev}
            </button>
          ))}
          <span className="text-[10px] text-[var(--stone-600)] ml-1 font-mono">
            severity filter
          </span>
        </HStack>
      </div>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-sm text-[var(--stone-300)] font-medium">
              No {filter === "ALL" ? "active" : filter} alerts in the current window.
            </p>
            <p className="text-xs text-[var(--stone-500)]">
              New events appear here within seconds of detection.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isP0 = alert.severity === "P0";
            const isExpanded = expandedId === alert.id;
            const intent = isP0 ? "danger" : "warning";
            const iconColor = isP0 ? "text-[var(--ember-glow)]" : "text-[var(--amber-clay)]";

            return (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Card
                  variant={isExpanded ? intent : "default"}
                  density="compact"
                  interactive
                  onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  className="cursor-pointer"
                >
                  <HStack gap="sm" align="start">
                    <div className={cn("mt-0.5 shrink-0", iconColor)}>
                      {isP0 ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
                    </div>

                    <VStack gap="xs" className="flex-1 min-w-0">
                      <HStack gap="sm" align="center" justify="between">
                        <Badge intent={intent} variant="solid" size="xs" mono>
                          {alert.severity}
                        </Badge>
                        <span className="text-[10px] font-mono text-[var(--stone-500)] tabular-nums">
                          {alert.time}
                        </span>
                      </HStack>
                      <h4 className="text-xs font-semibold text-[var(--stone-50)] leading-snug">
                        {alert.title}
                      </h4>
                      <p className="text-[10px] font-mono text-[var(--stone-400)] truncate">
                        {alert.resource}
                      </p>
                    </VStack>

                    <ChevronDown
                      size={16}
                      className={cn(
                        "shrink-0 text-[var(--stone-500)] transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </HStack>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="mt-3 pt-3 border-t"
                          style={{ borderColor: "var(--sage-soft)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs text-[var(--stone-300)] leading-relaxed mb-3">
                            {alert.details}
                          </p>

                          <div
                            className="rounded-md p-2.5 border"
                            style={{
                              background: "var(--ink-deep)",
                              borderColor: "var(--sage-soft)",
                            }}
                          >
                            <HStack gap="xs" align="center" className="mb-1.5">
                              <span
                                className="size-1.5 rounded-full"
                                style={{
                                  background: "var(--matcha-300)",
                                  boxShadow: "0 0 6px rgba(196,181,253,0.5)",
                                }}
                              />
                              <span className="eyebrow text-[10px] text-[var(--matcha-300)]">
                                Recommended Action
                              </span>
                            </HStack>
                            <p className="text-[11px] text-[var(--stone-400)] font-mono leading-relaxed">
                              {alert.mitigation}
                            </p>
                          </div>

                          <HStack gap="sm" align="center" justify="end" className="mt-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(null);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] px-3 py-1.5 rounded border border-[var(--sage-soft)] text-[var(--stone-400)] hover:text-[var(--stone-50)] hover:border-[var(--sage)] transition-colors"
                            >
                              <XCircle size={12} /> Dismiss
                            </button>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded transition-colors text-white",
                                isP0
                                  ? "bg-[var(--ember)] hover:opacity-90"
                                  : "bg-[var(--amber-clay)] hover:opacity-90",
                              )}
                            >
                              <CheckCircle2 size={12} /> Open for Review
                            </button>
                          </HStack>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
