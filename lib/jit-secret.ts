import { createHmac, randomBytes } from "crypto";
import { getRequiredEnv } from "./env";

export type JITTier = "AUTO" | "OPERATOR" | "DUAL_CONTROL" | "CISO";
const TOKEN_TTL_S = 900; // 15 min — matches Go tokenTTL in api/main.go:48

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64url");
}

export function issueJITToken(secret: string, tier: JITTier = "OPERATOR"): string {
  const now = Math.floor(Date.now() / 1000);
  const sub = "dashboard-" + randomBytes(8).toString("base64url");
  const header = b64url('{"alg":"HS256","typ":"JIT"}');
  const payload = b64url(JSON.stringify({ sub, tier, iat: now, exp: now + TOKEN_TTL_S }));
  const body = `${header}.${payload}`;
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export function secretOrError(): { secret: string } | Response {
  try {
    // During build phase, we return a dummy to prevent crashes
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return { secret: "BUILD_TIME_DUMMY_SECRET_DO_NOT_USE" };
    }
    const secret = getRequiredEnv("SENTINEL_JIT_SECRET");
    if (secret.length < 32) {
      throw new Error("Secret too short");
    }
    return { secret };
  } catch (err) {
    return Response.json(
      { error: "jit_not_configured", message: "Security parameters missing or invalid." },
      { status: 503 }
    );
  }
}

function resolveGoApi(): string {
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  // Canonical env var: SENTINEL_API_URL.
  // NEXT_PUBLIC_API_URL and ARIA_BACKEND_URL are deprecated — migrate to SENTINEL_API_URL.
  const legacy = process.env.NEXT_PUBLIC_API_URL ?? process.env.ARIA_BACKEND_URL;
  if (legacy && !process.env.SENTINEL_API_URL) {
    console.warn(
      "[jit-secret] NEXT_PUBLIC_API_URL / ARIA_BACKEND_URL are deprecated. " +
        "Set SENTINEL_API_URL instead.",
    );
  }
  const raw = (
    process.env.SENTINEL_API_URL ??
    legacy ??
    (isProd ? "https://api.must-be-configured.invalid" : "http://localhost:8787")
  ).trim();
  if (!raw) return isProd ? "https://api.must-be-configured.invalid" : "http://localhost:8787";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

export const GO_API = resolveGoApi();

// Wraps fetch with a timeout + structured error log so Vercel logs show the
// upstream URL that failed (otherwise "fetch failed" is opaque).
export async function goFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${GO_API}${path}`;
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[goFetch] ${init?.method ?? "GET"} ${url} → ${msg}`);
    return Response.json(
      {
        error: "backend_unreachable",
        message: "ARIA backend is offline or unreachable. Retry in a minute, or contact admin if this persists.",
        upstream: url,
        detail: msg,
      },
      { status: 502 },
    );
  }
}
// goFetchAuthorized wraps goFetch with session verification and JIT token injection.
// Node.js runtime only (requires next/headers).
export async function goFetchAuthorized(path: string, init?: RequestInit): Promise<Response> {
  const { cookies } = await import("next/headers");
  const { verifySession, sessionCookieName } = await import("@/lib/auth");
  const { getJitToken } = await import("@/lib/jit-token");

  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);
  if (!session) {
    return Response.json({ error: "unauthenticated", message: "Valid session required." }, { status: 401 });
  }

  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Initiated-By", session.email);
  headers.set("X-User-Role", session.role);

  return goFetch(path, { ...init, headers });
}
