import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEMO_RESULT = {
  source: "demo-deployment.json",
  findings: [
    {
      id: "k1", rule_id: "K8S-001", resource_name: "nginx-deploy/nginx",
      resource_kind: "Deployment", namespace: "default",
      severity: "CRITICAL", title: "Container running as privileged",
      detail: "Container nginx runs with privileged: true, granting full host access.",
      remediation: "Set securityContext.privileged: false on every container.",
      frameworks: { "NSA K8s": "3.2", "CIS K8s": "5.2.1" },
    },
    {
      id: "k2", rule_id: "K8S-002", resource_name: "api-server/app",
      resource_kind: "Deployment", namespace: "production",
      severity: "HIGH", title: "Privilege escalation not blocked",
      detail: "Container app does not set allowPrivilegeEscalation: false.",
      remediation: "Set securityContext.allowPrivilegeEscalation: false on every container.",
      frameworks: { "CIS K8s": "5.2.5" },
    },
    {
      id: "k3", rule_id: "K8S-005", resource_name: "worker/processor",
      resource_kind: "DaemonSet", namespace: "kube-system",
      severity: "MEDIUM", title: "No CPU/memory resource limits",
      detail: "Container processor is missing CPU and/or memory limits — enables DoS via resource exhaustion.",
      remediation: "Set resources.limits.cpu and resources.limits.memory on every container.",
      frameworks: { "CIS K8s": "5.2.11" },
    },
    {
      id: "k4", rule_id: "K8S-012", resource_name: "frontend/web",
      resource_kind: "Deployment", namespace: "default",
      severity: "MEDIUM", title: "Container image uses latest tag",
      detail: "Container web uses mutable image tag '' — image drift risk.",
      remediation: "Pin all images to an explicit digest or immutable tag.",
      frameworks: { "CIS K8s": "6.1.3" },
    },
    {
      id: "k5", rule_id: "K8S-013", resource_name: "backend/api",
      resource_kind: "Deployment", namespace: "production",
      severity: "HIGH", title: "Secret value exposed via env var",
      detail: "Container api has plaintext secret in env var: DATABASE_PASSWORD",
      remediation: "Use secretKeyRef or Vault sidecar injection instead of plaintext env values.",
      frameworks: { "CIS K8s": "5.4.1", "SOC2": "CC6.1", "DPDP": "Sec 8" },
    },
    {
      id: "k6", rule_id: "K8S-011", resource_name: "logger/collector",
      resource_kind: "DaemonSet", namespace: "monitoring",
      severity: "HIGH", title: "HostPath volume mounted",
      detail: "HostPath volume 'host-logs' mounted at /var/log — exposes host filesystem.",
      remediation: "Remove hostPath volumes. Use PersistentVolumeClaims instead.",
      frameworks: { "CIS K8s": "5.2.10" },
    },
  ],
  summary: { total: 6, CRITICAL: 1, HIGH: 3, MEDIUM: 2, LOW: 0 },
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

  const body = await req.text();
  const ct = req.headers.get("content-type") ?? "application/json";

  try {
    JSON.parse(body); // validate JSON client-side before forwarding
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${GO_API}/api/k8s/audit`, {
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
