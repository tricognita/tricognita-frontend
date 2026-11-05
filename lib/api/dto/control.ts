/**
 * Backend row shapes. These types never leave lib/api — adapters convert them
 * to domain types, and a page only ever sees the domain.
 *
 * They are deliberately permissive about optionality: a backend that stops
 * sending a field should surface as a missing value the adapter handles, not as
 * a runtime crash inside a component.
 */

export interface ControlDTO {
  id: string;
  name: string;
  description: string;
  whyItMatters: string;
  domain: string;
  expectedState: string;
  severity: string;
  provider: string;
  frameworkRefs?: { framework: string; ref: string }[];
  status: string;
  notAssessedReason?: string;
  resourcesInScope?: number;
  resourcesFailing?: number;
  lastVerifiedAt?: string;
  nextVerificationAt?: string;
  verification?: string;
  remediationAvailable?: boolean;
  evidenceRefs?: string[];
}

export interface ControlResultDTO {
  id: string;
  controlId: string;
  resourceId: string;
  runId?: string;
  status: string;
  notAssessedReason?: string;
  checkedAt: string;
  previousStatus?: string;
  detail?: string;
  evidenceId?: string;
}

export interface ResourceDTO {
  id: string;
  label: string;
  type: string;
  service: string;
  provider: string;
  accountId: string;
  regionLabel: string;
  regionCode?: string;
  identifierMasked: string;
}

export interface VerificationRunDTO {
  id: string;
  trigger: string;
  state: string;
  startedAt: string;
  finishedAt?: string;
  requestedBy?: string;
  counts?: { evaluated: number; passed: number; failed: number; notAssessed: number };
  error?: { code: string; message: string };
}

export interface CloudAccountDTO {
  id: string;
  alias: string;
  provider: string;
  accountIdMasked?: string;
  connection: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
  regions?: string[];
  message?: string;
}
