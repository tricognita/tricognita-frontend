import * as React from "react";
import { Badge } from "@/lib/ui";
import {
  ACCOUNT_CONNECTION,
  CONTROL_STATUS,
  EVIDENCE_INTEGRITY,
  FINDING_STATUS,
  NOT_ASSESSED_REASON,
  PROVIDER_LABEL,
  PROVIDER_READINESS,
  PROVIDER_READINESS_LABEL,
  REMEDIATION_STATE,
  REPORT_STATE,
  SEVERITY,
  USER_STATUS,
  VERIFICATION_STATE,
  type CloudProvider,
  type AccountConnection,
  type ControlStatus,
  type EvidenceIntegrity,
  type FindingStatus,
  type NotAssessedReason,
  type RemediationState,
  type ReportState,
  type Severity,
  type UserStatus,
  type StatusPresentation,
  type VerificationState,
} from "@/lib/domain";

/**
 * Domain status wrappers.
 *
 * One place decides how a status looks, so PASS looks the same on Overview, in
 * a table row and in a report. Pages must use these instead of choosing a Badge
 * intent themselves.
 *
 * Colour never carries the meaning alone: each badge renders its label, and the
 * shape marker distinguishes states that share an intent — most importantly
 * DRIFTED (a regression) from FAIL (never passed).
 */

const SHAPE_MARK: Record<StatusPresentation["shape"], string> = {
  dot: "●",
  square: "■",
  half: "◧",
  ring: "◎",
  hollow: "○",
  diamond: "◈",
  dash: "–",
};

function StatusBadge({
  presentation,
  title,
  size = "sm",
}: {
  presentation: StatusPresentation;
  title?: string;
  size?: "xs" | "sm" | "md";
}) {
  return (
    <Badge intent={presentation.intent} size={size} title={title ?? presentation.meaning}>
      <span aria-hidden="true" className="mr-1">
        {SHAPE_MARK[presentation.shape]}
      </span>
      {presentation.label}
    </Badge>
  );
}

export function ControlStatusBadge({
  status,
  reason,
  size,
}: {
  status: ControlStatus;
  reason?: NotAssessedReason;
  size?: "xs" | "sm" | "md";
}) {
  const p = CONTROL_STATUS[status];
  const title =
    status === "NOT_ASSESSED" && reason ? `${p.meaning} ${NOT_ASSESSED_REASON[reason]}.` : p.meaning;
  return <StatusBadge presentation={p} title={title} size={size} />;
}

export const VerificationStatusBadge = ({ state, size }: { state: VerificationState; size?: "xs" | "sm" | "md" }) => (
  <StatusBadge presentation={VERIFICATION_STATE[state]} size={size} />
);

export const FindingStatusBadge = ({ status, size }: { status: FindingStatus; size?: "xs" | "sm" | "md" }) => (
  <StatusBadge presentation={FINDING_STATUS[status]} size={size} />
);

export const RemediationStatusBadge = ({ state, size }: { state: RemediationState; size?: "xs" | "sm" | "md" }) => (
  <StatusBadge presentation={REMEDIATION_STATE[state]} size={size} />
);

export const SeverityBadge = ({ severity, size }: { severity: Severity; size?: "xs" | "sm" | "md" }) => (
  <StatusBadge presentation={SEVERITY[severity]} size={size} />
);

export const AccountConnectionBadge = ({
  connection,
  size,
}: {
  connection: AccountConnection;
  size?: "xs" | "sm" | "md";
}) => <StatusBadge presentation={ACCOUNT_CONNECTION[connection]} size={size} />;

export const UserStatusBadge = ({ status, size }: { status: UserStatus; size?: "xs" | "sm" | "md" }) => (
  <StatusBadge presentation={USER_STATUS[status]} size={size} />
);

export const ReportStateBadge = ({ state, size }: { state: ReportState; size?: "xs" | "sm" | "md" }) => (
  <StatusBadge presentation={REPORT_STATE[state]} size={size} />
);

/**
 * Integrity is the one status that must never be softened: a record that no
 * longer matches its hash says so in full, in the same place a passing check
 * would have appeared.
 */
export const EvidenceIntegrityBadge = ({
  integrity,
  size,
}: {
  integrity: EvidenceIntegrity;
  size?: "xs" | "sm" | "md";
}) => <StatusBadge presentation={EVIDENCE_INTEGRITY[integrity]} size={size} />;

/**
 * ProviderBadge — states plainly what Tricognita supports today. A provider
 * that is not validated is visible but never shown as working.
 */
export function ProviderBadge({ provider, size = "sm" }: { provider: CloudProvider; size?: "xs" | "sm" | "md" }) {
  const readiness = PROVIDER_READINESS[provider];
  const intent = readiness === "SUPPORTED" ? "neutral" : "warning";
  return (
    <Badge intent={intent} size={size} title={PROVIDER_READINESS_LABEL[readiness]}>
      {PROVIDER_LABEL[provider]}
      {readiness !== "SUPPORTED" && (
        <span className="ml-1 opacity-80">· {PROVIDER_READINESS_LABEL[readiness]}</span>
      )}
    </Badge>
  );
}
