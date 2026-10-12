/**
 * Control surfaces. Returns domain types; DTOs never leave this folder.
 */

import type { Control, ControlResult, ControlStatus, Resource } from "@/lib/domain";
import { apiGet, apiPost } from "./client";
import type { ControlDTO, ControlResultDTO, ResourceDTO } from "./dto/control";
import { toControl, toControlResult, toResource } from "./adapters/control";

export async function fetchControls(): Promise<Control[]> {
  const body = await apiGet<{ controls: ControlDTO[] }>("/api/controls", "controls");
  return (body.controls ?? []).map(toControl);
}

export async function fetchControl(controlId: string): Promise<Control | null> {
  const all = await fetchControls();
  return all.find((c) => c.id === controlId) ?? null;
}

interface ResultsBody {
  results: ControlResultDTO[];
  resources: ResourceDTO[];
}

/** Current result per resource for one control. */
export async function fetchControlResults(controlId: string): Promise<ControlResult[]> {
  const body = await apiGet<ResultsBody>(
    `/api/controls/${encodeURIComponent(controlId)}/results`,
    "control results",
  );
  return (body.results ?? []).map(toControlResult);
}

/** Current results plus the resources they refer to, in one request. */
export async function fetchControlResultsWithResources(
  controlId: string,
): Promise<{ results: ControlResult[]; resources: Resource[] }> {
  const body = await apiGet<ResultsBody>(
    `/api/controls/${encodeURIComponent(controlId)}/results`,
    "control results",
  );
  return { results: (body.results ?? []).map(toControlResult), resources: (body.resources ?? []).map(toResource) };
}

/** Every recorded result for one control, newest first. */
export async function fetchControlHistory(controlId: string): Promise<ControlResult[]> {
  const body = await apiGet<ResultsBody>(
    `/api/controls/${encodeURIComponent(controlId)}/history`,
    "control history",
  );
  return (body.results ?? []).map(toControlResult);
}

/**
 * The resources the product knows about.
 *
 * There is no resource inventory endpoint: a resource is only visible to the
 * product because a control was evaluated against it. So the set is assembled
 * from the results of every evaluated control, de-duplicated by the opaque
 * reference the backend assigns. A resource nothing has evaluated is genuinely
 * not something this product can say anything about.
 */
export async function fetchResources(): Promise<Resource[]> {
  const controls = await fetchControls();
  const evaluated = controls.filter((c) => c.resourcesInScope > 0);
  const byID = new Map<string, Resource>();
  const bodies = await Promise.all(
    evaluated.map((c) =>
      apiGet<ResultsBody>(
        `/api/controls/${encodeURIComponent(c.id)}/results`,
        "control results",
      ).catch(() => ({ results: [], resources: [] }) as ResultsBody),
    ),
  );
  for (const body of bodies) {
    for (const dto of body.resources ?? []) {
      if (!byID.has(dto.id)) byID.set(dto.id, toResource(dto));
    }
  }
  return [...byID.values()];
}

export interface VerifyNowResult {
  controlId: string;
  resourceId: string;
  verificationRunId: string;
  status: ControlStatus;
}

/**
 * verifyControl — "Verify now". resourceId is the same opaque id the
 * resources table already shows for this control; the backend resolves the
 * real target from its own persisted assessment data. This can legitimately
 * take close to two minutes against a live cloud account — the BFF route's
 * own timeout is set well above that, not the ~15s other reads use.
 */
export async function verifyControl(controlId: string, resourceId: string): Promise<VerifyNowResult> {
  return apiPost<VerifyNowResult>(
    `/api/controls/${encodeURIComponent(controlId)}/verify?resource=${encodeURIComponent(resourceId)}`,
    "verify this control now",
  );
}
