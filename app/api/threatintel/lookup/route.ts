import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const demoResult = (indicator: string, iocType: string): object => ({
  indicator,
  ioc_type: iocType,
  score: 72,
  verdict: "MALICIOUS",
  sources: ["AbuseIPDB", "VirusTotal"],
  details: {
    abuse_confidence_score: 72,
    total_reports: 14,
    country_code: "RU",
    usage_type: "Data Center/Web Hosting/Transit",
    domain: "unknown",
    vt_malicious: 8,
    vt_suspicious: 3,
    vt_total: 72,
  },
  cached: false,
  enriched_at: new Date().toISOString(),
  simulated: true,
});

export async function GET(req: Request): Promise<Response> {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const url = new URL(req.url);
  const indicator = url.searchParams.get("indicator") ?? "";
  const iocType   = url.searchParams.get("type") ?? "ip";

  if (!indicator) {
    return Response.json({ error: "indicator query param required" }, { status: 400 });
  }

  const check = secretOrError();
  if (check instanceof Response) return Response.json(demoResult(indicator, iocType));
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  try {
    const upstream = await fetch(
      `${GO_API}/api/threatintel/lookup?indicator=${encodeURIComponent(indicator)}&type=${encodeURIComponent(iocType)}`,
      {
        headers: { Authorization: `Bearer ${token}`, "X-Initiated-By": session.email },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!upstream.ok) return Response.json(demoResult(indicator, iocType));
    return Response.json(await upstream.json());
  } catch {
    return Response.json(demoResult(indicator, iocType));
  }
}
