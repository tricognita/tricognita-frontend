/**
 * lib/use-session.ts — Central session hook
 *
 * Single SWR-backed hook that fetches /api/auth/me once (globally cached)
 * and exposes { role, email, tenantId, isLoading, isAuthenticated }.
 *
 * All dashboard components should use this instead of calling
 * /api/auth/me independently, to avoid redundant fetches and ensure
 * consistent role values across the app.
 */

"use client";

import useSWR from "swr";
import type { Role } from "./auth";
import type { Plan } from "./rbac";

interface MeResponse {
  authenticated: boolean;
  email?: string;
  role?: Role;
  tenantId?: string;
  plan?: Plan;
  modules?: string[];
  mfaEnabled?: boolean;
}

interface Session {
  role: Role | null;
  email: string | null;
  tenantId: string | null;
  plan: Plan | null;
  modules: string[] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const fetcher = async (url: string): Promise<MeResponse> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    // 401 = not authenticated — return safe default, don't throw
    if (res.status === 401) return { authenticated: false };
    throw new Error(`/api/auth/me returned ${res.status}`);
  }
  return res.json();
};

/**
 * useSession() — returns the current user's session.
 *
 * - `role` is null until the session is loaded.
 * - Never throws; 401 returns { authenticated: false, role: null }.
 * - SWR key "/api/auth/me" is shared globally — all components share one fetch.
 */
export function useSession(): Session {
  const { data, isLoading } = useSWR<MeResponse>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10_000,
    // Revalidate every 5 minutes to catch session expiry — no lower than this
    refreshInterval: 5 * 60_000,
    shouldRetryOnError: false,
    errorRetryCount: 0,
  });

  return {
    role: data?.authenticated && data?.role ? data.role : null,
    email: data?.email ?? null,
    tenantId: data?.tenantId ?? null,
    plan: data?.plan ?? null,
    modules: data?.modules ?? null,
    isLoading,
    isAuthenticated: data?.authenticated === true,
  };
}
