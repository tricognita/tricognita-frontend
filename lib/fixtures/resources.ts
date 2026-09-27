import type { CloudProvider, Resource } from "@/lib/domain";

/**
 * 38 resources across the three accounts.
 *
 * Built from literal tables — deterministic, and every id referenced by a
 * control result exists here. Identifiers are masked by construction; the
 * fixtures contain no ARNs.
 */

interface Seed {
  key: string;
  label: string;
  service: string;
  type: string;
  account: string;
  region: "ap-south-1" | "ap-southeast-1";
}

const REGION_LABEL: Record<Seed["region"], string> = {
  "ap-south-1": "AWS Mumbai",
  "ap-southeast-1": "AWS Singapore",
};

const SEEDS: Seed[] = [
  // S3 — 14
  { key: "s3-customer-exports", label: "customer-exports", service: "S3", type: "S3 bucket", account: "acct-prod", region: "ap-south-1" },
  { key: "s3-partner-share", label: "partner-share", service: "S3", type: "S3 bucket", account: "acct-prod", region: "ap-south-1" },
  { key: "s3-app-assets", label: "app-assets", service: "S3", type: "S3 bucket", account: "acct-prod", region: "ap-south-1" },
  { key: "s3-invoices", label: "invoices", service: "S3", type: "S3 bucket", account: "acct-prod", region: "ap-south-1" },
  { key: "s3-backups", label: "db-backups", service: "S3", type: "S3 bucket", account: "acct-prod", region: "ap-southeast-1" },
  { key: "s3-audit-logs", label: "audit-logs", service: "S3", type: "S3 bucket", account: "acct-prod", region: "ap-south-1" },
  { key: "s3-terraform-state", label: "terraform-state", service: "S3", type: "S3 bucket", account: "acct-prod", region: "ap-south-1" },
  { key: "s3-staging-assets", label: "staging-assets", service: "S3", type: "S3 bucket", account: "acct-staging", region: "ap-south-1" },
  { key: "s3-staging-uploads", label: "staging-uploads", service: "S3", type: "S3 bucket", account: "acct-staging", region: "ap-south-1" },
  { key: "s3-staging-logs", label: "staging-logs", service: "S3", type: "S3 bucket", account: "acct-staging", region: "ap-south-1" },
  { key: "s3-analytics-raw", label: "analytics-raw", service: "S3", type: "S3 bucket", account: "acct-data", region: "ap-south-1" },
  { key: "s3-analytics-curated", label: "analytics-curated", service: "S3", type: "S3 bucket", account: "acct-data", region: "ap-south-1" },
  { key: "s3-ml-features", label: "ml-features", service: "S3", type: "S3 bucket", account: "acct-data", region: "ap-south-1" },
  { key: "s3-reports", label: "customer-reports", service: "S3", type: "S3 bucket", account: "acct-prod", region: "ap-south-1" },
  // RDS — 6
  { key: "rds-orders", label: "Orders database", service: "RDS", type: "RDS instance", account: "acct-prod", region: "ap-south-1" },
  { key: "rds-billing", label: "Billing database", service: "RDS", type: "RDS instance", account: "acct-prod", region: "ap-south-1" },
  { key: "rds-identity", label: "Identity database", service: "RDS", type: "RDS instance", account: "acct-prod", region: "ap-south-1" },
  { key: "rds-reporting", label: "Reporting replica", service: "RDS", type: "RDS instance", account: "acct-prod", region: "ap-southeast-1" },
  { key: "rds-staging", label: "Staging database", service: "RDS", type: "RDS instance", account: "acct-staging", region: "ap-south-1" },
  { key: "rds-analytics", label: "Analytics warehouse", service: "RDS", type: "RDS instance", account: "acct-data", region: "ap-south-1" },
  // EC2 / networking — 9
  { key: "sg-web", label: "web-tier", service: "EC2", type: "Security group", account: "acct-prod", region: "ap-south-1" },
  { key: "sg-app", label: "app-tier", service: "EC2", type: "Security group", account: "acct-prod", region: "ap-south-1" },
  { key: "sg-data", label: "data-tier", service: "EC2", type: "Security group", account: "acct-prod", region: "ap-south-1" },
  { key: "sg-bastion", label: "bastion", service: "EC2", type: "Security group", account: "acct-prod", region: "ap-south-1" },
  { key: "sg-staging", label: "staging-all", service: "EC2", type: "Security group", account: "acct-staging", region: "ap-south-1" },
  { key: "ec2-api-1", label: "api-node-1", service: "EC2", type: "EC2 instance", account: "acct-prod", region: "ap-south-1" },
  { key: "ec2-api-2", label: "api-node-2", service: "EC2", type: "EC2 instance", account: "acct-prod", region: "ap-south-1" },
  { key: "ec2-worker", label: "worker-node-1", service: "EC2", type: "EC2 instance", account: "acct-prod", region: "ap-southeast-1" },
  { key: "vpc-prod", label: "production-vpc", service: "VPC", type: "VPC", account: "acct-prod", region: "ap-south-1" },
  // IAM — 4
  { key: "iam-root-prod", label: "Root user", service: "IAM", type: "Root account", account: "acct-prod", region: "ap-south-1" },
  { key: "iam-deploy", label: "deploy-ci", service: "IAM", type: "IAM user", account: "acct-prod", region: "ap-south-1" },
  { key: "iam-analytics", label: "analytics-etl", service: "IAM", type: "IAM user", account: "acct-data", region: "ap-south-1" },
  { key: "iam-support", label: "support-readonly", service: "IAM", type: "IAM role", account: "acct-prod", region: "ap-south-1" },
  // KMS — 3
  { key: "kms-primary", label: "primary-key", service: "KMS", type: "KMS key", account: "acct-prod", region: "ap-south-1" },
  { key: "kms-backups", label: "backup-key", service: "KMS", type: "KMS key", account: "acct-prod", region: "ap-southeast-1" },
  { key: "kms-analytics", label: "analytics-key", service: "KMS", type: "KMS key", account: "acct-data", region: "ap-south-1" },
  // CloudTrail — 2
  { key: "trail-org", label: "organisation-trail", service: "CloudTrail", type: "Trail", account: "acct-prod", region: "ap-south-1" },
  { key: "trail-staging", label: "staging-trail", service: "CloudTrail", type: "Trail", account: "acct-staging", region: "ap-south-1" },
];

const PROVIDER: CloudProvider = "AWS";

export const FIXTURE_RESOURCES: Resource[] = SEEDS.map((s) => ({
  id: s.key,
  label: s.label,
  type: s.type,
  service: s.service,
  provider: PROVIDER,
  accountId: s.account,
  regionLabel: REGION_LABEL[s.region],
  regionCode: s.region,
  identifierMasked: `…/${s.label}`,
}));

export const RESOURCES_BY_ID: Record<string, Resource> = Object.fromEntries(
  FIXTURE_RESOURCES.map((r) => [r.id, r]),
);

/** Resource ids by service — used to build each control's scope. */
export function resourceIdsByService(...services: string[]): string[] {
  return FIXTURE_RESOURCES.filter((r) => services.includes(r.service)).map((r) => r.id);
}

export function resourceIdsByType(...types: string[]): string[] {
  return FIXTURE_RESOURCES.filter((r) => types.includes(r.type)).map((r) => r.id);
}
