// POST /api/auth/bootstrap-reset
// One-time admin password reset endpoint.
// Protected by BOOTSTRAP_RESET_TOKEN env var (must be ≥ 32 chars).
import { timingSafeEqual } from "node:crypto";
import { forceUpdatePassword } from "@/lib/users";
import { checkLimit, recordFailure, clientIpFromHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request): Promise<Response> {
  const bootstrapToken = process.env.BOOTSTRAP_RESET_TOKEN ?? "";

  // Strictly require a strong env-sourced token — no fallbacks
  if (bootstrapToken.length < 32) {
    return Response.json(
      { error: "bootstrap_not_configured", message: "BOOTSTRAP_RESET_TOKEN env var is missing or too short (min 32 chars)." },
      { status: 503 }
    );
  }

  // Rate limit by IP — even a 32-char token shouldn't have unlimited probe surface
  const ipKey = `bootstrap-reset:${clientIpFromHeaders(req)}`;
  const lim = await checkLimit(ipKey);
  if (!lim.allowed) {
    return Response.json(
      { error: "rate_limited", retryAfterSeconds: lim.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(lim.retryAfterSeconds) } },
    );
  }

  let body: { token?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const providedToken = body.token ?? "";
  if (!tokensEqual(providedToken, bootstrapToken)) {
    await recordFailure(ipKey);
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const email    = (body.email    ?? "").trim().toLowerCase();
  const password = body.password  ?? "";

  if (!email || password.length < 12) {
    return Response.json({ error: "invalid_input: email required, password min 12 chars" }, { status: 400 });
  }

  try {
    const ok = await forceUpdatePassword(email, password);
    if (!ok) return Response.json({ error: "failed" }, { status: 500 });
    return Response.json({ ok: true, email, message: "Password updated. You can now log in." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
