/**
 * lib/demo-mode — client-safe demo-mode flag and demo data router.
 *
 * Distinct from lib/demo.ts (server-only Redis/reset logic).
 * Can be imported in any client component or shared fetcher.
 *
 * When NEXT_PUBLIC_DEMO_MODE=true:
 *   - isDemoMode() returns true on both client and server
 *   - demoFetcher(url) returns synthetic data keyed by URL pattern
 *   - RBAC, auth, and JIT tokens remain enforced — nothing is bypassed
 */

import {
  DEMO_FINDINGS,
  DEMO_FINDINGS_SUMMARY,
  DEMO_ACCOUNTS,
  DEMO_ATTACK_PATHS,
  DEMO_COMPLIANCE_SCORE,
  DEMO_COMPLIANCE_CONTROLS,
  DEMO_AUDIT_EVENTS,
  DEMO_ALERTS,
  DEMO_ORG,
  type DemoFinding,
  type DemoAuditEvent,
} from "@/lib/demo-data";

// Re-export so consumers can import from demo-mode without touching demo-data directly
export { DEMO_AUDIT_EVENTS };
export type { DemoAuditEvent };

/** isDemoMode — true when NEXT_PUBLIC_DEMO_MODE env var is exactly "true". */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

// ─── Demo scan services (for progress simulation) ─────────────────────────────

export const DEMO_SCAN_SERVICES = [
  "IAM",
  "S3",
  "EC2",
  "VPC",
  "CloudTrail",
  "GuardDuty",
  "SecurityHub",
  "RDS",
  "Lambda",
  "KMS",
] as const;

// ─── Demo incidents ────────────────────────────────────────────────────────────

export interface DemoIncident {
  id: string;
  title: string;
  description: string;
  severity: "info" | "minor" | "major" | "critical";
  state: "active" | "acknowledged" | "resolved";
  scope: "platform" | "tenant" | "subsystem";
  affected_tenants: string[];
  affected_subsystem?: string;
  declared_by: string;
  declared_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  notes: { ts: string; author: string; body: string }[];
}

const _NOW = new Date();
function _ago(minutes: number): string {
  return new Date(_NOW.getTime() - minutes * 60_000).toISOString();
}

export const DEMO_INCIDENTS: DemoIncident[] = [
  {
    id: "inc-demo-001",
    title: "S3 Public Access — Hexgrid Data Lake",
    description:
      "Three S3 buckets have public read ACLs set. ARIA flagged as data exposure risk (MITRE T1530). No exfiltration detected.",
    severity: "major",
    state: "acknowledged",
    scope: "tenant",
    affected_tenants: [DEMO_ORG.primaryAccountId],
    affected_subsystem: "S3",
    declared_by: "aria@tricognita.com",
    declared_at: _ago(45),
    acknowledged_at: _ago(38),
    acknowledged_by: "soc@hexgrid.io",
    notes: [
      {
        ts: _ago(38),
        author: "soc@hexgrid.io",
        body: "Acknowledged. Investigating whether public ACLs are intentional. Will report back.",
      },
      {
        ts: _ago(12),
        author: "soc@hexgrid.io",
        body: "Confirmed not intentional. Remediation pending ARIA approval.",
      },
    ],
  },
  {
    id: "inc-demo-002",
    title: "IAM Root Account Active Key",
    description:
      "AWS root account has an active access key. CIS 1.4 violation. Critical finding.",
    severity: "critical",
    state: "active",
    scope: "tenant",
    affected_tenants: [DEMO_ORG.primaryAccountId],
    affected_subsystem: "IAM",
    declared_by: "aria@tricognita.com",
    declared_at: _ago(90),
    notes: [
      {
        ts: _ago(90),
        author: "aria@tricognita.com",
        body: "Auto-detected root access key — CIS 1.4. Remediation proposal queued for human approval.",
      },
    ],
  },
  {
    id: "inc-demo-003",
    title: "CloudTrail Logging Disabled — ap-south-1",
    description:
      "CloudTrail disabled for 4 minutes at 02:17 UTC. Audit gap logged. No anomalies detected.",
    severity: "minor",
    state: "resolved",
    scope: "tenant",
    affected_tenants: [DEMO_ORG.primaryAccountId],
    affected_subsystem: "CloudTrail",
    declared_by: "aria@tricognita.com",
    declared_at: _ago(180),
    acknowledged_at: _ago(175),
    acknowledged_by: "admin@hexgrid.io",
    resolved_at: _ago(160),
    resolved_by: "admin@hexgrid.io",
    notes: [
      {
        ts: _ago(175),
        author: "admin@hexgrid.io",
        body: "Terraform apply briefly disabled CloudTrail during config migration. Normal now.",
      },
    ],
  },
];

// ─── Demo ARIA proposals ───────────────────────────────────────────────────────

