import type { ControlDomain, FrameworkRef, Severity } from "@/lib/domain";
import { resourceIdsByType } from "./resources";

/**
 * The 27-control V1 catalogue (TRICOGNITA_V1_PRODUCT_DEFINITION.md §11.2).
 *
 * Catalogue only: identity, wording and scope. Status is derived in state.ts
 * from verification results, never written here — only a run may decide whether
 * a control passes.
 */

export interface ControlSeed {
  id: string;
  name: string;
  description: string;
  whyItMatters: string;
  domain: ControlDomain;
  expectedState: string;
  severity: Severity;
  frameworkRefs: FrameworkRef[];
  /** Resource ids this control is evaluated against. */
  scope: string[];
  remediationAvailable: boolean;
}

const iam = () => resourceIdsByType("Root account", "IAM user", "IAM role");
const trails = () => resourceIdsByType("Trail");
const buckets = () => resourceIdsByType("S3 bucket");
const databases = () => resourceIdsByType("RDS instance");
const groups = () => resourceIdsByType("Security group");
const network = () => [...resourceIdsByType("Security group"), ...resourceIdsByType("VPC")];
const instances = () => resourceIdsByType("EC2 instance");
const keys = () => resourceIdsByType("KMS key");
const root = () => resourceIdsByType("Root account");

