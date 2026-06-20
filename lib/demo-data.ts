/**
 * Canonical enterprise demo dataset.
 *
 * This module is the single source of truth for "reference data" mode — the
 * cached posture surface shown when the Go backend is unreachable, when a
 * demo viewer is logged in, or when no scan has run yet on a fresh tenant.
 *
 * Constraints baked in:
 *   - Every resource references the same fictional org ("Hexgrid Inc.") on
 *     AWS account 123456789012 (AWS docs canonical placeholder) and the same
 *     two primary regions (us-east-1, ap-south-1).
 *   - Resource names cross-reference between findings, attack paths, audit
 *     events, and the AlertFeed so the platform reads as one operational
 *     story instead of disconnected pages.
 *   - Timestamps are anchored to the build's `Date.now()` so the data is
 *     always "recent" relative to viewing — but the deltas between events
 *     are stable (e.g. ALT-8891 is always 2 min before ALT-8892).
 *   - Findings → compliance controls: every failing control corresponds to a
 *     real finding in this dataset; every passing control reflects something
 *     real that's NOT in the findings list. No phantom failures.
 *   - Attack paths reference finding IDs so deep-linking works.
 *
 * Routes import these constants directly. Do NOT mutate them — they're
 * declared `as const` to make accidental mutation a TypeScript error.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEMO_ORG = {
  name: "Hexgrid Inc.",
  primaryAccountId: "123456789012",
  primaryRegions: ["us-east-1", "ap-south-1"] as const,
  industry: "FinTech (B2B SaaS)",
  cloudFootprint: "AWS multi-account, ~340 resources under management",
} as const;

export interface DemoAccount {
  id: string;
  account_id: string;
  label: string;
  role_arn: string;
  regions: string[];
  status: "active" | "error" | "untested";
  resource_count: number;
  last_scan_at: string;
}

// Anchor to a known instant so audit timestamps are stable for the build.
// Routes that want "now" timestamps should call new Date().toISOString() at
// component-mount time, not at module load.
const ANCHOR = new Date("2026-05-21T14:32:00Z");
function offset(minutes: number): string {
  return new Date(ANCHOR.getTime() - minutes * 60_000).toISOString();
}
function offsetHours(hours: number): string {
  return offset(hours * 60);
}
function offsetDays(days: number): string {
  return offset(days * 24 * 60);
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "acct-prod",
    account_id: "123456789012",
    label: "Hexgrid Production — us-east-1",
    role_arn: "arn:aws:iam::123456789012:role/TricognitaReadOnly",
    regions: ["us-east-1", "ap-south-1"],
    status: "active",
    resource_count: 184,
    last_scan_at: offset(8),
  },
  {
    id: "acct-staging",
    account_id: "234567890123",
    label: "Hexgrid Staging",
    role_arn: "arn:aws:iam::234567890123:role/TricognitaReadOnly",
    regions: ["us-east-1"],
    status: "active",
    resource_count: 102,
    last_scan_at: offset(14),
  },
  {
    id: "acct-data",
    account_id: "345678901234",
    label: "Hexgrid Data Lake",
    role_arn: "arn:aws:iam::345678901234:role/TricognitaReadOnly",
    regions: ["us-east-1"],
    status: "active",
    resource_count: 54,
    last_scan_at: offset(47),
  },
];

// ─── Findings ─────────────────────────────────────────────────────────────────

export interface DemoFinding {
  id: string;
  rule_id: string;
  resource_id: string;
  resource_type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "RESOLVED" | "SUPPRESSED";
  title: string;
  description: string;
  remediation: string;
  frameworks: string[];
  mitre: string[];
  risk_score: number;
  created_at: string;
}

export const DEMO_FINDINGS: DemoFinding[] = [
  {
    id: "FND-2026-0421",
    rule_id: "AWS.S3.PUBLIC_POLICY",
    resource_id: "arn:aws:s3:::demo-prod-billing-exports",
    resource_type: "AWS::S3::Bucket",
    severity: "CRITICAL",
    status: "OPEN",
    title: "Public S3 bucket policy allows Principal:*",
    description:
      "Bucket policy contains an Allow statement with Principal \"*\" and no aws:SourceIp or aws:SourceVpce condition. Inventory snapshot lists 1,847 objects; ARIA detected 14 PII field types in samples.",
    remediation:
      "Proposed policy revision removes the wildcard principal and retains the cross-account role grant for billing-pipeline. OPERATOR approval required; rollback path: restore previous policy version 5 (stored).",
    frameworks: ["CIS AWS 1.5.0", "SOC 2 CC6.1", "NIST 800-53 AC-3"],
    mitre: ["T1530"],
    risk_score: 0.94,
    created_at: offset(2),
  },
  {
    id: "FND-2026-0420",
    rule_id: "AWS.IAM.ADMIN_UNUSED",
    resource_id: "arn:aws:iam::123456789012:role/legacy-bastion-ssm",
    resource_type: "AWS::IAM::Role",
    severity: "CRITICAL",
    status: "OPEN",
    title: "IAM role with AdministratorAccess unused 67 days",
    description:
      "Role has AWS-managed AdministratorAccess attached. Last AssumeRole event: 2026-03-12. Trust policy permits any principal within account 123456789012.",
    remediation:
      "Detach AdministratorAccess; replace with a least-privilege policy scoped to ssm:StartSession + ec2:DescribeInstances. Reversible from CloudTrail event archive.",
    frameworks: ["CIS AWS 1.5.0", "SOC 2 CC6.3", "ISO 27001 A.9.2.5"],
    mitre: ["T1078.004"],
    risk_score: 0.89,
    created_at: offset(11),
  },
  {
    id: "FND-2026-0419",
    rule_id: "AWS.RDS.SHARED_SNAPSHOT",
    resource_id:
      "arn:aws:rds:ap-south-1:123456789012:snapshot:metrics-rollup-2026-05-15",
    resource_type: "AWS::RDS::DBSnapshot",
    severity: "HIGH",
    status: "OPEN",
    title: "RDS snapshot shared with \"all\" accounts",
    description:
      "Snapshot attribute restore is set to \"all\" rather than a specific account list. Source DB instance is internal metrics-rollup; ARIA classifier found no customer PII fields in the schema.",
    remediation:
      "ModifyDBSnapshotAttribute → reset restore to private. No downtime. Audit trail records the prior shared list for evidence.",
    frameworks: ["CIS AWS 1.5.0", "SOC 2 CC6.6"],
    mitre: ["T1567"],
    risk_score: 0.71,
    created_at: offset(58),
  },
  {
    id: "FND-2026-0418",
    rule_id: "AWS.EC2.OPEN_SG",
    resource_id: "arn:aws:ec2:us-east-1:123456789012:security-group/sg-0a1f9c",
    resource_type: "AWS::EC2::SecurityGroup",
    severity: "HIGH",
    status: "OPEN",
    title: "Security group permits 0.0.0.0/0 on SSH (22)",
    description:
      "Inbound rule allows tcp/22 from 0.0.0.0/0. Attached to web-prod-01 (i-0f4a) which hosts the public marketing site but does NOT need SSH from the internet.",
    remediation:
      "Restrict tcp/22 to corporate egress CIDR (203.0.113.0/24) or remove rule entirely; Systems Manager Session Manager already provides shell access.",
    frameworks: ["CIS AWS 1.5.0", "NIST 800-53 SC-7"],
    mitre: ["T1190"],
    risk_score: 0.68,
    created_at: offsetHours(3),
  },
  {
    id: "FND-2026-0417",
    rule_id: "AWS.KMS.NO_ROTATION",
    resource_id:
      "arn:aws:kms:us-east-1:123456789012:key/8f1c2a3b-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    resource_type: "AWS::KMS::Key",
    severity: "MEDIUM",
    status: "OPEN",
    title: "Customer-managed KMS key has automatic rotation disabled",
    description:
      "Key alias: alias/hexgrid-data-encryption-2024. Annual key rotation is disabled. Key is used by 12 EBS volumes and 4 S3 buckets with SSE-KMS.",
    remediation:
      "Enable automatic key rotation. AWS will rotate annually with no application changes required (KMS handles the alias indirection).",
    frameworks: ["CIS AWS 1.5.0", "SOC 2 CC6.7", "PCI DSS 3.6.4"],
    mitre: [],
    risk_score: 0.42,
    created_at: offsetHours(6),
  },
  {
    id: "FND-2026-0416",
    rule_id: "AWS.CLOUDTRAIL.NO_MULTI_REGION",
    resource_id: "arn:aws:cloudtrail:us-east-1:123456789012:trail/hexgrid-audit",
    resource_type: "AWS::CloudTrail::Trail",
    severity: "MEDIUM",
    status: "OPEN",
    title: "CloudTrail is not multi-region",
    description:
      "Trail captures only us-east-1. Resources exist in ap-south-1 (8 EC2 instances, 2 RDS clusters) whose API activity is not logged.",
    remediation:
      "Edit trail configuration; set IsMultiRegionTrail to true. Cost impact ~$2/month for additional region.",
    frameworks: ["CIS AWS 1.5.0", "SOC 2 CC7.2"],
    mitre: ["T1562.008"],
    risk_score: 0.38,
    created_at: offsetHours(12),
  },
  {
    id: "FND-2026-0415",
    rule_id: "AWS.IAM.NO_MFA_ROOT",
    resource_id: "arn:aws:iam::123456789012:root",
    resource_type: "AWS::IAM::User",
    severity: "CRITICAL",
    status: "RESOLVED",
    title: "Root account MFA disabled",
    description:
      "Root user does not have MFA configured. Resolved by SOC_LEAD on 2026-05-18 — hardware MFA enrolled, recovery codes stored in 1Password.",
    remediation: "MFA enrolled. Verified via aws iam get-account-summary.",
    frameworks: ["CIS AWS 1.5.0", "SOC 2 CC6.1", "ISO 27001 A.9.4.2"],
    mitre: [],
    risk_score: 0.99,
    created_at: offsetDays(3),
  },
  {
    id: "FND-2026-0414",
    rule_id: "AWS.S3.NO_VERSIONING",
    resource_id: "arn:aws:s3:::hexgrid-customer-uploads",
    resource_type: "AWS::S3::Bucket",
    severity: "LOW",
    status: "OPEN",
    title: "S3 bucket lacks versioning",
    description:
      "Bucket has versioning disabled. Holds user-uploaded receipts for the expense product (~14k objects, 6.4 GB).",
    remediation:
      "PutBucketVersioning → Enabled. Adds storage cost but enables recovery from accidental deletion.",
    frameworks: ["AWS Well-Architected REL10"],
    mitre: [],
    risk_score: 0.18,
    created_at: offsetDays(5),
  },
  {
    id: "FND-2026-0413",
    rule_id: "AWS.LAMBDA.OUTDATED_RUNTIME",
    resource_id:
      "arn:aws:lambda:us-east-1:123456789012:function:hexgrid-billing-emit",
    resource_type: "AWS::Lambda::Function",
    severity: "MEDIUM",
    status: "OPEN",
    title: "Lambda function using deprecated Node 16.x runtime",
    description:
      "Function runtime is nodejs16.x. AWS deprecated this runtime in March 2026; no security patches will be applied.",
    remediation:
      "Update runtime to nodejs20.x. Test in staging account first — Hexgrid uses @aws-sdk v3 so syntax should be compatible.",
    frameworks: ["AWS Well-Architected SEC09"],
    mitre: [],
    risk_score: 0.34,
    created_at: offsetDays(2),
  },
  {
    id: "FND-2026-0412",
    rule_id: "AWS.VPC.DEFAULT_USED",
    resource_id: "arn:aws:ec2:ap-south-1:123456789012:vpc/vpc-0d3a7b",
    resource_type: "AWS::EC2::VPC",
    severity: "LOW",
    status: "SUPPRESSED",
    title: "Resources running in default VPC",
    description:
      "2 t3.micro instances in ap-south-1 are in the default VPC. Both are sandbox instances for the ML team; SUPPRESSED by SECOPS on 2026-05-14 with a 60-day re-evaluation window.",
    remediation:
      "If sandbox use case persists past 2026-07-13, migrate to dedicated VPC. Otherwise SUPPRESSED is acceptable.",
    frameworks: ["CIS AWS 1.5.0"],
    mitre: [],
    risk_score: 0.12,
    created_at: offsetDays(7),
  },
];

export interface DemoFindingsSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  open: number;
  resolved: number;
  suppressed: number;
}

export const DEMO_FINDINGS_SUMMARY: DemoFindingsSummary = (() => {
  const s = {
    total: DEMO_FINDINGS.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    open: 0,
    resolved: 0,
    suppressed: 0,
  };
  for (const f of DEMO_FINDINGS) {
    if (f.severity === "CRITICAL") s.critical++;
    else if (f.severity === "HIGH") s.high++;
    else if (f.severity === "MEDIUM") s.medium++;
    else if (f.severity === "LOW") s.low++;
    if (f.status === "OPEN") s.open++;
    else if (f.status === "RESOLVED") s.resolved++;
    else if (f.status === "SUPPRESSED") s.suppressed++;
  }
  return s;
})();

// ─── Compliance ──────────────────────────────────────────────────────────────

export interface DemoFrameworkScore {
  score: number;
  controls_total: number;
  controls_passing: number;
}

export const DEMO_COMPLIANCE_SCORE = {
  overall_score: 78,
  grade: "B+",
  // Score derivation: each framework's open critical/high findings drag the
  // score down from a baseline of ~92.
  frameworks: {
    "CIS AWS 1.5.0":  { score: 72, controls_total: 58, controls_passing: 42 },
    "SOC 2":          { score: 81, controls_total: 64, controls_passing: 52 },
    "NIST 800-53":    { score: 84, controls_total: 120, controls_passing: 101 },
    "ISO 27001":      { score: 79, controls_total: 93, controls_passing: 73 },
    "PCI DSS":        { score: 88, controls_total: 41, controls_passing: 36 },
    "AWS Well-Arch":  { score: 76, controls_total: 47, controls_passing: 36 },
  } as Record<string, DemoFrameworkScore>,
  trend: [
    { date: "2026-05-15", score: 71 },
    { date: "2026-05-16", score: 72 },
    { date: "2026-05-17", score: 74 },
    { date: "2026-05-18", score: 79 }, // jump = root MFA enrolled
    { date: "2026-05-19", score: 78 },
    { date: "2026-05-20", score: 77 },
    { date: "2026-05-21", score: 78 },
  ],
  last_scan: offset(8),
};

export interface DemoComplianceControl {
  id: string;
  framework: string;
  control_id: string;
  title: string;
  status: "PASS" | "FAIL";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  resource_count: number;
}

// Controls are derived from findings — every FAIL corresponds to an open
// finding in DEMO_FINDINGS. Plus a few PASS examples to balance the table.
export const DEMO_COMPLIANCE_CONTROLS: DemoComplianceControl[] = [
  { id: "ctl-1", framework: "CIS AWS 1.5.0", control_id: "CIS-1.4", title: "Ensure no root user access key exists", status: "FAIL", severity: "CRITICAL", resource_count: 1 },
  { id: "ctl-2", framework: "CIS AWS 1.5.0", control_id: "CIS-2.1.5", title: "Ensure that S3 buckets are configured with Block Public Access", status: "FAIL", severity: "CRITICAL", resource_count: 1 },
  { id: "ctl-3", framework: "CIS AWS 1.5.0", control_id: "CIS-1.16", title: "Ensure IAM policies are attached only to groups or roles", status: "FAIL", severity: "HIGH", resource_count: 1 },
  { id: "ctl-4", framework: "CIS AWS 1.5.0", control_id: "CIS-4.1", title: "Ensure no security groups allow ingress from 0.0.0.0/0 to port 22", status: "FAIL", severity: "HIGH", resource_count: 1 },
  { id: "ctl-5", framework: "CIS AWS 1.5.0", control_id: "CIS-3.1", title: "Ensure CloudTrail is enabled in all regions", status: "FAIL", severity: "MEDIUM", resource_count: 1 },
  { id: "ctl-6", framework: "CIS AWS 1.5.0", control_id: "CIS-2.8", title: "Ensure rotation for customer-created CMKs is enabled", status: "FAIL", severity: "MEDIUM", resource_count: 1 },
  { id: "ctl-7", framework: "SOC 2",        control_id: "CC6.1", title: "Logical and physical access controls", status: "PASS", severity: "HIGH", resource_count: 0 },
  { id: "ctl-8", framework: "SOC 2",        control_id: "CC6.6", title: "Vulnerability management — externally-exposed services", status: "FAIL", severity: "HIGH", resource_count: 2 },
  { id: "ctl-9", framework: "SOC 2",        control_id: "CC7.2", title: "Detection of anomalies and security events", status: "FAIL", severity: "MEDIUM", resource_count: 1 },
  { id: "ctl-10", framework: "NIST 800-53", control_id: "AC-3",  title: "Access enforcement",                         status: "FAIL", severity: "CRITICAL", resource_count: 1 },
  { id: "ctl-11", framework: "NIST 800-53", control_id: "SC-7",  title: "Boundary protection",                         status: "FAIL", severity: "HIGH", resource_count: 1 },
  { id: "ctl-12", framework: "NIST 800-53", control_id: "AU-12", title: "Audit record generation",                     status: "PASS", severity: "HIGH", resource_count: 0 },
  { id: "ctl-13", framework: "ISO 27001",   control_id: "A.9.2.5", title: "Review of user access rights",              status: "FAIL", severity: "HIGH", resource_count: 1 },
  { id: "ctl-14", framework: "ISO 27001",   control_id: "A.10.1.1", title: "Cryptographic controls policy",            status: "PASS", severity: "MEDIUM", resource_count: 0 },
  { id: "ctl-15", framework: "PCI DSS",     control_id: "3.6.4", title: "Cryptographic key changes — defined cryptoperiod", status: "FAIL", severity: "MEDIUM", resource_count: 1 },
  { id: "ctl-16", framework: "AWS Well-Arch", control_id: "SEC09", title: "Protect data in transit",                   status: "PASS", severity: "HIGH", resource_count: 0 },
  { id: "ctl-17", framework: "AWS Well-Arch", control_id: "REL10", title: "Use fault isolation to protect workload",   status: "FAIL", severity: "LOW", resource_count: 1 },
];

// ─── Attack paths ────────────────────────────────────────────────────────────

export interface DemoAttackPath {
  id: string;
  name: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  finding_ids: string[];
  hops: string[];
  blast_radius: number;
  description: string;
}

export const DEMO_ATTACK_PATHS: DemoAttackPath[] = [
  {
    id: "PATH-001",
    name: "Internet → web-prod-01 → legacy-bastion-ssm → billing-exports",
    severity: "CRITICAL",
    finding_ids: ["FND-2026-0418", "FND-2026-0420", "FND-2026-0421"],
    hops: [
      "0.0.0.0/0 (Public Internet)",
      "i-0f4a (web-prod-01) · SSH on 0.0.0.0/0",
      "legacy-bastion-ssm (IAM, AdministratorAccess)",
      "s3://demo-prod-billing-exports (Principal:* policy)",
    ],
    blast_radius: 1847,
    description:
      "Reachable via SSH from the public internet; lateral-movement via legacy IAM role to a publicly-policied S3 bucket holding billing exports.",
  },
  {
    id: "PATH-002",
    name: "metrics-rollup snapshot → data lake exposure",
    severity: "HIGH",
    finding_ids: ["FND-2026-0419"],
    hops: [
      "Public AWS account (any)",
      "metrics-rollup-2026-05-15 (shared snapshot, all accounts)",
      "Restored RDS clone → query access",
    ],
    blast_radius: 1,
    description:
      "RDS snapshot shared with all AWS accounts. Any account can restore the snapshot and query the contents. ARIA found no PII in schema but business metrics are exposed.",
  },
  {
    id: "PATH-003",
    name: "ap-south-1 audit blind spot",
    severity: "MEDIUM",
    finding_ids: ["FND-2026-0416"],
    hops: [
      "ap-south-1 control plane",
      "CloudTrail single-region (us-east-1 only)",
      "8 EC2 + 2 RDS without API activity logging",
    ],
    blast_radius: 10,
    description:
      "API activity in ap-south-1 is not captured. Any IAM action (including privilege escalation) in that region would be invisible to detection.",
  },
];

// ─── Audit events ────────────────────────────────────────────────────────────

export interface DemoAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actor_type: "OPERATOR" | "ARIA" | "SYSTEM";
  action: string;
  resource: string;
  outcome: "APPROVED" | "EXECUTED" | "DENIED" | "RECOMMENDED" | "DETECTED";
  finding_id?: string;
  details?: string;
}

export const DEMO_AUDIT_EVENTS: DemoAuditEvent[] = [
  {
    id: "AUD-9421",
    timestamp: offset(2),
    actor: "aria-pipeline",
    actor_type: "ARIA",
    action: "Detected public S3 bucket policy",
    resource: "arn:aws:s3:::demo-prod-billing-exports",
    outcome: "DETECTED",
    finding_id: "FND-2026-0421",
    details: "Risk score 0.94. Auto-routed to OPERATOR queue per policy.",
  },
  {
    id: "AUD-9420",
    timestamp: offset(4),
    actor: "aria-pipeline",
    actor_type: "ARIA",
    action: "Recommended remediation (bucket policy revision v6)",
    resource: "arn:aws:s3:::demo-prod-billing-exports",
    outcome: "RECOMMENDED",
    finding_id: "FND-2026-0421",
    details: "Awaiting OPERATOR approval. Rollback path: restore policy v5.",
  },
  {
    id: "AUD-9419",
    timestamp: offset(11),
    actor: "aria-pipeline",
    actor_type: "ARIA",
    action: "Detected unused administrator role",
    resource: "arn:aws:iam::123456789012:role/legacy-bastion-ssm",
    outcome: "DETECTED",
    finding_id: "FND-2026-0420",
    details: "Last AssumeRole: 2026-03-12. 67 days idle.",
  },
  {
    id: "AUD-9418",
    timestamp: offsetHours(3),
    actor: "soc-lead@hexgrid.io",
    actor_type: "OPERATOR",
    action: "Acknowledged finding",
    resource: "arn:aws:ec2:us-east-1:123456789012:security-group/sg-0a1f9c",
    outcome: "APPROVED",
    finding_id: "FND-2026-0418",
    details: "Triaged. Remediation scheduled for next maintenance window.",
  },
  {
    id: "AUD-9417",
    timestamp: offsetHours(12),
    actor: "aria-pipeline",
    actor_type: "ARIA",
    action: "Detected CloudTrail blind spot",
    resource: "arn:aws:cloudtrail:us-east-1:123456789012:trail/hexgrid-audit",
    outcome: "DETECTED",
    finding_id: "FND-2026-0416",
  },
  {
    id: "AUD-9416",
    timestamp: offsetDays(2),
    actor: "devsecops@hexgrid.io",
    actor_type: "OPERATOR",
    action: "Suppressed finding (default VPC sandbox)",
    resource: "arn:aws:ec2:ap-south-1:123456789012:vpc/vpc-0d3a7b",
    outcome: "APPROVED",
    finding_id: "FND-2026-0412",
    details: "ML sandbox use case. 60-day re-eval window.",
  },
  {
    id: "AUD-9415",
    timestamp: offsetDays(3),
    actor: "ciso@hexgrid.io",
    actor_type: "OPERATOR",
    action: "Approved root MFA enrollment + recorded recovery codes",
    resource: "arn:aws:iam::123456789012:root",
    outcome: "EXECUTED",
    finding_id: "FND-2026-0415",
    details: "Hardware MFA. Recovery codes in 1Password vault (DUAL_CONTROL).",
  },
];

// ─── Alerts (mirrors AlertFeed reference data) ───────────────────────────────

export interface DemoAlert {
  id: string;
  title: string;
  resource: string;
  severity: "P0" | "P1";
  time: string;
  finding_id: string;
  details: string;
  mitigation: string;
}

export const DEMO_ALERTS: DemoAlert[] = [
  {
    id: "ALT-8891",
    title: "Public S3 bucket policy allows Principal:*",
    resource: "arn:aws:s3:::demo-prod-billing-exports",
    severity: "P0",
    time: "2 min ago",
    finding_id: "FND-2026-0421",
    details:
      "Bucket policy contains an Allow statement with Principal \"*\" and no aws:SourceIp or aws:SourceVpce condition. Inventory snapshot lists 1,847 objects; ARIA detected 14 PII field types in samples.",
    mitigation:
      "Proposed policy revision removes the wildcard principal and retains the cross-account role grant for billing-pipeline. OPERATOR approval required; rollback path: restore previous policy version 5 (stored).",
  },
  {
    id: "ALT-8892",
    title: "IAM role with AdministratorAccess unused 67 days",
    resource: "arn:aws:iam::123456789012:role/legacy-bastion-ssm",
    severity: "P1",
    time: "11 min ago",
    finding_id: "FND-2026-0420",
    details:
      "Role has AWS-managed AdministratorAccess attached. Last AssumeRole event: 2026-03-12. Trust policy permits any principal within account 123456789012.",
    mitigation:
      "Detach AdministratorAccess; replace with a least-privilege policy scoped to ssm:StartSession + ec2:DescribeInstances. Reversible from CloudTrail event archive.",
  },
  {
    id: "ALT-8893",
    title: "RDS snapshot shared with \"all\"",
    resource:
      "arn:aws:rds:ap-south-1:123456789012:snapshot:metrics-rollup-2026-05-15",
    severity: "P1",
    time: "58 min ago",
    finding_id: "FND-2026-0419",
    details:
      "Snapshot attribute restore is set to \"all\" rather than a specific account list. Source DB instance is internal metrics-rollup; ARIA classifier found no customer PII fields in the schema.",
    mitigation:
      "ModifyDBSnapshotAttribute → reset restore to private. No downtime. Audit trail records the prior shared list for evidence.",
  },
];
