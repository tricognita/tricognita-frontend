export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

// ─── INTENT GATE (CONSTRAINT-3) ───────────────────────────────────────────────
// Server-side intent map mirroring auto-remediation.ts REMEDIATION_TYPE_INTENT.
// Intent enforcement happens on BOTH the frontend BFF and the Go backend so that
// neither layer alone is a single point of bypass for MANUAL_ONLY protection.

const SECURITY_ENHANCING_TYPES = new Set([
  "REM-CT-001", // CloudTrail creation — audit blind-spot if reverted
  "REM-EC2-001", // IMDSv2 enforcement — SSRF vector if reverted
]);

export async function POST(request: Request): Promise<Response> {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);
  const check = secretOrError();
  if (check instanceof Response) return check;
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  // Parse optional body — legacy "Remediate All" calls send no body
  let spec: Record<string, unknown> | null = null;
  try {
    const text = await request.text();
    if (text.trim()) spec = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  // ── Batch form: { specs: RemediationSpec[] } — fan out to single-spec routing ─
  if (spec && Array.isArray((spec as { specs?: unknown }).specs)) {
    const specs = (spec as { specs: Array<{ remediation_type: string; [k: string]: unknown }> }).specs;
    const results = await Promise.all(specs.map(async (s) => {
      const isSecEnhancing = SECURITY_ENHANCING_TYPES.has(s.remediation_type);
      const target = isSecEnhancing ? "/api/approvals" : "/api/remediate";
      const body = isSecEnhancing ? { ...s, status: "PENDING_APPROVAL" } : s;
      try {
        const r = await fetch(`${GO_API}${target}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return { remediation_type: s.remediation_type, status: r.status, queued: isSecEnhancing, ok: r.ok };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { remediation_type: s.remediation_type, error: msg, queued: false, ok: false };
      }
    }));
    return Response.json({
      executed: results.filter(r => !("error" in r) && !r.queued && r.ok),
      queued:   results.filter(r => !("error" in r) && r.queued),
      errors:   results.filter(r => "error" in r || !r.ok),
    }, { status: 202 });
  }

  const remediationType = spec?.remediation_type as string | undefined;

  // ── CONSTRAINT-3: SECURITY_ENHANCING → queue for manual approval ────────────
  // Do NOT forward to the execute endpoint. Create a PENDING_APPROVAL record so
  // a human operator can review and approve via the dashboard approvals panel.
  if (remediationType && SECURITY_ENHANCING_TYPES.has(remediationType)) {
    let upstream: globalThis.Response;
    try {
      upstream = await fetch(`${GO_API}/api/approvals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...spec, status: "PENDING_APPROVAL" }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return Response.json({ error: `Go API unreachable: ${msg}` }, { status: 502 });
    }
    const body = await upstream.json();
    return Response.json(
      { queued_for_approval: true, remediation_type: remediationType, ...body },
      { status: upstream.ok ? 202 : upstream.status }
    );
  }

  // ── CONFIGURATION_FIX / HYGIENE → execute immediately ───────────────────────
  let upstream: globalThis.Response;
  try {
    upstream = await fetch(`${GO_API}/api/remediate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(spec ? { "Content-Type": "application/json" } : {}),
      },
      ...(spec ? { body: JSON.stringify(spec) } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Go API unreachable: ${msg}` }, { status: 502 });
  }

  const body = await upstream.json();
  return Response.json(body, { status: upstream.status });
}
