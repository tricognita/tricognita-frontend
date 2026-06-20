import { createHmac, randomBytes } from "crypto";
import { getRequiredEnv } from "./env";

const TOKEN_TTL_S = 900;

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64url");
}

interface JITOptions {
  sub: string;
  tenantId?: string;
  role?: string;
  scope?: string;
}

// JIT tier hierarchy (must match api/main.go tier constants):
//   AUTO          → unauthenticated automation (read-only synthetic)
//   OPERATOR      → ADMIN, SECOPS, SOC_LEAD, DEVSECOPS (most state-changing ops)
//   DUAL_CONTROL  → reserved for actions requiring 2-of-N approval
//   CISO          → ADMIN of platform tenant (cross-tenant operator)
//
// This mapping aligns the JIT tier with the session role so the Go API's
// jitMiddleware can enforce tier-gated authorization correctly. Closes G4
// from docs/SECURITY_TENANT_AUDIT.md.
function tierForRole(role: string | undefined): "AUTO" | "OPERATOR" | "DUAL_CONTROL" | "CISO" {
  switch (role) {
    case "ADMIN":
    case "SECOPS":
    case "SOC_LEAD":
    case "DEVSECOPS":
    case "CLOUD_ENGINEER":
      return "OPERATOR";
    case "AUDITOR":
    case "RED_TEAMER":
    case "FINOPS_ANALYST":
    case "CLIENT":
    case "VIEWER":
      // Read-only roles → AUTO tier. The Go API's read endpoints accept AUTO;
      // any write endpoint they hit will be rejected at the tier check rather
      // than silently elevated.
      return "AUTO";
    default:
      // Unknown role → safest tier (read-only).
      return "AUTO";
  }
}

function issueHMACToken(secret: string, options: JITOptions): string {
  const now = Math.floor(Date.now() / 1000);
  const tier = tierForRole(options.role);
  const payload = b64url(JSON.stringify({
    sub: options.sub,
    tenant_id: options.tenantId || "tricognita-global",
    role: options.role || "OPERATOR",
    scope: options.scope || "*",
    tier,
    iat: now,
    exp: now + TOKEN_TTL_S
  }));
  const header = b64url('{"alg":"HS256","typ":"JIT"}');
  const body = `${header}.${payload}`;
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export async function getJitToken(optionsOrSub?: string | JITOptions): Promise<string> {
  const options: JITOptions = typeof optionsOrSub === 'string' 
    ? { sub: optionsOrSub } 
    : (optionsOrSub || { sub: "fallback-" + randomBytes(8).toString("base64url") });
  
  try {
    const fallbackSecret = getRequiredEnv("SENTINEL_JIT_SECRET");
    if (fallbackSecret.length >= 32) {
      return issueHMACToken(fallbackSecret, options);
    }
  } catch (err) {
    // Ignore and try OIDC
  }

  try {
    const tok = getRequiredEnv("VERCEL_OIDC_TOKEN");
    return tok;
  } catch (err) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return "BUILD_TIME_DUMMY_TOKEN";
    }
    throw new Error("JIT credentials missing (VERCEL_OIDC_TOKEN and SENTINEL_JIT_SECRET)");
  }
}
