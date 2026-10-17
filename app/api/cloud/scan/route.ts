import {
  callUpstream,
} from "@/lib/bff-upstream";
import { notifyScanComplete } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(): Promise<Response> {
  return callUpstream({
    path: "/api/cloud/scan",
    method: "POST",
    timeoutMs: 55000,
    onSuccess: (session, body) => {
      const r = (body ?? {}) as Record<string, number | string | undefined>;
      const findings = Number(r.findings_count ?? r.total_findings ?? 0);
      const critical = Number(r.critical_count ?? r.critical ?? 0);
      notifyScanComplete(String(r.account_id || session.email), findings, critical).catch(() => {});
    },
  });
}
