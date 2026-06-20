/**
 * lib/entitlements — typed feature-flag + plan-entitlement layer.
 *
 * Phase 9 — billing & subscription FOUNDATIONS only. NO payments
 * integration. The goal is to make every feature gate a typed lookup
 * against a single source of truth so when billing arrives, we don't
 * have to hunt for "where is this feature actually gated?" across 30
 * files.
 *
 * Two orthogonal concerns:
 *
 *   1. PLAN-LEVEL ENTITLEMENTS — derived from `session.plan`.
 *      "Does this tenant's plan include feature X?" Example: SSO is
 *      enterprise-only; the free tier doesn't get it.
 *
 *   2. FEATURE FLAGS — runtime toggles, NOT tied to plan.
 *      "Is feature Y enabled in this env right now?" Used for incremental
 *      rollout, kill-switches, beta gating.
 *
 * Usage:
 *
 *   const { hasEntitlement, hasFlag } = useEntitlements();
 *   if (!hasEntitlement("ssoIntegration")) return <UpgradePrompt />;
 *   if (!hasFlag("scanCancellation")) return null;
 *
 * For server-side checks (BFF route gating), import the pure functions:
 *
 *   if (!planHasEntitlement(session.plan, "ssoIntegration")) {
 *     return ctx.errorJson({ error: "plan_required" }, 402);
 *   }
 *
 * Both ALWAYS return false if plan is undefined — fail closed. ADMIN does
 * NOT bypass entitlement checks (an ADMIN of a free-tier tenant still
 * can't use enterprise features). This is intentional: the entitlement
 * layer represents what the customer paid for, not what the user is
 * allowed to do.
 */

"use client";

import { useMemo } from "react";
import { useSession } from "./use-session";
import type { Plan } from "./rbac";

// ─── Entitlement catalog ─────────────────────────────────────────────────────

export type Entitlement =
  // Tier: starter and above
  | "finOpsScans"           // run FinOps cost-anomaly scans
  | "dataPostureManagement" // DSPM module
  // Tier: professional and above
  | "iacScanning"           // CI/CD IaC scanning
  | "k8sAudit"              // Kubernetes posture
  | "zeroTrustControl"      // Zero-Trust IAM control plane
  | "aiSecurity"            // LLM Guard for AI workloads
  // Tier: enterprise only
  | "ssoIntegration"        // SAML / OIDC SSO
  | "customPolicies"        // tenant-defined policy DSL
  | "apiKeyManagement"      // programmatic access via API keys
  | "alertRouting"          // multi-channel alert routing
  | "dedicatedSupport"      // 24/7 incident response
  | "soc2EvidencePack"      // exportable SOC 2 evidence bundle
  | "customRetention"       // configurable audit-log retention window
  | "multiTenant";          // platform-tenant cross-tenant view

// Tier mapping. The PLAN_RANK in lib/rbac.ts orders plans; we use
// numeric comparison to derive "feature requires plan >= N".
const ENTITLEMENT_MIN_PLAN: Record<Entitlement, Plan> = {
  // Starter
  finOpsScans:           "starter",
  dataPostureManagement: "starter",
  // Professional
  iacScanning:           "professional",
  k8sAudit:              "professional",
  zeroTrustControl:      "professional",
  aiSecurity:            "professional",
  // Enterprise
  ssoIntegration:        "enterprise",
  customPolicies:        "enterprise",
  apiKeyManagement:      "enterprise",
  alertRouting:          "enterprise",
  dedicatedSupport:      "enterprise",
  soc2EvidencePack:      "enterprise",
  customRetention:       "enterprise",
  multiTenant:           "enterprise",
};

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: 3,
};

// ─── Feature flags (env-driven; NOT plan-derived) ────────────────────────────

export type FeatureFlag =
  | "scanCancellation"   // future cancellation UI (Go API doesn't support yet)
  | "crossTenantOps"     // ADMIN cross-tenant ops surface
  | "auditExportPdf"     // PDF audit export (vs JSON/CSV)
  | "incidentTimeline";  // incident-tracking module

