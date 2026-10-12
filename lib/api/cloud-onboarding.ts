import { apiDelete, apiGet, apiPost } from "./client";

/**
 * Cloud account connection: the browser's only path to the Go API's credential and
 * assessment endpoints (through the BFF). Nothing here returns a result the backend
 * did not give; every failure throws so the screen can say what happened.
 */

export interface AwsTrust {
  externalId: string;
  /** The principal a customer role must trust. null when the API cannot determine its own identity. */
  platformPrincipalArn: string | null;
  platformPrincipalError?: string;
}

export async function fetchAwsTrust(): Promise<AwsTrust> {
  const b = await apiGet<{ external_id: string; platform_principal_arn?: string | null; platform_principal_error?: string }>(
    "/api/credentials/aws/external-id",
    "the AWS trust details",
  );
  return {
    externalId: b.external_id,
    platformPrincipalArn: b.platform_principal_arn ?? null,
    platformPrincipalError: b.platform_principal_error,
  };
}

export interface ConnectAws {
  provider: "aws";
  label: string;
  role_arn: string;
  account_id?: string;
  regions: string[];
}
export interface ConnectAzure {
  provider: "azure";
  label: string;
  azure_tenant_id: string;
  azure_client_id: string;
  azure_client_secret: string;
  azure_subscription_id: string;
}

export async function connectAccount(input: ConnectAws | ConnectAzure): Promise<{ id: string }> {
  const b = await apiPost<{ id: string }>("/api/credentials", "connect this account", input);
  return { id: b.id };
}

export interface ConnectionTest {
  ok: boolean;
  /** The provider's own reason when ok is false. */
  error?: string;
  accountId?: string;
  identity?: string;
}

export async function testConnection(id: string): Promise<ConnectionTest> {
  const b = await apiPost<{ ok: boolean; error?: string; account_id?: string; identity?: string }>(
    `/api/credentials/test/${encodeURIComponent(id)}`,
    "test this connection",
  );
  return { ok: b.ok, error: b.error, accountId: b.account_id, identity: b.identity };
}

export interface AssessmentSummary {
  runId: string;
  state: string;
  accountLabel: string;
  provider: string;
  resourcesDiscovered: number;
  controlsEvaluated: number;
  passed: number;
  failed: number;
  drifted: number;
  notAssessed: number;
  discoveryWarning?: string;
  failureReason?: string;
}

export async function runAssessment(cloudAccountId: string): Promise<AssessmentSummary> {
  const b = await apiPost<Record<string, unknown>>("/api/assessments", "verify this account", {
    cloud_account_id: cloudAccountId,
  });
  const n = (k: string) => (typeof b[k] === "number" ? (b[k] as number) : 0);
  const s = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : "");
  return {
    runId: s("run_id"),
    state: s("state"),
    accountLabel: s("account_label"),
    provider: s("provider"),
    resourcesDiscovered: n("resources_discovered"),
    controlsEvaluated: n("controls_evaluated"),
    passed: n("passed"),
    failed: n("failed"),
    drifted: n("drifted"),
    notAssessed: n("not_assessed"),
    discoveryWarning: s("discovery_warning") || undefined,
    failureReason: s("failure_reason") || undefined,
  };
}

export async function disconnectAccount(id: string): Promise<void> {
  await apiDelete("/api/credentials", "disconnect this account", { id });
}
