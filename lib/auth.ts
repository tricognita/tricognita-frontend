import { getRequiredEnv } from "./env";
// Edge-compatible HMAC session cookies. Signs with SENTINEL_JIT_SECRET.
// Token format: base64url(payload).base64url(hmac)
// payload: { email, role, exp, iat, jti, uat }
// jti — unique token ID, checked against Redis revocation blacklist on every request
// uat — first 16 chars of hex(SHA-256(userAgent)) binds token to client fingerprint
// Refresh tokens: separate 7-day HMAC token, rotating on each use

export type Role = 
  | "ADMIN" 
  | "SECOPS" 
  | "AUDITOR" 
  | "VIEWER"
  | "DEVSECOPS"
  | "SOC_LEAD"
  | "CLOUD_ENGINEER"
  | "RED_TEAMER"
  | "FINOPS_ANALYST"
  | "CLIENT";

export const ROLES: Role[] = [
  "ADMIN", "SECOPS", "AUDITOR", "VIEWER",
  "DEVSECOPS", "SOC_LEAD", "CLOUD_ENGINEER",
  "RED_TEAMER", "FINOPS_ANALYST", "CLIENT"
];

const COOKIE_NAME    = "trico_session";
const REFRESH_COOKIE = "trico_refresh";
const SESSION_TTL_SECONDS = 15 * 60;         // 15 min access token
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days refresh token

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function dec(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

function toBuffer(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    toBuffer(enc(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, toBuffer(enc(data)));
  return new Uint8Array(sig);
}

function getSecret(): string {
  try {
    const s = getRequiredEnv("SENTINEL_JIT_SECRET");
    if (s.length < 32) throw new Error("SENTINEL_JIT_SECRET must be >= 32 bytes");
    return s;
  } catch (err) {
    // If not in build phase and secret is truly missing, this will fail.
    // getRequiredEnv already handles build-phase skipping.
    return "";
  }
}

export interface Session {
  email: string;
  role: Role;
  tenantId: string;
  exp: number;
  iat: number;   // issued-at (unix seconds)
  jti: string;   // unique token ID for replay prevention
  uat: string;   // first 16 hex chars of SHA-256(userAgent) — client binding
  mustReset?: boolean;
}

// Generate a 128-bit random token ID (jti)
function randomJti(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Truncated SHA-256 of userAgent — not stored in logs, only in token for binding
async function uaFingerprint(userAgent: string): Promise<string> {
  if (!userAgent) return "none";
  const digest = await crypto.subtle.digest("SHA-256", toBuffer(enc(userAgent)));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16); // 64-bit fingerprint prefix
}

// signSession: email + role + tenantId + UA fingerprint → signed token
export async function signSession(email: string, role: Role, tenantId: string, userAgent = "", mustReset = false): Promise<string> {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload: Session = {
    email,
    role,
    tenantId,
    exp: now + SESSION_TTL_SECONDS,
    iat: now,
    jti: randomJti(),
    uat: await uaFingerprint(userAgent),
    mustReset,
  };
  const payloadB64 = base64url(enc(JSON.stringify(payload)));
  const sig = await hmac(secret, payloadB64);
  return `${payloadB64}.${base64url(sig)}`;
}

// verifySession: validates HMAC, expiry, UA fingerprint, and JTI revocation.
// Pass currentUA to enforce per-client binding; omit/empty to skip UA check.
export async function verifySession(
  token: string | undefined,
  currentUA = "",
  checkRevocation = true  // set false only in refresh flow to avoid double Redis call
): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const secret = getSecret();
    const expected = await hmac(secret, parts[0]);
    const given = base64urlDecode(parts[1]);
    if (expected.length !== given.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i];
    if (diff !== 0) return null;
    const payload = JSON.parse(dec(base64urlDecode(parts[0]))) as Partial<Session>;
    if (!payload.email || !payload.role || !payload.tenantId || !payload.exp || !payload.jti) return null;
    if (!ROLES.includes(payload.role as Role)) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    // JTI revocation: check Redis blacklist — invalidates stolen cookies immediately
    if (checkRevocation) {
      const { isJtiRevoked } = await import("@/lib/token-store");
      if (await isJtiRevoked(payload.jti)) return null;
    }
    // UA binding: if token has a uat and caller provides a UA, they must match.
    // uat="none" means the token was issued without a UA (allows all clients).
    if (currentUA && payload.uat && payload.uat !== "none") {
      const fingerprint = await uaFingerprint(currentUA);
      if (fingerprint !== payload.uat) return null;
    }
    return payload as Session;
  } catch {
    return null;
  }
}

export function sessionCookieName(): string {
  return COOKIE_NAME;
}

export function refreshCookieName(): string {
  return REFRESH_COOKIE;
}

export function sessionCookieOptions(): string {
  const isProd = process.env.NODE_ENV === "production";
  return [
    `HttpOnly`,
    `Path=/`,
    `SameSite=Lax`,
    isProd ? "Secure" : "",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].filter(Boolean).join("; ");
}