/**
 * Feature flags are read from env vars at module load. NEXT_PUBLIC_*
 * prefix makes them inlined in the client bundle (which is fine — flags
 * are not secrets; an attacker knowing a flag's state doesn't help them).
 *
 * Format: NEXT_PUBLIC_FEATURE_<NAME> = "1" | "true" | "on" enables.
 * Anything else = disabled (default).
 */
function readFlag(name: FeatureFlag): boolean {
  const envKey = `NEXT_PUBLIC_FEATURE_${name.toUpperCase()}`;
  const raw = process.env[envKey];
  if (!raw) return false;
  return raw === "1" || raw === "true" || raw === "on";
}

const FEATURE_FLAGS: Record<FeatureFlag, boolean> = {
  scanCancellation: readFlag("scanCancellation"),
  crossTenantOps: readFlag("crossTenantOps"),
  auditExportPdf: readFlag("auditExportPdf"),
  incidentTimeline: readFlag("incidentTimeline"),
};

// ─── Pure functions (safe for server-side use) ───────────────────────────────

/**
 * planHasEntitlement — true if `plan` meets the minimum tier for the
 * entitlement. Returns false for undefined plan (fail closed).
 *
 * Usable in BFF route gates, Go-API-bound API-key issuance, etc.
 */
export function planHasEntitlement(
  plan: Plan | undefined | null,
  ent: Entitlement,
): boolean {
  if (!plan) return false;
  const required = ENTITLEMENT_MIN_PLAN[ent];
  return PLAN_RANK[plan] >= PLAN_RANK[required];
}

/**
 * flagEnabled — true if the named feature flag is enabled in this env.
 */
export function flagEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

// ─── React hook ──────────────────────────────────────────────────────────────

interface UseEntitlementsResult {
  /** Current plan from session, or null if unauthenticated/loading. */
  plan: Plan | null;
  /** Plan-derived entitlement check. */
  hasEntitlement: (ent: Entitlement) => boolean;
  /** Env-driven feature flag check. */
  hasFlag: (flag: FeatureFlag) => boolean;
  /**
   * Convenience for the most common UI pattern: gate a feature on BOTH
   * a plan entitlement AND a feature flag (e.g., "scanCancellation" is
   * enterprise-tier AND must be globally enabled).
   */
  hasFeature: (ent: Entitlement, flag?: FeatureFlag) => boolean;
}

export function useEntitlements(): UseEntitlementsResult {
  const { plan } = useSession();

  return useMemo(() => {
    return {
      plan,
      hasEntitlement: (ent: Entitlement) => planHasEntitlement(plan, ent),
      hasFlag: (flag: FeatureFlag) => flagEnabled(flag),
      hasFeature: (ent: Entitlement, flag?: FeatureFlag) => {
        if (!planHasEntitlement(plan, ent)) return false;
        if (flag && !flagEnabled(flag)) return false;
        return true;
      },
    };
  }, [plan]);
}

// ─── Display helpers ─────────────────────────────────────────────────────────

/**
 * Returns the minimum plan name required for an entitlement — useful
 * when rendering "Upgrade to Professional to unlock this" callouts.
 */
export function planRequiredFor(ent: Entitlement): Plan {
  return ENTITLEMENT_MIN_PLAN[ent];
}

// ─── Audit notes ─────────────────────────────────────────────────────────────

/**
 * ENTITLEMENTS_BY_PLAN is the inverse view — "what does this plan include?"
 * Used by future pricing pages + the entitlement-status admin surface.
 * Derived deterministically from ENTITLEMENT_MIN_PLAN so the two CAN'T
 * drift out of sync.
 */
export const ENTITLEMENTS_BY_PLAN: Record<Plan, Entitlement[]> = (() => {
  const buckets: Record<Plan, Entitlement[]> = {
    free: [],
    starter: [],
    professional: [],
    enterprise: [],
  };
  for (const [ent, plan] of Object.entries(ENTITLEMENT_MIN_PLAN) as Array<
    [Entitlement, Plan]
  >) {
    // Each entitlement appears in its minimum plan AND all higher tiers.
    const rank = PLAN_RANK[plan];
    (Object.entries(PLAN_RANK) as Array<[Plan, number]>).forEach(([p, r]) => {
      if (r >= rank) buckets[p].push(ent);
    });
  }
  return buckets;
})();
