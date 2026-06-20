import { NextRequest } from "next/server";
import { submitLead, LEAD_KINDS, type LeadKind } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/leads
 *
 * Public marketing-site lead capture. No authentication required.
 *
 * Accepts:
 *   { kind, name, email, company?, role?, use_case?, context? }
 *
 * Validates:
 *   - kind is in the LEAD_KINDS allow-list
 *   - email has minimum @+. structure
 *   - name + message lengths are capped
 *
 * Dedupes a given email submitting the same kind within 1 hour
 * (handled in lib/leads — multiple submissions within the window
 * return ok:true status:deduped without creating a second entry).
 *
 * Returns 503 if Redis is unavailable so the caller can show "please
 * email us directly" rather than silently dropping the lead.
 *
 * Source path and user-agent are captured server-side from request
 * headers — the client cannot lie about them via the body.
 */

const MAX_NAME_LEN = 120;
const MAX_TEXT_LEN = 2000;
const MAX_FIELD_LEN = 200;

interface RawBody {
  kind?: string;
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  use_case?: string;
  context?: {
    primary_cloud?: string;
    team_size?: string;
    timeframe?: string;
  };
}

const VALID_CLOUDS = new Set(["aws", "azure", "gcp", "multi", "unknown"]);

function sanitizeShort(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as RawBody;

  // Validate kind against the closed allow-list.
  const kind = body.kind as LeadKind | undefined;
  if (!kind || !LEAD_KINDS.includes(kind)) {
    return Response.json(
      { error: "invalid_kind", message: "Unknown lead kind." },
      { status: 400 },
    );
  }

  // Required: name + email.
  const name = sanitizeShort(body.name, MAX_NAME_LEN);
  const email = sanitizeShort(body.email, MAX_FIELD_LEN)?.toLowerCase();
  if (!name) {
    return Response.json(
      { error: "missing_name", message: "Name is required." },
      { status: 400 },
    );
  }
  if (!email || !looksLikeEmail(email)) {
    return Response.json(
      { error: "invalid_email", message: "Valid email is required." },
      { status: 400 },
    );
  }

  const company = sanitizeShort(body.company, MAX_FIELD_LEN);
  const role = sanitizeShort(body.role, MAX_FIELD_LEN);
  const use_case = sanitizeShort(body.use_case, MAX_TEXT_LEN);

  let primary_cloud: "aws" | "azure" | "gcp" | "multi" | "unknown" | undefined;
  if (body.context?.primary_cloud && typeof body.context.primary_cloud === "string") {
    const c = body.context.primary_cloud.toLowerCase();
    if (VALID_CLOUDS.has(c)) primary_cloud = c as typeof primary_cloud;
  }

  const result = await submitLead({
    kind,
    name,
    email,
    company,
    role,
    use_case,
    context: primary_cloud
      ? {
          primary_cloud,
          team_size: sanitizeShort(body.context?.team_size, 64),
          timeframe: sanitizeShort(body.context?.timeframe, 64),
        }
      : undefined,
    source_path: req.headers.get("referer") ?? undefined,
    user_agent: req.headers.get("user-agent") ?? undefined,
  });

  if (result.status === "redis_unavailable") {
    return Response.json(
      {
        error: "lead_store_unavailable",
        message:
          "We couldn't save your details right now. Please email founders@tricognita.com directly.",
      },
      { status: 503 },
    );
  }

  // Both "stored" and "deduped" are user-success outcomes: their info
  // is on file. Distinguish only in the response body for diagnostics.
  return Response.json(
    {
      ok: true,
      status: result.status,
      message:
        result.status === "deduped"
          ? "We already have your details from a recent submission. We'll be in touch."
          : "Thanks. We'll be in touch within 1–2 business days.",
    },
    { status: 201 },
  );
}
