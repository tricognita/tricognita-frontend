import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEMO_RESULT: object = {
  scan_id: "demo-iac-001",
  file_path: "demo.json",
  findings: [
    {
      id: "if1", rule_id: "S3-002", resource_name: "aws_s3_bucket.main",
      resource_type: "aws_s3_bucket", severity: "HIGH",
      title: "S3 Bucket Versioning Disabled",
      remediation: "Set versioning { enabled = true } on the bucket resource.",
      frameworks: { "CIS AWS": "2.1.3" },
      file_path: "demo.json",
    },
    {
      id: "if2", rule_id: "SG-001", resource_name: "aws_security_group.web",
      resource_type: "aws_security_group", severity: "CRITICAL",
      title: "Security Group Allows Unrestricted Inbound Access (0.0.0.0/0)",
      remediation: "Restrict ingress CIDR blocks to known IP ranges.",
      frameworks: { "CIS AWS": "4.1", "SOC2": "CC6.6" },
      file_path: "demo.json",
    },
    {
      id: "if3", rule_id: "RDS-001", resource_name: "aws_db_instance.postgres",
      resource_type: "aws_db_instance", severity: "HIGH",
      title: "RDS Instance Not Encrypted at Rest",
      remediation: "Set storage_encrypted = true and specify kms_key_id.",
      frameworks: { "PCI-DSS": "3.4", "HIPAA": "§164.312(a)(2)(iv)" },
      file_path: "demo.json",
    },
    {
      id: "if4", rule_id: "IAM-002", resource_name: "aws_iam_policy.admin",
      resource_type: "aws_iam_policy", severity: "CRITICAL",
      title: "IAM Policy Allows Privilege Escalation (iam:*)",
      remediation: "Remove wildcard IAM actions. Define explicit allowed actions.",
      frameworks: { "CIS AWS": "1.16", "NIST CSF": "PR.AC-4" },
      file_path: "demo.json",
    },
    {
      id: "if5", rule_id: "EC2-002", resource_name: "aws_instance.app",
      resource_type: "aws_instance", severity: "MEDIUM",
      title: "EC2 Instance Not Using IMDSv2",
      remediation: "Set metadata_options { http_tokens = \"required\" }.",
      frameworks: { "CIS AWS": "5.6" },
      file_path: "demo.json",
    },
  ],
  summary: { total: 5, critical: 2, high: 2, medium: 1, low: 0 },
  simulated: true,
};

export async function POST(req: Request): Promise<Response> {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const check = secretOrError();
  if (check instanceof Response) return Response.json(DEMO_RESULT);
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  // Forward multipart/json body to backend as-is
  const body = await req.text();
  const ct = req.headers.get("content-type") ?? "application/json";

  try {
    const upstream = await fetch(`${GO_API}/api/iac/scan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Initiated-By": session.email,
        "X-User-Role": session.role,
        "Content-Type": ct,
      },
      body,
      signal: AbortSignal.timeout(55000),
    });
    return Response.json(await upstream.json(), { status: upstream.status });
  } catch {
    return Response.json(DEMO_RESULT);
  }
}
