export interface RemediationSpec {
  remediation_type: string;
  resource_arn: string;
  vuln_id: string;
  parameters: Record<string, unknown>;
  intent: "SECURITY_ENHANCING" | "CONFIGURATION_FIX" | "HYGIENE";
}

export interface Finding {
  resource: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  signature: string;
}

export function findingToSpec(f: Finding): RemediationSpec | null {
  switch (f.type) {
    case "S3_PUBLIC_ACCESS":
      return { remediation_type: "REM-S3-001", resource_arn: f.resource, vuln_id: f.signature, parameters: {}, intent: "CONFIGURATION_FIX" };
    case "S3_UNENCRYPTED":
      return { remediation_type: "REM-S3-002", resource_arn: f.resource, vuln_id: f.signature, parameters: {}, intent: "CONFIGURATION_FIX" };
    case "EC2_IMDSV1_ENABLED":
      return { remediation_type: "REM-EC2-001", resource_arn: f.resource, vuln_id: f.signature, parameters: {}, intent: "SECURITY_ENHANCING" };
    case "EBS_UNENCRYPTED":
      return { remediation_type: "REM-EC2-002", resource_arn: f.resource, vuln_id: f.signature, parameters: {}, intent: "CONFIGURATION_FIX" };
    case "CLOUDTRAIL_MISSING":
      return { remediation_type: "REM-CT-001", resource_arn: f.resource, vuln_id: f.signature, parameters: { audit_s3_bucket: "sentinel-audit-default" }, intent: "SECURITY_ENHANCING" };
    case "VPC_FLOW_LOGS_OFF":
      return { remediation_type: "REM-VPC-001", resource_arn: f.resource, vuln_id: f.signature, parameters: {}, intent: "CONFIGURATION_FIX" };
    default:
      return null;
  }
}
