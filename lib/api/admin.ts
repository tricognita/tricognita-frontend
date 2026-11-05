import { apiGet, apiSend } from "./client";

/** Alert routes and users, through the BFF. Nothing here invents a result. */

export interface AlertRouteRow {
  id: string;
  name: string;
  routeType: string;
  minSeverity: string;
  /** Host only: the full delivery URL is a credential in practice and is never shown. */
  destination: string;
  enabled: boolean;
  createdAt: string;
}

export async function fetchAlertRoutes(): Promise<AlertRouteRow[]> {
  const b = await apiGet<{ routes: Array<Record<string, unknown>> }>("/api/alert-routes", "alert routes");
  return (b.routes ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    routeType: String(r.route_type ?? ""),
    minSeverity: String(r.min_severity ?? ""),
    destination: typeof r.destination === "string" && r.destination ? r.destination : "—",
    enabled: r.enabled === true,
    createdAt: String(r.created_at ?? ""),
  }));
}

export const createAlertRoute = (input: { name: string; route_type: "slack" | "webhook"; min_severity: string; config: Record<string, string> }) =>
  apiSend<{ id: string }>("POST", "/api/alert-routes", "add this alert route", input);
export const setAlertRouteEnabled = (id: string, enabled: boolean) =>
  apiSend<{ status: string }>("PATCH", `/api/alert-routes/${encodeURIComponent(id)}`, "update this alert route", { enabled });
export const deleteAlertRoute = (id: string) =>
  apiSend<{ status: string }>("DELETE", `/api/alert-routes/${encodeURIComponent(id)}`, "delete this alert route");

/** API keys. Metadata only: the secret exists in exactly one response, the one that creates the key. */
export type ApiKeyScope = "scan:read" | "audit:read";

export interface ApiKeyRow {
  id: string;
  name: string;
  /** First characters of the key, enough to recognise it. Not the secret. */
  prefix: string;
  scopes: string[];
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export async function fetchApiKeys(): Promise<ApiKeyRow[]> {
  const b = await apiGet<{ keys: Array<Record<string, unknown>> }>("/api/api-keys", "API keys");
  return (b.keys ?? []).map((k) => ({
    id: String(k.id),
    name: String(k.name ?? ""),
    prefix: String(k.key_prefix ?? ""),
    scopes: Array.isArray(k.scopes) ? k.scopes.map(String) : [],
    createdBy: typeof k.created_by === "string" ? k.created_by : "",
    createdAt: String(k.created_at ?? ""),
    lastUsedAt: typeof k.last_used_at === "string" ? k.last_used_at : null,
    expiresAt: typeof k.expires_at === "string" ? k.expires_at : null,
  }));
}

export const createApiKey = (input: { name: string; scopes: ApiKeyScope[]; expiry_days: number }) =>
  apiSend<{ id: string; key: string }>("POST", "/api/api-keys", "create this API key", input);
export const revokeApiKey = (id: string) =>
  apiSend<{ status: string }>("DELETE", `/api/api-keys/${encodeURIComponent(id)}`, "revoke this API key");

/** Where a key stands today, from its dates alone. Revoked keys are not listed: they stop working at once. */
export function apiKeyStatus(k: Pick<ApiKeyRow, "expiresAt">, now: number = Date.now()): "active" | "expiring" | "expired" {
  if (!k.expiresAt) return "active";
  const left = Date.parse(k.expiresAt) - now;
  if (left <= 0) return "expired";
  return left < 7 * 24 * 3600 * 1000 ? "expiring" : "active";
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  mfaEnabled: boolean;
  mustReset: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export async function fetchUsers(): Promise<UserRow[]> {
  const b = await apiGet<{ users: UserRow[] }>("/api/auth/users", "users");
  return b.users ?? [];
}
export const inviteUser = (input: { email: string; name: string; role: string }) =>
  apiSend<{ user: UserRow }>("POST", "/api/auth/users", "invite this user", input);
export const changeUserRole = (id: string, role: string) =>
  apiSend<{ user: UserRow }>("PUT", `/api/auth/users/${encodeURIComponent(id)}`, "change this user's role", { role });
export const setUserStatus = (id: string, status: "active" | "deactivated") =>
  apiSend<{ user: UserRow }>("PUT", `/api/auth/users/${encodeURIComponent(id)}`, "change this user's status", { status });
export const removeUser = (id: string) =>
  apiSend<{ deleted: boolean }>("DELETE", `/api/auth/users/${encodeURIComponent(id)}`, "remove this user");
export const setTemporaryPassword = (userId: string, tempPassword: string) =>
  apiSend<{ mustReset: boolean }>("POST", "/api/auth/admin-reset-password", "set a temporary password", { userId, tempPassword });
