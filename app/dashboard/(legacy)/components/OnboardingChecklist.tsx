"use client";

/**
 * OnboardingChecklist — persistent 5-step guided checklist for new tenants.
 *
 * State: localStorage keyed by tenantId (trico_onboarding_${tenantId}).
 * Demo mode: "Connect account" pre-marked done; starts at step 2.
 * Dismiss: sets trico_onboarding_dismissed_${tenantId} = "true".
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Cloud,
  Cpu,
  Radar,
  Search,
  X,
} from "lucide-react";
import { Badge, Button, Card, HStack, VStack, cn } from "@/lib/ui";
import { isDemoMode, DEMO_ONBOARDING_STEPS, type OnboardingSteps } from "@/lib/demo-mode";

interface Step {
  key: keyof OnboardingSteps;
  label: string;
  description: string;
  timeEstimate: string;
  ctaLabel: string;
  ctaHref: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const STEPS: Step[] = [
  {
    key: "connect",
    label: "Connect a cloud account",
    description:
      "Add your AWS account via cross-account role. Tricognita needs read-only access to start discovering resources.",
    timeEstimate: "~5 min",
    ctaLabel: "Connect account",
    ctaHref: "/dashboard/credentials",
    Icon: Cloud,
  },
  {
    key: "first_scan",
    label: "Run your first scan",
    description:
      "Trigger a security scan across IAM, S3, EC2, VPC, and CloudTrail. Results in under 60 seconds.",
    timeEstimate: "~2 min",
    ctaLabel: "Scan now",
    ctaHref: "/dashboard",
    Icon: Radar,
  },
  {
    key: "review",
    label: "Review your findings",
    description:
      "See every misconfiguration ranked by risk score and mapped to CIS / SOC 2 controls.",
    timeEstimate: "~10 min",
    ctaLabel: "View findings",
    ctaHref: "/dashboard/findings-legacy",
    Icon: Search,
  },
  {
    key: "remediate",
    label: "Apply your first remediation",
    description:
      "ARIA proposes a fix for the top finding. Review blast radius, approve. Rollback is one click.",
    timeEstimate: "~5 min",
    ctaLabel: "Open ARIA",
    ctaHref: "/dashboard/aria",
    Icon: Cpu,
  },
  {
    key: "alerts",
    label: "Set up alerts",
    description:
      "Configure Slack or email notifications for new critical findings.",
    timeEstimate: "~3 min",
    ctaLabel: "Configure alerts",
    ctaHref: "/dashboard/alert-routes",
    Icon: Bell,
  },
];

function storageKey(tenantId: string) { return `trico_onboarding_${tenantId}`; }
function dismissKey(tenantId: string) { return `trico_onboarding_dismissed_${tenantId}`; }

function loadSteps(tenantId: string): OnboardingSteps {
  if (typeof window === "undefined") return { ...DEMO_ONBOARDING_STEPS };
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (raw) return JSON.parse(raw) as OnboardingSteps;
  } catch { /* ignore */ }
  return isDemoMode()
    ? { ...DEMO_ONBOARDING_STEPS }
    : { connect: false, first_scan: false, review: false, remediate: false, alerts: false };
}

function saveSteps(tenantId: string, steps: OnboardingSteps) {
  try { localStorage.setItem(storageKey(tenantId), JSON.stringify(steps)); } catch { /* ignore */ }
}

function checkDismissed(tenantId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(dismissKey(tenantId)) === "true";
}

interface OnboardingChecklistProps {
  tenantId: string;
  onScanCta?: () => void;
}

