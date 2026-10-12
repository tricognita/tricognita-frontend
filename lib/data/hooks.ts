"use client";

import useSWR, { useSWRConfig, type SWRConfiguration } from "swr";
import { useCallback, useState } from "react";
import { dataSource, isFixtureData } from "./source";
import { roleMayCallApi } from "@/lib/api-authz";
import { useSession } from "@/lib/use-session";
import { isNotImplemented } from "./types";
import type {
  AlertRoute,
  AssuranceRecord,
  ManualRemediation,
  CloudAccount,
  Control,
  ControlResult,
  DriftEvent,
  Evidence,
  Exception,
  Finding,
  Organisation,
  Remediation,
  Report,
  Resource,
  User,
  VerificationRun,
} from "@/lib/domain";
import type { RemediationOffer } from "@/lib/api/adapters/remediation";
import type { RemediationRequestInput } from "@/lib/api/remediation";
import type { VerifyNowResult } from "@/lib/api/controls";
import type { ManualAppliedInput, ManualProposalInput, ManualVerifyResult } from "@/lib/api/manual-remediation";

/**
 * Domain hooks — the only way a page reads data.
 *
 * No component calls fetch(), useSWR() or the data source directly
 * (FRONTEND_ARCHITECTURE.md §1). Each hook returns the same shape so every
 * screen can render the same state matrix rows:
 *
 *   data · isLoading · error · unavailable · refresh
 *
 * `unavailable` is deliberately distinct from `error`: it means the capability
 * is not built yet, which is a product statement, not a failure.
 */

export interface Query<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  /** The backend does not serve this capability yet. */
  unavailable: boolean;
  refresh: () => void;
}

const BASE: SWRConfiguration = {
  revalidateOnFocus: false,
  shouldRetryOnError: false,
};

/**
 * A null key defers the fetch (still loading); denied means this viewer may
 * not read the resource at all, so it is reported unavailable without a
 * request the edge would refuse.
 */
function useQuery<T>(
  key: string | null,
  load: () => Promise<T>,
  config?: SWRConfiguration,
  denied = false,
): Query<T> {
  const { data, error, isLoading, mutate } = useSWR<T>(denied ? null : key, load, { ...BASE, ...config });
  return {
    data,
    isLoading: denied ? false : key === null ? true : isLoading,
    error: error && !isNotImplemented(error) ? (error as Error) : undefined,
    unavailable: denied || isNotImplemented(error),
    refresh: () => void mutate(),
  };
}

/**
 * Whether the signed-in viewer may read a BFF path, by the same edge rule
 * middleware.ts applies. null while the session is still loading. Fixture data
 * has no edge, so it is always readable.
 */
function useMayRead(path: string): boolean | null {
  const { role, isLoading } = useSession();
  if (isFixtureData) return true;
  if (!role && isLoading) return null;
  return roleMayCallApi(role, path);
}

export const useControls = (): Query<Control[]> =>
  useQuery("controls", () => dataSource.getControls());

export const useControl = (controlId: string): Query<Control | null> =>
  useQuery(`control:${controlId}`, () => dataSource.getControl(controlId));

export const useControlResults = (controlId: string): Query<ControlResult[]> =>
  useQuery(`control-results:${controlId}`, () => dataSource.getControlResults(controlId));

export const useControlHistory = (controlId: string): Query<ControlResult[]> =>
  useQuery(`control-history:${controlId}`, () => dataSource.getControlHistory(controlId));

export const useFindings = (): Query<Finding[]> =>
  useQuery("findings", () => dataSource.getFindings());

export const useFinding = (findingId: string): Query<Finding | null> =>
  useQuery(`finding:${findingId}`, () => dataSource.getFinding(findingId));

export const useResources = (): Query<Resource[]> =>
  useQuery("resources", () => dataSource.getResources());

/**
 * Verification runs poll only while something is actually running, so an idle
 * dashboard makes no requests. SWR accepts a function for refreshInterval, so
 * this stays a single subscription.
 */
