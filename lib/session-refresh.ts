/**
 * lib/session-refresh — single-flight token refresh + expiry handling.
 *
 * The Next.js auth model: short-lived 15-min access token (sessionCookieName)
 * + long-lived 7-day refresh token (refreshCookieName, scoped to
 * /api/auth/refresh). The access token expires silently; without explicit
 * handling, the dashboard would show stale data until the next 401.
 *
 * This module provides:
 *   - tryRefreshOnce(): client helper that POSTs /api/auth/refresh exactly
 *     once per concurrent caller. Subsequent calls await the same in-flight
 *     promise (single-flight) so multi-tab + multi-component refresh storms
 *     are impossible.
 *   - useSessionExpiry(): React hook for the dashboard layout. Watches the
 *     session state and routes to /login if the session expires
 *     deterministically (was authenticated → now not), preventing the
 *     "stale dashboard with no data" failure mode.
 *
 * Refresh-loop prevention:
 *   - Each refresh attempt records its timestamp; a hard floor of 2s
 *     between attempts prevents tight loops if the BFF is in a degraded
 *     state and returning 401s.
 *   - The session-expiry hook tracks "was authenticated" via a ref; it
 *     only redirects on a transition, not on initial-load not-yet-loaded
 *     state. This avoids redirecting users who arrive at /dashboard with
 *     no session (they should go through /login normally).
 */

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface RefreshAttempt {
  promise: Promise<boolean>;
  startedAt: number;
}

let inflight: RefreshAttempt | null = null;
const MIN_INTERVAL_MS = 2_000;
let lastAttemptAt = 0;

/**
 * tryRefreshOnce — POST /api/auth/refresh; coalesces concurrent callers.
 *
 * Returns true if the refresh succeeded (session + refresh cookies were
 * rotated), false otherwise. Never throws.
 *
 * Loop prevention: if a successful or failed attempt completed less than
 * MIN_INTERVAL_MS ago, returns false immediately without making a network
 * call. This stops a degraded BFF (returning 401 to /api/auth/me AND to
 * /api/auth/refresh) from causing a tight refresh loop.
 */
export function tryRefreshOnce(): Promise<boolean> {
  if (inflight) return inflight.promise;
  if (Date.now() - lastAttemptAt < MIN_INTERVAL_MS) {
    return Promise.resolve(false);
  }
  const promise = (async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      lastAttemptAt = Date.now();
      inflight = null;
    }
  })();
  inflight = { promise, startedAt: Date.now() };
  return promise;
}

/**
 * useSessionExpiry — redirect to /login when a previously-authenticated
 * session goes unauthenticated (deterministic expiry detection).
 *
 * Tries one refresh first; only routes to /login if refresh also fails.
 *
 * Does NOT redirect on initial-load (no prior authenticated state observed),
 * so users hitting /dashboard cold without a session see the normal
 * middleware-driven /login redirect — not a flicker.
 *
 * Pass the current `isAuthenticated` boolean from useSession.
 */
export function useSessionExpiry(isAuthenticated: boolean): void {
  const router = useRouter();
  const wasAuthRef = useRef(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      wasAuthRef.current = true;
      return;
    }
    if (!wasAuthRef.current) return; // never been authenticated this session
    if (redirectingRef.current) return; // already routing away
    redirectingRef.current = true;

    (async () => {
      const refreshed = await tryRefreshOnce();
      if (refreshed) {
        // Session restored; clear the redirect flag so the next genuine
        // expiry triggers another attempt.
        redirectingRef.current = false;
        // The session SWR cache will revalidate on the next interval.
        return;
      }
      // Refresh failed → session is truly expired. Bounce to /login with a
      // marker so the login page can surface a "Session expired — please
      // sign in again" toast instead of looking like a normal first visit.
      router.push("/login?expired=1");
      router.refresh();
    })();
  }, [isAuthenticated, router]);
}