export function OnboardingChecklist({ tenantId, onScanCta }: OnboardingChecklistProps) {
  const [steps, setSteps] = useState<OnboardingSteps | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (checkDismissed(tenantId)) { setDismissed(true); return; }
    setDismissed(false);
    setSteps(loadSteps(tenantId));
  }, [tenantId]);

  const handleDismiss = useCallback(() => {
    try { localStorage.setItem(dismissKey(tenantId), "true"); } catch { /* ignore */ }
    setDismissed(true);
  }, [tenantId]);

  const markStep = useCallback((key: keyof OnboardingSteps) => {
    setSteps((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: true };
      saveSteps(tenantId, next);
      return next;
    });
  }, [tenantId]);

  if (dismissed || !steps) return null;

  const completedCount = Object.values(steps).filter(Boolean).length;
  const totalCount = STEPS.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;
  const activeStepKey = STEPS.find((s) => !steps[s.key])?.key ?? null;

  return (
    <Card
      variant="default"
      density="comfortable"
      className={cn(
        "border border-[var(--sage-soft)] bg-[var(--moss)] mb-6",
        allDone && "border-[var(--matcha-400)]",
      )}
      id="onboarding-checklist"
    >
      {/* Header */}
      <HStack justify="between" align="center">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-3 flex-1 text-left group"
          aria-expanded={!collapsed}
          aria-controls="onboarding-steps"
        >
          <div className="flex items-center gap-2">
            {allDone ? (
              <CheckCircle2 size={18} className="text-[var(--matcha-400)]" />
            ) : (
              <div
                className="relative w-[18px] h-[18px] rounded-full"
                style={{
                  background: `conic-gradient(var(--matcha-400) ${progressPct * 3.6}deg, var(--sage-soft) 0deg)`,
                }}
              >
                <div className="absolute inset-[3px] rounded-full bg-[var(--moss)]" />
              </div>
            )}
            <span className="text-sm font-semibold text-[var(--stone-100)] group-hover:text-white transition-colors">
              {allDone ? "Setup complete 🎉" : "Get started with Tricognita"}
            </span>
          </div>
          <Badge intent={allDone ? "success" : "info"} variant="subtle" size="xs">
            {completedCount}/{totalCount} done
          </Badge>
        </button>
        <HStack gap="sm" align="center">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-[var(--stone-400)] hover:text-[var(--stone-200)] transition-colors p-1 rounded"
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={handleDismiss}
            className="text-[var(--stone-500)] hover:text-[var(--stone-300)] transition-colors p-1 rounded"
            aria-label="Dismiss onboarding checklist"
            id="onboarding-dismiss-btn"
          >
            <X size={14} />
          </button>
        </HStack>
      </HStack>

      {/* Progress bar */}
      {!collapsed && (
        <div className="mt-3 mb-4">
          <div className="h-1 w-full rounded-full bg-[var(--sage-soft)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--matcha-400)] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      {!collapsed && (
        <VStack gap="sm" id="onboarding-steps">
          {STEPS.map((step, i) => {
            const done = steps[step.key];
            const isActive = step.key === activeStepKey;
            const { Icon } = step;
            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-all",
                  done ? "opacity-60"
                    : isActive ? "bg-[var(--matcha-900)]/30 border border-[var(--matcha-700)]/40"
                    : "opacity-50",
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {done ? (
                    <CheckCircle2 size={18} className="text-[var(--matcha-400)]" />
                  ) : (
                    <div className="relative">
                      <Circle size={18} className="text-[var(--stone-500)]" />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--stone-400)]">
                        {i + 1}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <HStack justify="between" align="center" className="mb-0.5">
                    <span className={cn(
                      "text-xs font-semibold",
                      done ? "text-[var(--stone-400)] line-through" : "text-[var(--stone-100)]",
                    )}>
                      {step.label}
                    </span>
                    <span className="text-[10px] text-[var(--stone-500)] ml-2 flex-shrink-0">
                      {step.timeEstimate}
                    </span>
                  </HStack>
                  {isActive && !done && (
                    <p className="text-[11px] text-[var(--stone-400)] leading-relaxed mb-2">
                      {step.description}
                    </p>
                  )}
                  {isActive && !done && (
                    <HStack gap="sm">
                      {step.key === "first_scan" && onScanCta ? (
                        <Button variant="primary" size="xs"
                          onClick={() => { onScanCta(); markStep("first_scan"); }}
                          id={`onboarding-cta-${step.key}`}
                        >
                          <Icon size={12} className="mr-1" />
                          {step.ctaLabel}
                        </Button>
                      ) : (
                        <Link href={step.ctaHref}>
                          <Button variant="primary" size="xs"
                            onClick={() => markStep(step.key)}
                            id={`onboarding-cta-${step.key}`}
                          >
                            <Icon size={12} className="mr-1" />
                            {step.ctaLabel}
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="xs"
                        onClick={() => markStep(step.key)}
                        className="text-[var(--stone-500)]"
                      >
                        Mark done
                      </Button>
                    </HStack>
                  )}
                </div>
              </div>
            );
          })}
        </VStack>
      )}

      {!collapsed && allDone && (
        <div className="mt-3 p-3 rounded-lg bg-[var(--matcha-900)]/30 border border-[var(--matcha-700)]/40 text-center">
          <p className="text-xs text-[var(--matcha-300)]">
            You&apos;re all set! Your cloud environment is under continuous monitoring.
          </p>
          <Button variant="ghost" size="xs" onClick={handleDismiss} className="mt-2 text-[var(--stone-500)]">
            Dismiss
          </Button>
        </div>
      )}
    </Card>
  );
}