export const useVerificationRuns = (): Query<VerificationRun[]> =>
  useQuery("verification-runs", () => dataSource.getVerificationRuns(), {
    refreshInterval: (latest?: VerificationRun[]) =>
      latest?.some((r) => r.state === "VERIFYING" || r.state === "PENDING") ? 5000 : 0,
  });

export const useDriftEvents = (): Query<DriftEvent[]> =>
  useQuery("drift", () => dataSource.getDriftEvents());

export const useExceptions = (): Query<Exception[]> =>
  useQuery("exceptions", () => dataSource.getExceptions());

// Remediation reads sit behind the edge's SECOPS-tier prefix rule. A role the
// edge refuses (AUDITOR) gets "unavailable" rather than a 403 on every page.
export const useRemediations = (): Query<Remediation[]> => {
  const may = useMayRead("/api/remediation");
  return useQuery(may ? "remediations" : null, () => dataSource.getRemediations(), undefined, may === false);
};

export const useRemediationOffers = (controlId?: string): Query<RemediationOffer[]> => {
  const may = useMayRead("/api/remediation/actions");
  return useQuery(
    may ? (controlId ? `remediation-offers:${controlId}` : "remediation-offers") : null,
    () => dataSource.getRemediationOffers(controlId),
    undefined,
    may === false,
  );
};

/**
 * Mutations for the bounded remediation flow.
 *
 * Pessimistic by construction: nothing is written to the cache optimistically
 * and no local state is nudged forward. The screen shows what the server last
 * said until the server says something new, because the thing being reported is
 * whether a customer's cloud changed, and a UI that runs ahead of that would be
 * asserting a fact it does not have.
 *
 * Every mutation revalidates the remediation list and the control state it
 * depends on, so a fix that did not work shows as NOT_EFFECTIVE rather than
 * leaving a stale success on screen.
 */
export interface RemediationMutations {
  request: (input: RemediationRequestInput) => Promise<string>;
  approve: (id: string) => Promise<void>;
  reject: (id: string, reason: string) => Promise<void>;
  apply: (id: string) => Promise<Remediation>;
  pending: boolean;
  error: Error | undefined;
}

export function useRemediationMutations(): RemediationMutations {
  const { mutate } = useSWRConfig();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Revalidate everything a remediation can move: the queue itself, the control
  // results it was meant to fix, and the verification runs and evidence that
  // prove it. A fix changes the product's whole account of the account.
  const revalidate = useCallback(async () => {
    await Promise.all([
      mutate("remediations"),
      mutate("control-results"),
      mutate("controls"),
      mutate("verification-runs"),
      mutate("evidence"),
    ]);
  }, [mutate]);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setPending(true);
      setError(undefined);
      try {
        const out = await fn();
        await revalidate();
        return out;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        // Rethrown, not swallowed: a caller that ignores a failed mutation
        // would render as though it had worked.
        throw err;
      } finally {
        setPending(false);
      }
    },
    [revalidate],
  );

  return {
    request: (input) => run(async () => (await dataSource.requestRemediation(input)).id),
    approve: (id) => run(() => dataSource.approveRemediation(id)),
    reject: (id, reason) => run(() => dataSource.rejectRemediation(id, reason)),
    apply: (id) => run(() => dataSource.executeRemediation(id)),
    pending,
    error,
  };
}

/**
 * "Verify now" — on-demand re-check of one resource against one control.
 *
 * Same pessimistic shape as useRemediationMutations: nothing is guessed while
 * the call is in flight, and every control/result/history/evidence surface
 * this control could have changed is revalidated after, so a fresh PASS,
 * FAIL, DRIFTED or NOT_ASSESSED is what the rest of the screen shows next,
 * not a locally-nudged guess.
 */
export interface VerifyNowMutation {
  verify: (controlId: string, resourceId: string) => Promise<VerifyNowResult>;
  pending: boolean;
  error: Error | undefined;
}

