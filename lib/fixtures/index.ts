/**
 * lib/fixtures — the deterministic development dataset (Acme Technologies).
 *
 * Read through lib/data hooks, never imported by a page directly. Fixture mode
 * is development-only: a production build with NEXT_PUBLIC_DATA_SOURCE=fixtures
 * fails deliberately (lib/data/source.ts).
 */

export { FIXTURE_NOW, daysBefore, daysAfter, hoursBefore, minutesAfter } from "./time";
export { FIXTURE_ORG } from "./org";
export { FIXTURE_ACCOUNTS, FIXTURE_ALERT_ROUTES } from "./accounts";
export { FIXTURE_RESOURCES, RESOURCES_BY_ID } from "./resources";
export { CONTROL_SEEDS } from "./controls";
export { FIXTURE_CONTROLS, FIXTURE_RESULTS, FIXTURE_RUNS, LATEST_RUN_ID } from "./state";
export {
  FIXTURE_FINDINGS,
  FIXTURE_REMEDIATIONS,
  FIXTURE_DRIFT,
  FIXTURE_EXCEPTIONS,
  FIXTURE_EVIDENCE,
  FIXTURE_REPORTS,
  FIXTURE_USERS,
} from "./narrative";
