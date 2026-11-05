import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Switching one automated fix on or off for the caller's organisation.
//
// The edge allows ADMIN only (MUTATION_POLICY). The Go API enforces the rest from the verified session, never from
// anything sent here: the role must be ADMIN, the session must have completed a second factor, the action must exist,
// and the platform must already have validated it. Nothing in the body is used, so none is forwarded.

const ACTION = /^[a-z][a-z0-9_.]{2,80}$/;

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

async function change(method: "PUT" | "DELETE", ctx: { params: Promise<{ action: string }> }): Promise<Response> {
  const { action } = await ctx.params;
  return callUpstream({
    path: `/api/remediation/actions/${encodeURIComponent(action)}`,
    method,
    precheck: () => (ACTION.test(action) ? null : Response.json({ error: "invalid_action" }, { status: 400 })),
    validate: (b) => (isObj(b) && b.action === action && typeof b.enabled === "boolean" ? null : "the change was not confirmed"),
  });
}

export const PUT = (_req: Request, ctx: { params: Promise<{ action: string }> }) => change("PUT", ctx);
export const DELETE = (_req: Request, ctx: { params: Promise<{ action: string }> }) => change("DELETE", ctx);
