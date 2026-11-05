/**
 * DTO → domain. The only place a backend shape becomes a product type.
 *
 * Adapters are defensive on purpose. A value the backend sends that the domain
 * does not recognise is coerced to the honest fallback rather than passed
 * through: an unknown status becomes NOT_ASSESSED, never PASS. The product's
 * rule is that it may not claim a control passes unless it was told so in a
 * word it understands.
 */

import {
  CONTROL_STATUS,
  NOT_ASSESSED_REASON,
  SEVERITY,
  VERIFICATION_STATE,
  type Control,
  type ControlDomain,
  type ControlResult,
  type ControlStatus,
  type FrameworkId,
  type NotAssessedReason,
  type Resource,
  type Severity,
  type VerificationRun,
  type VerificationState,
} from "@/lib/domain";
import type {
  CloudAccountDTO,
  ControlDTO,
  ControlResultDTO,
  ResourceDTO,
  VerificationRunDTO,
} from "../dto/control";
import type { CloudAccount, AccountConnection, CloudProvider } from "@/lib/domain";

const DOMAINS: ControlDomain[] = [
  "IDENTITY", "LOGGING", "STORAGE", "NETWORK", "ENCRYPTION", "ACCOUNT", "RESILIENCE",
];
const FRAMEWORKS: FrameworkId[] = ["CIS_AWS", "SOC2", "ISO27001", "DPDP"];
const PROVIDERS: CloudProvider[] = ["AWS", "AZURE", "GCP"];
const CONNECTIONS: AccountConnection[] = [
  "CONNECTING", "CONNECTED", "DISCONNECTED", "PERMISSION_FAILURE", "SCAN_FAILURE",
];

/** An unknown status is not a pass. It is a control nobody can vouch for. */
function toStatus(raw: string): ControlStatus {
  return raw in CONTROL_STATUS ? (raw as ControlStatus) : "NOT_ASSESSED";
}

function toReason(raw: string | undefined): NotAssessedReason | undefined {
  if (!raw) return undefined;
  return raw in NOT_ASSESSED_REASON ? (raw as NotAssessedReason) : "PROVIDER_ERROR";
}

function toSeverity(raw: string): Severity {
  return raw in SEVERITY ? (raw as Severity) : "MEDIUM";
}

function toVerification(raw: string | undefined): VerificationState {
  return raw && raw in VERIFICATION_STATE ? (raw as VerificationState) : "PENDING";
}

function oneOf<T extends string>(raw: string, allowed: T[], fallback: T): T {
  return (allowed as string[]).includes(raw) ? (raw as T) : fallback;
}

export function toControl(dto: ControlDTO): Control {
  const status = toStatus(dto.status);
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    whyItMatters: dto.whyItMatters,
    domain: oneOf(dto.domain, DOMAINS, "ACCOUNT"),
    expectedState: dto.expectedState,
    severity: toSeverity(dto.severity),
    provider: oneOf(dto.provider, PROVIDERS, "AWS"),
    frameworkRefs: (dto.frameworkRefs ?? [])
      .filter((r) => (FRAMEWORKS as string[]).includes(r.framework))
      .map((r) => ({ framework: r.framework as FrameworkId, ref: r.ref })),
    status,
    // A reason is only meaningful alongside NOT_ASSESSED; carrying one on a
    // PASS would let a UI render "passing — no permission".
    notAssessedReason: status === "NOT_ASSESSED" ? toReason(dto.notAssessedReason) : undefined,
    resourcesInScope: dto.resourcesInScope ?? 0,
    resourcesFailing: dto.resourcesFailing ?? 0,
    lastVerifiedAt: dto.lastVerifiedAt || undefined,
    nextVerificationAt: dto.nextVerificationAt || undefined,
    verification: toVerification(dto.verification),
    remediationAvailable: dto.remediationAvailable ?? false,
    evidenceRefs: dto.evidenceRefs ?? [],
  };
}

export function toControlResult(dto: ControlResultDTO): ControlResult {
  const status = toStatus(dto.status);
  // ControlResult's status is the narrower three, because a per-resource
  // observation is one of those; DRIFTED is a control-level transition.
  const narrowed: ControlResult["status"] =
    status === "PASS" || status === "FAIL" ? status : status === "DRIFTED" ? "FAIL" : "NOT_ASSESSED";
  return {
    id: dto.id,
    controlId: dto.controlId,
    resourceId: dto.resourceId,
    runId: dto.runId ?? "",
    status: narrowed,
    notAssessedReason: narrowed === "NOT_ASSESSED" ? toReason(dto.notAssessedReason) : undefined,
    checkedAt: dto.checkedAt,
    evidenceId: dto.evidenceId || undefined,
    previousStatus: dto.previousStatus ? toStatus(dto.previousStatus) : undefined,
  };
}

export function toResource(dto: ResourceDTO): Resource {
  return {
    id: dto.id,
    label: dto.label,
    type: dto.type,
    service: dto.service,
    provider: oneOf(dto.provider, PROVIDERS, "AWS"),
    accountId: dto.accountId,
    regionLabel: dto.regionLabel,
    regionCode: dto.regionCode || undefined,
    identifierMasked: dto.identifierMasked,
  };
}

export function toVerificationRun(dto: VerificationRunDTO): VerificationRun {
  const counts = dto.counts ?? { evaluated: 0, passed: 0, failed: 0, notAssessed: 0 };
  return {
    id: dto.id,
    trigger: oneOf(dto.trigger, ["SCHEDULED", "MANUAL", "POST_REMEDIATION"] as const as VerificationRun["trigger"][], "SCHEDULED"),
    state: toVerification(dto.state),
    startedAt: dto.startedAt,
    finishedAt: dto.finishedAt || undefined,
    scope: {},
    counts,
    requestedBy: dto.requestedBy || undefined,
    error: dto.error,
  };
}

export function toCloudAccount(dto: CloudAccountDTO): CloudAccount {
  return {
    id: dto.id,
    alias: dto.alias,
    provider: oneOf(dto.provider.toUpperCase(), PROVIDERS, "AWS"),
    // The backend sends a masked identifier or nothing at all; the product
    // never receives the full account number, so there is nothing to mask here.
    accountIdMasked: dto.accountIdMasked || "••••",
    connection: oneOf(dto.connection, CONNECTIONS, "CONNECTING"),
    connectedAt: dto.connectedAt || undefined,
    lastVerifiedAt: dto.lastVerifiedAt || undefined,
    regions: dto.regions ?? [],
    message: dto.message || undefined,
  };
}