export const CONTROL_SEEDS: ControlSeed[] = [
  // ── Identity ──────────────────────────────────────────────────────────────
  {
    id: "TC-IAM-01", name: "Root account has multi-factor authentication", domain: "IDENTITY",
    description: "The account's root user must have MFA enabled.",
    whyItMatters: "The root user can do anything in the account, including removing every other control. A password alone is not enough.",
    expectedState: "MFA enabled on the root user", severity: "CRITICAL",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "1.4" }, { framework: "SOC2", ref: "CC6.1" }],
    scope: root(), remediationAvailable: false,
  },
  {
    id: "TC-IAM-02", name: "No long-lived root access keys", domain: "IDENTITY",
    description: "The root user must not have access keys.",
    whyItMatters: "A root access key is a permanent, unrestricted credential. If it leaks, nothing limits the damage.",
    expectedState: "No access keys on the root user", severity: "CRITICAL",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "1.3" }],
    scope: root(), remediationAvailable: false,
  },
  {
    id: "TC-IAM-03", name: "Console users have multi-factor authentication", domain: "IDENTITY",
    description: "Every user with console access must have MFA registered.",
    whyItMatters: "Stolen passwords are the most common way into a cloud account.",
    expectedState: "MFA registered for every console user", severity: "HIGH",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "1.9" }, { framework: "SOC2", ref: "CC6.1" }, { framework: "ISO27001", ref: "A.9.4.2" }],
    scope: iam(), remediationAvailable: false,
  },
  {
    id: "TC-IAM-04", name: "Access keys rotated within 90 days", domain: "IDENTITY",
    description: "Access keys older than 90 days must be rotated.",
    whyItMatters: "The longer a key lives, the more places it has been copied to.",
    expectedState: "No access key older than 90 days", severity: "MEDIUM",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "1.13" }],
    scope: iam(), remediationAvailable: false,
  },
  {
    id: "TC-IAM-05", name: "Unused credentials removed after 45 days", domain: "IDENTITY",
    description: "Credentials unused for 45 days must be disabled or removed.",
    whyItMatters: "Dormant credentials are rarely monitored and often belong to people who have left.",
    expectedState: "No credential unused for more than 45 days", severity: "MEDIUM",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "1.11" }],
    scope: iam(), remediationAvailable: false,
  },
  {
    id: "TC-IAM-06", name: "No unapproved full administrative access", domain: "IDENTITY",
    description: "Identities must not carry full administrative permissions outside the approved list.",
    whyItMatters: "Broad permissions turn a small mistake or a single stolen credential into a full compromise.",
    expectedState: "Administrative access limited to approved identities", severity: "HIGH",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "1.16" }, { framework: "SOC2", ref: "CC6.3" }],
    scope: iam(), remediationAvailable: false,
  },

  // ── Logging ───────────────────────────────────────────────────────────────
  {
    id: "TC-LOG-01", name: "Audit logging enabled across all regions", domain: "LOGGING",
    description: "A multi-region trail must record management events.",
    whyItMatters: "Without an audit log you cannot answer what happened, when, or who did it.",
    expectedState: "Multi-region trail enabled with management events", severity: "HIGH",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "3.1" }, { framework: "SOC2", ref: "CC7.2" }],
    scope: trails(), remediationAvailable: false,
  },
  {
    id: "TC-LOG-02", name: "Audit log integrity protection enabled", domain: "LOGGING",
    description: "Log file validation must be enabled on the trail.",
    whyItMatters: "An audit log that can be edited without trace proves nothing to a reviewer.",
    expectedState: "Log file validation enabled", severity: "MEDIUM",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "3.2" }],
    scope: trails(), remediationAvailable: false,
  },
  {
    id: "TC-LOG-03", name: "Audit logs retained for at least 365 days", domain: "LOGGING",
    description: "Audit log storage must retain records for a year or more.",
    whyItMatters: "India's DPDP rules require a year of logs, and investigations routinely look back further than 90 days.",
    expectedState: "Retention of 365 days or more", severity: "HIGH",
    frameworkRefs: [{ framework: "DPDP", ref: "Rule 6" }, { framework: "ISO27001", ref: "A.12.4.1" }],
    scope: trails(), remediationAvailable: false,
  },
  {
    id: "TC-LOG-04", name: "Threat detection service enabled", domain: "LOGGING",
    description: "The provider's threat detection service must be enabled in active regions.",
    whyItMatters: "It is the cheapest way to hear about credential abuse you would otherwise miss.",
    expectedState: "Threat detection enabled in every active region", severity: "MEDIUM",
    frameworkRefs: [{ framework: "SOC2", ref: "CC7.2" }],
    scope: trails(), remediationAvailable: false,
  },
  {
    id: "TC-LOG-05", name: "Configuration recording enabled", domain: "LOGGING",
    description: "Resource configuration history must be recorded.",
    whyItMatters: "Configuration history is how you find the change that broke a control.",
    expectedState: "Configuration recorder enabled", severity: "MEDIUM",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "3.3" }],
    scope: trails(), remediationAvailable: false,
  },
  {
    id: "TC-LOG-06", name: "Network flow logs enabled", domain: "LOGGING",
    description: "Flow logs must be enabled for production networks.",
    whyItMatters: "Without flow logs there is no record of what talked to what during an incident.",
    expectedState: "Flow logs enabled on every VPC", severity: "MEDIUM",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "3.7" }],
    scope: resourceIdsByType("VPC"), remediationAvailable: false,
  },

  // ── Storage ───────────────────────────────────────────────────────────────
  {
    id: "TC-DATA-01", name: "Public access blocked at account level", domain: "STORAGE",
    description: "Account-level public access block must be enabled.",
    whyItMatters: "It is the backstop that prevents one careless bucket policy from exposing data.",
    expectedState: "Account-level public access block enabled", severity: "HIGH",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "2.1.4" }],
    scope: root(), remediationAvailable: true,
  },
  {
    id: "TC-DATA-02", name: "No storage bucket is public", domain: "STORAGE",
    description: "No bucket may allow public read or write access.",
    whyItMatters: "Anyone with the link can read the contents, and exported files often contain customer personal data.",
    expectedState: "Block Public Access enabled on every bucket", severity: "CRITICAL",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "2.1.4" }, { framework: "SOC2", ref: "CC6.1" }, { framework: "DPDP", ref: "Rule 6" }],
    scope: buckets(), remediationAvailable: true,
  },
  {
    id: "TC-DATA-03", name: "Storage requires encrypted transport", domain: "STORAGE",
    description: "Bucket policies must require TLS.",
    whyItMatters: "Without it, a misconfigured client can send your data over plain HTTP.",
    expectedState: "TLS required by bucket policy", severity: "MEDIUM",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "2.1.1" }],
    scope: buckets(), remediationAvailable: false,
  },
  {
    id: "TC-DATA-04", name: "Databases are not publicly accessible", domain: "STORAGE",
    description: "Database instances must not be reachable from the internet.",
    whyItMatters: "A public database is scanned within minutes of being exposed.",
    expectedState: "Public accessibility disabled", severity: "CRITICAL",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "2.2.3" }, { framework: "SOC2", ref: "CC6.6" }],
    scope: databases(), remediationAvailable: true,
  },
  {
    id: "TC-DATA-05", name: "Database snapshots are not public", domain: "STORAGE",
    description: "Snapshots must not be shared publicly.",
    whyItMatters: "A public snapshot hands over a full copy of the database.",
    expectedState: "No public snapshots", severity: "HIGH",
    frameworkRefs: [{ framework: "SOC2", ref: "CC6.1" }],
    scope: databases(), remediationAvailable: false,
  },

  // ── Network ───────────────────────────────────────────────────────────────
  {
    id: "TC-NET-01", name: "Remote administration ports closed to the internet", domain: "NETWORK",
    description: "Security groups must not allow 22 or 3389 from anywhere.",
    whyItMatters: "Open SSH and RDP are among the most exploited exposures in cloud environments.",
    expectedState: "No 0.0.0.0/0 access to ports 22 or 3389", severity: "CRITICAL",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "5.3" }, { framework: "SOC2", ref: "CC6.6" }],
    scope: groups(), remediationAvailable: true,
  },
  {
    id: "TC-NET-02", name: "Default network rules deny traffic", domain: "NETWORK",
    description: "Default security groups must allow no inbound or outbound traffic.",
    whyItMatters: "Resources launched without an explicit group inherit the default one.",
    expectedState: "Default security group empty", severity: "MEDIUM",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "5.5" }],
    scope: network(), remediationAvailable: true,
  },
  {
    id: "TC-NET-03", name: "Instance metadata requires tokens", domain: "NETWORK",
    description: "Instances must require IMDSv2.",
    whyItMatters: "Version 1 lets a server-side request forgery bug read the instance's credentials.",
    expectedState: "IMDSv2 required on every instance", severity: "HIGH",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "5.7" }],
    scope: instances(), remediationAvailable: false,
  },

  // ── Encryption ────────────────────────────────────────────────────────────
  {
    id: "TC-ENC-01", name: "Databases encrypted at rest", domain: "ENCRYPTION",
    description: "Database storage must be encrypted.",
    whyItMatters: "Encryption at rest is the first question on almost every customer security review.",
    expectedState: "Encryption at rest enabled", severity: "HIGH",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "2.2.1" }, { framework: "DPDP", ref: "Rule 6" }, { framework: "ISO27001", ref: "A.10.1.1" }],
    scope: databases(), remediationAvailable: false,
  },
  {
    id: "TC-ENC-02", name: "Block storage encrypted by default", domain: "ENCRYPTION",
    description: "Default encryption must be enabled for block storage.",
    whyItMatters: "Without the default, one unencrypted volume is created the first time someone is in a hurry.",
    expectedState: "Default block storage encryption enabled", severity: "MEDIUM",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "5.1.1" }],
    scope: instances(), remediationAvailable: false,
  },
  {
    id: "TC-ENC-03", name: "Customer-managed key rotation enabled", domain: "ENCRYPTION",
    description: "Customer-managed keys must have rotation enabled.",
    whyItMatters: "A key that never rotates is a single point of failure for every object it protects.",
    expectedState: "Rotation enabled on customer-managed keys", severity: "MEDIUM",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "3.6" }],
    scope: keys(), remediationAvailable: false,
  },

  // ── Account ───────────────────────────────────────────────────────────────
  {
    id: "TC-ACC-01", name: "Security contact configured", domain: "ACCOUNT",
    description: "The account must have a security contact.",
    whyItMatters: "It is how the provider reaches you when they detect a compromise in your account.",
    expectedState: "Security contact set on the account", severity: "LOW",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "1.2" }],
    scope: root(), remediationAvailable: false,
  },

  // ── Resilience ────────────────────────────────────────────────────────────
  {
    id: "TC-RES-01", name: "Database backups enabled with 7-day retention", domain: "RESILIENCE",
    description: "Automated backups must be enabled and retained for at least seven days.",
    whyItMatters: "Backups are the only control that helps after data is deleted or encrypted by an attacker.",
    expectedState: "Automated backups with 7+ day retention", severity: "HIGH",
    frameworkRefs: [{ framework: "SOC2", ref: "A1.2" }, { framework: "ISO27001", ref: "A.12.3.1" }],
    scope: databases(), remediationAvailable: false,
  },
  {
    id: "TC-RES-02", name: "Versioning enabled on critical storage", domain: "RESILIENCE",
    description: "Designated critical buckets must have versioning enabled.",
    whyItMatters: "Versioning is what lets you recover an object that was overwritten or deleted.",
    expectedState: "Versioning enabled on designated buckets", severity: "MEDIUM",
    frameworkRefs: [{ framework: "SOC2", ref: "A1.2" }],
    scope: buckets(), remediationAvailable: false,
  },
  {
    id: "TC-RES-03", name: "Encryption keys protected from deletion", domain: "RESILIENCE",
    description: "Keys must not be pending deletion, and recovery protection must be on.",
    whyItMatters: "Deleting a key destroys every object it protects, and the loss is not recoverable.",
    expectedState: "No key pending deletion", severity: "HIGH",
    frameworkRefs: [{ framework: "ISO27001", ref: "A.10.1.2" }],
    scope: keys(), remediationAvailable: false,
  },
];