export function useVerifyNow(): VerifyNowMutation {
  const { mutate } = useSWRConfig();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const verify = useCallback(
    async (controlId: string, resourceId: string): Promise<VerifyNowResult> => {
      setPending(true);
      setError(undefined);
      try {
        const result = await dataSource.verifyControl(controlId, resourceId);
        await Promise.all([
          mutate(`control:${controlId}`),
          mutate(`control-results:${controlId}`),
          mutate(`control-history:${controlId}`),
          mutate("controls"),
          mutate("verification-runs"),
          mutate("evidence"),
        ]);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        // Rethrown, not swallowed — see useRemediationMutations for why.
        throw err;
      } finally {
        setPending(false);
      }
    },
    [mutate],
  );

  return { verify, pending, error };
}

// Customer-applied changes sit behind the same edge prefix as automated ones.
export const useManualRemediations = (controlId?: string): Query<ManualRemediation[]> => {
  const may = useMayRead("/api/remediation/manual");
  return useQuery(
    may ? (controlId ? `manual-remediations:${controlId}` : "manual-remediations") : null,
    () => dataSource.getManualRemediations(controlId),
    undefined,
    may === false,
  );
};

/**
 * Customer-applied change mutations. Pessimistic, like every mutation here:
 * nothing on screen moves until the server answers, and after every step the
 * list, the control's state and history, the evidence and the assurance
 * record are revalidated — so what the customer sees next is the server's
 * account, never a guess. A step the server refused (for example because
 * another tab already moved it on) also revalidates, so stale state clears.
 */
export interface ManualRemediationMutations {
  propose: (input: ManualProposalInput) => Promise<string>;
  approve: (id: string) => Promise<void>;
  recordApplied: (id: string, input: ManualAppliedInput) => Promise<void>;
  verify: (id: string) => Promise<ManualVerifyResult>;
  pending: boolean;
  error: Error | undefined;
}

export function useManualRemediationMutations(controlId: string): ManualRemediationMutations {
  const { mutate } = useSWRConfig();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const revalidate = useCallback(async () => {
    await Promise.all([
      mutate(`manual-remediations:${controlId}`),
      mutate("manual-remediations"),
      mutate(`control:${controlId}`),
      mutate(`control-results:${controlId}`),
      mutate(`control-history:${controlId}`),
      mutate("controls"),
      mutate("verification-runs"),
      mutate("evidence"),
      mutate("assurance-record"),
    ]);
  }, [mutate, controlId]);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setPending(true);
      setError(undefined);
      try {
        const out = await fn();
        await revalidate();
        return out;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        await revalidate();
        throw err;
      } finally {
        setPending(false);
      }
    },
    [revalidate],
  );

  return {
    propose: (input) => run(async () => (await dataSource.proposeManualRemediation(input)).id),
    approve: (id) => run(() => dataSource.approveManualRemediation(id)),
    recordApplied: (id, input) => run(() => dataSource.recordManualApplied(id, input)),
    verify: (id) => run(() => dataSource.verifyManualRemediation(id)),
    pending,
    error,
  };
}

export const useAuditEvents = (): Query<import("@/lib/api/audit").AuditPage> => {
  const may = useMayRead("/api/audit/events");
  return useQuery(may ? "audit-events" : null, () => dataSource.getAuditEvents(), undefined, may === false);
};

export const useEvidence = (): Query<Evidence[]> =>
  useQuery("evidence", () => dataSource.getEvidence());

// The record is audit-scoped like the evidence it is drawn from. A role the
// edge would refuse gets "unavailable" rather than a 403.
export const useAssuranceRecord = (): Query<AssuranceRecord> => {
  const may = useMayRead("/api/evidence/record");
  return useQuery(may ? "assurance-record" : null, () => dataSource.getAssuranceRecord(), undefined, may === false);
};

export const useReports = (): Query<Report[]> =>
  useQuery("reports", () => dataSource.getReports());

export const useCloudAccounts = (): Query<CloudAccount[]> =>
  useQuery("cloud-accounts", () => dataSource.getCloudAccounts());

export const useAlertRoutes = (): Query<AlertRoute[]> =>
  useQuery("alert-routes", () => dataSource.getAlertRoutes());

export const useUsers = (): Query<User[]> => useQuery("users", () => dataSource.getUsers());

export const useOrganisation = (): Query<Organisation> =>
  useQuery("organisation", () => dataSource.getOrganisation());
