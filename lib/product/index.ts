/**
 * lib/product — domain components (Tier 2).
 *
 * They take domain objects as props and never fetch. Tier 1 primitives
 * (lib/ui) must not import from here.
 */
export {
  ControlStatusBadge,
  VerificationStatusBadge,
  FindingStatusBadge,
  RemediationStatusBadge,
  SeverityBadge,
  ProviderBadge,
  ReportStateBadge,
  EvidenceIntegrityBadge,
  AccountConnectionBadge,
  UserStatusBadge,
} from "./StatusBadges";
export { AssuranceCounts } from "./AssuranceCounts";
export { ControlsTable } from "./ControlsTable";
export { FindingsTable } from "./FindingsTable";
export { FindingFilters } from "./FindingFilters";
export { RemediationSteps } from "./RemediationSteps";
export { RemediationCard } from "./RemediationCard";
export { RemediationQueueView } from "./RemediationQueueView";
export { ControlFilters } from "./ControlFilters";
export { ControlResultList } from "./ControlResultList";
export { ControlHistory } from "./ControlHistory";
export { AttentionList } from "./AttentionList";
export { VerificationSummary } from "./VerificationSummary";
export { VerificationRunsTable } from "./VerificationRunsTable";
export { DriftList } from "./DriftList";
export { ExceptionsList } from "./ExceptionsList";
export { DriftSummary } from "./DriftSummary";
export { ProofLinks } from "./ProofLinks";
export { ReportCard } from "./ReportCard";
export { EvidenceCard } from "./EvidenceCard";
export { EvidenceList } from "./EvidenceList";
export { FixtureBanner } from "./FixtureBanner";
export { PRODUCT_NAV, PRODUCT_BASE, isNavItemActive } from "./navigation";
export type { NavItem, NavSection } from "./navigation";