export interface DemoARIAProposal {
  id: string;
  finding_id: string;
  resource_id: string;
  resource_type: string;
  title: string;
  description: string;
  proposed_action: string;
  blast_radius: "low" | "medium" | "high";
  rollback_available: boolean;
  confidence_score: number;
  status: "pending_approval" | "accepted" | "executing" | "executed" | "failed";
  created_at: string;
}

export const DEMO_ARIA_PROPOSALS: DemoARIAProposal[] = [
  {
    id: "aria-prop-001",
    finding_id: "FIND-001",
    resource_id: "arn:aws:s3:::hexgrid-data-lake-raw",
    resource_type: "S3Bucket",
    title: "Remove public read ACL from hexgrid-data-lake-raw",
    description:
      "ARIA proposes to remove public-read ACL and enable Block Public Access. Remediates FIND-001 and satisfies SOC 2 CC6.1.",
    proposed_action: "s3.PutPublicAccessBlock + s3.PutBucketAcl(private)",
    blast_radius: "low",
    rollback_available: true,
    confidence_score: 0.97,
    status: "pending_approval",
    created_at: _ago(40),
  },
  {
    id: "aria-prop-002",
    finding_id: "FIND-003",
    resource_id: "arn:aws:iam::123456789012:root",
    resource_type: "IAMRootCredential",
    title: "Delete root account access key",
    description:
      "ARIA proposes to delete the root account access key (AKIA...7F2K). Remediates CIS 1.4. No rollback possible.",
    proposed_action: "iam.DeleteAccessKey(root, AKIA...7F2K)",
    blast_radius: "medium",
    rollback_available: false,
    confidence_score: 0.92,
    status: "pending_approval",
    created_at: _ago(85),
  },
  {
    id: "aria-prop-003",
    finding_id: "FIND-007",
    resource_id: "arn:aws:ec2:us-east-1:123456789012:security-group/sg-0abc123",
    resource_type: "EC2SecurityGroup",
    title: "Restrict SSH to VPN CIDR on sg-0abc123",
    description:
      "sg-0abc123 allows SSH from 0.0.0.0/0. ARIA proposes restricting port 22 to 10.0.0.0/8 (VPN CIDR).",
    proposed_action: "ec2.RevokeSecurityGroupIngress + AuthorizeIngress(10.0.0.0/8, port=22)",
    blast_radius: "low",
    rollback_available: true,
    confidence_score: 0.99,
    status: "executed",
    created_at: _ago(210),
  },
];

// ─── Demo onboarding state ────────────────────────────────────────────────────

export interface OnboardingSteps {
  connect: boolean;
  first_scan: boolean;
  review: boolean;
  remediate: boolean;
  alerts: boolean;
}

/** Pre-set narrative: connect=true so demo starts at step 2 (Run first scan). */
export const DEMO_ONBOARDING_STEPS: OnboardingSteps = {
  connect: true,
  first_scan: false,
  review: false,
  remediate: false,
  alerts: false,
};

// ─── demoFetcher — URL → demo data router ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoFetcher(url: string): any | undefined {
  if (url === "/api/findings" || url.startsWith("/api/findings?")) {
    return { findings: DEMO_FINDINGS as DemoFinding[], summary: DEMO_FINDINGS_SUMMARY };
  }
  if (url === "/api/cloud/accounts" || url.startsWith("/api/cloud/accounts?")) {
    return { accounts: DEMO_ACCOUNTS };
  }
  if (url === "/api/audit-trail" || url.startsWith("/api/audit-trail?") ||
      url === "/api/audit" || url.startsWith("/api/audit?")) {
    return { events: DEMO_AUDIT_EVENTS, total: DEMO_AUDIT_EVENTS.length };
  }
  if (url === "/api/compliance" || url.startsWith("/api/compliance?")) {
    return { score: DEMO_COMPLIANCE_SCORE, controls: DEMO_COMPLIANCE_CONTROLS };
  }
  if (url === "/api/attack-paths" || url.startsWith("/api/attack-paths?")) {
    return { attack_paths: DEMO_ATTACK_PATHS };
  }
  if (url === "/api/alerts" || url.startsWith("/api/alerts?")) {
    return { alerts: DEMO_ALERTS };
  }
  if (url === "/api/incidents" || url.startsWith("/api/incidents?")) {
    return { incidents: DEMO_INCIDENTS };
  }
  if (url === "/api/aria/proposals" || url.startsWith("/api/aria/proposals?")) {
    return { proposals: DEMO_ARIA_PROPOSALS };
  }
  if (url === "/api/onboarding/status") {
    return { steps: DEMO_ONBOARDING_STEPS };
  }
  if (url === "/api/scan/status") {
    return { status: "idle", elapsed_s: 0, service: null, progress_pct: 0 };
  }
  if (url === "/api/finops/summary" || url.startsWith("/api/finops/summary?")) {
    return { estimated_savings_usd: 4_280, zombie_count: 7 };
  }
  return undefined;
}
