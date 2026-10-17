import type { Control, ControlResult, Finding, Resource } from "@/lib/domain";
import { fetchControlHistory, fetchControlResultsWithResources, fetchControls } from "./controls";

/**
 * Findings, as the product defines them: one resource currently failing one control.
 *
 * The backend has no separate findings store for the product; the control results
 * ARE the findings, so they are derived here from the persisted results rather than
 * invented. A finding exists only while its latest result is FAIL; a resource that
 * later passes is simply no longer listed (resolution history is the control history).
 * firstSeenAt is the start of the current unbroken run of FAIL results for that
 * resource, from the recorded history, so it is never earlier than what was observed.
 * Remediation steps are not held by the backend, so none are shown.
 */

const findingId = (controlId: string, resourceId: string) => `${controlId}::${resourceId}`;

export async function fetchFindings(): Promise<Finding[]> {
  const controls = await fetchControls();
  const failing = controls.filter((c) => c.resourcesFailing > 0);
  if (failing.length === 0) return [];
  const resourceById = new Map<string, Resource>();

  // One results request and one history request per FAILING control only.
  const perControl = await Promise.all(
    failing.map(async (c: Control) => {
      const [{ results: current, resources }, history] = await Promise.all([
        fetchControlResultsWithResources(c.id),
        fetchControlHistory(c.id),
      ]);
      for (const r of resources) resourceById.set(r.id, r);
      return { control: c, current, history };
    }),
  );

  const out: Finding[] = [];
  for (const { control, current, history } of perControl) {
    for (const r of current) {
      if (r.status !== "FAIL") continue;
      out.push({
        id: findingId(control.id, r.resourceId),
        controlId: control.id,
        resourceId: r.resourceId,
        title: `${control.name}: ${resourceById.get(r.resourceId)?.label ?? "resource"}`,
        severity: control.severity,
        status: control.exception ? "EXCEPTION" : "OPEN",
        firstSeenAt: firstSeen(history, r),
        lastSeenAt: r.checkedAt,
        remediationSteps: [],
      });
    }
  }
  return out;
}

function firstSeen(history: ControlResult[], latest: ControlResult): string {
  // History is newest first; walk back while the resource kept failing.
  let first = latest.checkedAt;
  for (const h of history) {
    if (h.resourceId !== latest.resourceId) continue;
    if (h.status !== "FAIL") break;
    first = h.checkedAt;
  }
  return first;
}

export async function fetchFinding(id: string): Promise<Finding | null> {
  return (await fetchFindings()).find((f) => f.id === id) ?? null;
}
