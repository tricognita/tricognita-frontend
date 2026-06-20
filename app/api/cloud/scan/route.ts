import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { randomBytes } from "crypto";
import { getJitToken } from "@/lib/jit-token";
import { notifyScanComplete } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(): Promise<Response> {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const check = secretOrError();
  if (check instanceof Response) {
    return Response.json({
      scan_id: `sim-${randomBytes(4).toString("hex")}`,
      status: "completed",
      message: "Simulation: backend offline. Serving demo state.",
      simulated: true,
      started_at: new Date().toISOString(),
    });
  }
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  try {
    const upstream = await fetch(`${GO_API}/api/cloud/scan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Initiated-By": session.email,
        "X-User-Role": session.role,
      },
      signal: AbortSignal.timeout(55000),
    });
    const result = await upstream.json();
    // Notify on scan completion with findings summary
    const findings = result.findings_count ?? result.total_findings ?? 0;
    const critical = result.critical_count ?? result.critical ?? 0;
    notifyScanComplete(result.account_id || session.email, findings, critical).catch(() => {});
    return Response.json(result, { status: upstream.status });
  } catch {
    return Response.json({
      scan_id: `sim-${randomBytes(4).toString("hex")}`,
      status: "completed",
      message: "Simulation: AWS scan skipped (backend offline).",
      simulated: true,
      started_at: new Date().toISOString(),
    });
  }
}