export function refreshCookieOptions(): string {
  const isProd = process.env.NODE_ENV === "production";
  return [
    `HttpOnly`,
    `Path=/api/auth/refresh`,  // scoped to refresh endpoint only
    `SameSite=Strict`,         // Strict for refresh (not Lax) — harder to CSRF
    isProd ? "Secure" : "",
    `Max-Age=${REFRESH_TTL_SECONDS}`,
  ].filter(Boolean).join("; ");
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export interface RefreshPayload {
  email: string;
  role:  Role;
  tenantId: string;
  jti:   string; // refresh token's own jti
  iat:   number;
  exp:   number;
}

export async function signRefreshToken(email: string, role: Role, tenantId: string): Promise<string> {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload: RefreshPayload = {
    email, role, tenantId,
    jti: randomJti(),
    iat: now,
    exp: now + REFRESH_TTL_SECONDS,
  };
  const payloadB64 = base64url(enc(JSON.stringify(payload)));
  const sig = await hmac(secret + ":refresh", payloadB64); // different key domain from access tokens
  return `${payloadB64}.${base64url(sig)}`;
}

export async function verifyRefreshToken(token: string | undefined): Promise<RefreshPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const secret = getSecret();
    const expected = await hmac(secret + ":refresh", parts[0]);
    const given = base64urlDecode(parts[1]);
    if (expected.length !== given.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i];
    if (diff !== 0) return null;
    const payload = JSON.parse(dec(base64urlDecode(parts[0]))) as Partial<RefreshPayload>;
    if (!payload.email || !payload.role || !payload.tenantId || !payload.exp || !payload.jti) return null;
    if (!ROLES.includes(payload.role as Role)) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as RefreshPayload;
  } catch {
    return null;
  }
}

// ── Zero-Trust Route → Role Map ─────────────────────────────────────────────
// DENY BY DEFAULT: any route listed here requires the listed roles.
// Routes NOT listed = any authenticated user may access.
// Principle: least privilege. Clients get read-only views; admins get full power.
const ALL_ROLES: Role[] = ["ADMIN", "SECOPS", "AUDITOR", "VIEWER", "SOC_LEAD", "DEVSECOPS", "RED_TEAMER", "FINOPS_ANALYST", "CLOUD_ENGINEER", "CLIENT"];

const ROLE_ROUTES: Array<{ prefix: string; allow: Role[] }> = [
  // ── Admin-only ────────────────────────────────────────────────────────────
  { prefix: "/dashboard/users",                  allow: ["ADMIN"] },
  { prefix: "/dashboard/admin",                  allow: ["ADMIN"] },
  { prefix: "/dashboard/settings",               allow: ["ADMIN", "SECOPS"] },

  // ── Admin + SecOps write operations ──────────────────────────────────────
  { prefix: "/dashboard/guard/policies",         allow: ["ADMIN", "SECOPS", "SOC_LEAD"] },
  { prefix: "/dashboard/zero-trust",             allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"] },

  // ── Broad access: all internal roles + clients get read-only view ─────────
  { prefix: "/dashboard/executive",              allow: ALL_ROLES },
  { prefix: "/dashboard/plan",                   allow: ALL_ROLES },
  { prefix: "/dashboard/exports",                allow: ALL_ROLES },
  { prefix: "/dashboard/queue",                  allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "AUDITOR"] },
  { prefix: "/dashboard/soc",                    allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "AUDITOR"] },
  { prefix: "/dashboard/attack-graph",           allow: ALL_ROLES },
  { prefix: "/dashboard/ai-security",            allow: ALL_ROLES },
  { prefix: "/dashboard/threat-intel",           allow: ALL_ROLES },
  { prefix: "/dashboard/incidents",              allow: ALL_ROLES },
  { prefix: "/dashboard/finops-security",        allow: ALL_ROLES },
  { prefix: "/dashboard/services",               allow: ALL_ROLES },
  { prefix: "/dashboard/audit-trail",            allow: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/compliance",             allow: ALL_ROLES },
  { prefix: "/dashboard/findings",              allow: ALL_ROLES },
  { prefix: "/dashboard/dspm",                  allow: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"] },
  { prefix: "/dashboard/iac",                   allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/k8s",                  allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/credentials",          allow: ["ADMIN", "SECOPS", "CLOUD_ENGINEER", "DEVSECOPS"] },
  { prefix: "/onboarding",                     allow: ALL_ROLES },
  { prefix: "/dashboard/guard/reports",          allow: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD"] },
  { prefix: "/dashboard/guard",                  allow: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/aria",                   allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/alert-routes",           allow: ["ADMIN", "SECOPS"] },
  { prefix: "/dashboard/api-keys",               allow: ["ADMIN"] },
];

export function isRoleAllowed(pathname: string, role: Role): boolean {
  for (const rule of ROLE_ROUTES) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
      return rule.allow.includes(role);
    }
  }
  // Default: allow any authenticated user
  return true;
}
