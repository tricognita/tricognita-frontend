import { GO_API } from "@/lib/jit-secret";
import { authedRoute, logRoute } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/credentials/test
 *
 * Validates a cloud credential without storing it. The customer typically
 * uses this from the onboarding flow + the credentials page "Test
 * connection" button.
 *
 * Body:
 *   { role_arn, external_id?, regions?, provider? }
 *
 * Returns:
 *   { ok: true,  account_id, valid_regions, identity }
 *   { ok: false, error, message, detail?, request_id }
 *
 * Calls the Go API which:
 *   1. Performs sts:AssumeRole into the customer's role.
 *   2. Calls sts:GetCallerIdentity to confirm the assumed identity.
 *   3. For each requested region, probes ec2:DescribeRegions to confirm
 *      reachability.
 *
 * The frontend NEVER receives the AWS credentials — only the validation
 * result. This is the contract: the BFF is a thin auth-correlation layer
 * over the Go API's AWS integration.
 */

interface TestRequest {
  role_arn?: string;
  external_id?: string;
  regions?: string[];
  provider?: string;
}

export const POST = authedRoute(async ({ ctx, session, token, req }) => {
  const body = (await req.json().catch(() => ({}))) as TestRequest;

  if (!body.role_arn || typeof body.role_arn !== "string") {
    return ctx.errorJson({ error: "role_arn_required" }, 400);
  }
  // Light ARN format validation (full validation is the Go API's job).
  if (!/^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/.test(body.role_arn)) {
    return ctx.errorJson(
      {
        error: "invalid_arn_format",
        message:
          "Role ARN must be in the form arn:aws:iam::ACCOUNT_ID:role/RoleName.",
      },
      400,
    );
  }

  try {
    const upstream = await fetch(`${GO_API}/api/credentials/test`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Initiated-By": session.email,
        "X-Request-ID": ctx.requestId,
      },
      body: JSON.stringify({
        provider: body.provider ?? "aws",
        role_arn: body.role_arn,
        external_id: body.external_id,
        regions: body.regions ?? ["us-east-1"],
      }),
      signal: AbortSignal.timeout(15000),
    });

    const upstreamBody = await upstream.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(upstreamBody) as Record<string, unknown>;
    } catch {
      // Non-JSON response → return raw status with a friendly message.
    }

    if (!upstream.ok) {
      logRoute(ctx, "warn", "credentials.test_failed", {
        tenant_id: session.tenantId,
        upstream_status: upstream.status,
        role_arn: body.role_arn,
      });
      return Response.json(
        {
          ok: false,
          error:
            (parsed.error as string | undefined) ?? `upstream_${upstream.status}`,
          message:
            (parsed.message as string | undefined) ??
            "The cloud credential could not be validated. Check the trust policy and external id.",
          detail: parsed.detail as string | undefined,
        },
        { status: upstream.status },
      );
    }

    logRoute(ctx, "info", "credentials.test_ok", {
      tenant_id: session.tenantId,
      role_arn: body.role_arn,
      account_id: parsed.account_id as string | undefined,
    });

    return Response.json({
      ok: true,
      account_id: parsed.account_id,
      identity: parsed.identity,
      valid_regions: parsed.valid_regions,
      message:
        (parsed.message as string | undefined) ??
        "Cloud credentials validated successfully.",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logRoute(ctx, "error", "credentials.test_unreachable", {
      tenant_id: session.tenantId,
      detail,
    });
    // Go backend down → tell the customer specifically. This is a different
    // failure class from "your role ARN is wrong" — we don't want to blame
    // the customer for a backend outage.
    return Response.json(
      {
        ok: false,
        error: "validator_unreachable",
        message:
          "Tricognita's validation service is temporarily unreachable. Your credentials were NOT verified. Retry in a minute.",
        detail,
      },
      { status: 502 },
    );
  }
});
