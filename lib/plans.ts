/**
 * lib/plans — declarative plan tier definitions.
 *
 * Phase 17 — revenue infrastructure. The platform already has plan
 * tiers in lib/rbac.ts for capability gating; this module is the
 * customer-facing source of truth for plan features, quotas, and
 * pricing structure.
 *
 * Design rules:
 *   - Plans are DATA, not code branches. Adding a tier or a quota
 *     dimension is a single object edit.
 *   - Quota numbers reflect honest current operational ceilings,
 *     not aspirational targets.
 *   - No payment processing. This is the entitlement scaffolding
 *     for Phase 18+ when Stripe wiring happens.
 *
 * Pricing is documented in docs/PRICING_MODEL.md and is intentionally
 * NOT hard-coded here — pricing changes as we learn from pilots.
 */

import type { Plan } from "./rbac";

export type { Plan };

export interface PlanQuotas {
  /** Maximum scans initiated per calendar month. */
  scans_per_month: number;
  /** Maximum exports generated per month. */
  exports_per_month: number;
  /** Active webhook subscriptions. */
  webhook_subscriptions: number;
  /** Maximum users on the tenant. */
  team_members: number;
  /** Maximum cloud accounts connected. */
  cloud_accounts: number;
  /** Whether usage-overage is allowed (soft cap) or hard. */
  overage_allowed: boolean;
}

export interface PlanFeatures {
  /** ARIA autonomous remediation (vs manual approval only). */
  autonomous_remediation: boolean;
  /** Bedrock/SageMaker AI features. */
  ai_remediation: boolean;
  /** Cross-account scanning (vs single account). */
  multi_account: boolean;
  /** Webhook integrations. */
  webhooks: boolean;
  /** Slack adapter. */
  slack_integration: boolean;
  /** SIEM NDJSON export. */
  siem_export: boolean;
  /** SOC 2 evidence pack export. */
  soc2_evidence_pack: boolean;
  /** Executive PDF reporting. */
  executive_reporting: boolean;
  /** Attack-graph (xyflow). */
  attack_graph: boolean;
  /** Zero-trust dashboards. */
  zero_trust: boolean;
  /** Policy management surfaces. */
  policy_management: boolean;
  /** Priority support tier. */
  priority_support: boolean;
  /** Customer-managed KMS keys. */
  customer_managed_kms: boolean;
}

export interface PlanDefinition {
  id: Plan;
  /** Customer-visible display name. */
  name: string;
  /** Customer-facing tagline. */
  tagline: string;
  /** Pricing model description — NOT a literal price. See PRICING_MODEL.md. */
  pricing_summary: string;
  quotas: PlanQuotas;
  features: PlanFeatures;
  /** Customer-visible "good fit for" guidance. */
  good_fit_for: string;
}

// ─── The catalog ────────────────────────────────────────────────────────────
//
// Adding a tier:
//   1. Append to PLANS below.
//   2. Update PLAN_RANK in lib/rbac.ts to keep capability gating consistent.
//   3. Document the change in docs/PRICING_MODEL.md.

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Try Tricognita on one cloud account.",
    pricing_summary: "$0 — evaluation tier.",
    good_fit_for:
      "Solo evaluators and security-curious developers. One account, basic posture visibility.",
    quotas: {
      scans_per_month: 10,
      exports_per_month: 5,
      webhook_subscriptions: 1,
      team_members: 3,
      cloud_accounts: 1,
      overage_allowed: false,
    },
    features: {
      autonomous_remediation: false,
      ai_remediation: false,
      multi_account: false,
      webhooks: true,
      slack_integration: true,
      siem_export: false,
      soc2_evidence_pack: false,
      executive_reporting: false,
      attack_graph: true,
      zero_trust: false,
      policy_management: false,
      priority_support: false,
      customer_managed_kms: false,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Production posture for small teams.",
    pricing_summary: "Bespoke per-team pricing during pilot phase.",
    good_fit_for:
      "Teams of 5-20 managing one to three cloud accounts. Manual-approval remediation.",
    quotas: {
      scans_per_month: 200,
      exports_per_month: 50,
      webhook_subscriptions: 5,
      team_members: 15,
      cloud_accounts: 3,
      overage_allowed: true,
    },
    features: {
      autonomous_remediation: false,
      ai_remediation: true,
      multi_account: true,
      webhooks: true,
      slack_integration: true,
      siem_export: true,
      soc2_evidence_pack: false,
      executive_reporting: true,
      attack_graph: true,
      zero_trust: false,
      policy_management: false,
      priority_support: false,
      customer_managed_kms: false,
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    tagline: "Mature security operations for growing organizations.",
    pricing_summary: "Annual contract — pricing reflects deployment scale.",
    good_fit_for:
      "Security teams of 20-100 with active SOC operations across multiple cloud accounts.",
    quotas: {
      scans_per_month: 1000,
      exports_per_month: 500,
      webhook_subscriptions: 20,
      team_members: 75,
      cloud_accounts: 15,
      overage_allowed: true,
    },
    features: {
      autonomous_remediation: false,
      ai_remediation: true,
      multi_account: true,
      webhooks: true,
      slack_integration: true,
      siem_export: true,
      soc2_evidence_pack: true,
      executive_reporting: true,
      attack_graph: true,
      zero_trust: true,
      policy_management: false,
      priority_support: false,
      customer_managed_kms: false,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Full platform with enterprise governance and support.",
    pricing_summary: "Enterprise agreement — multi-year, custom terms.",
    good_fit_for:
      "Regulated industries, large security organizations, MSSP-style operators (Phase 18+).",
    quotas: {
      scans_per_month: 10_000,
      exports_per_month: 5_000,
      webhook_subscriptions: 100,
      team_members: 500,
      cloud_accounts: 100,
      overage_allowed: true,
    },
    features: {
      autonomous_remediation: true,
      ai_remediation: true,
      multi_account: true,
      webhooks: true,
      slack_integration: true,
      siem_export: true,
      soc2_evidence_pack: true,
      executive_reporting: true,
      attack_graph: true,
      zero_trust: true,
      policy_management: true,
      priority_support: true,
      customer_managed_kms: false, // BYOK in Phase 18+; honest until then
    },
  },
};

export const PLAN_ORDER: Plan[] = ["free", "starter", "professional", "enterprise"];

/**
 * planFor — resolve a plan definition from a tier id. Falls back to
 * free so missing/unknown plan strings don't crash callers.
 */
export function planFor(id: Plan | string | undefined | null): PlanDefinition {
  if (!id || !(id in PLANS)) return PLANS.free;
  return PLANS[id as Plan];
}

/**
 * nextPlanFrom — returns the next plan in the upgrade ladder, or null
 * if already on the top tier.
 */
export function nextPlanFrom(current: Plan): PlanDefinition | null {
  const idx = PLAN_ORDER.indexOf(current);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  return PLANS[PLAN_ORDER[idx + 1]];
}

export type QuotaKey = keyof PlanQuotas;
/** Quota dimensions that are numeric (used for usage bars). */
export const NUMERIC_QUOTA_KEYS: QuotaKey[] = [
  "scans_per_month",
  "exports_per_month",
  "webhook_subscriptions",
  "team_members",
  "cloud_accounts",
];

export type FeatureKey = keyof PlanFeatures;

/**
 * featureAvailable — typed accessor for "does this plan include feature X?".
 */
export function featureAvailable(plan: Plan, feature: FeatureKey): boolean {
  return PLANS[plan].features[feature];
}
