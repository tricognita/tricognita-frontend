import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { ADMIN_NOTIF_KEY, tenantNotifKey } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 *
 * Returns up to 100 platform notifications for the authenticated session.
 *
 * Tenant isolation model (closes G1 from docs/SECURITY_TENANT_AUDIT.md):
 *   - ADMIN role → reads the cross-tenant admin key. Sees every tenant's
 *     events (platform-operator view, by design).
 *   - Every other role → reads its tenant-scoped key ONLY:
 *     `tricognita:notifications:tenant:{tenantId}`. Cannot see another
 *     tenant's events regardless of role.
 *
 * The prior behavior fetched the global admin key for every role and
 * filtered sensitive event types in-memory. That model was acceptable in
 * single-tenant mode but would leak across tenants the moment the platform
 * onboarded a second customer. The tenant-keyed model is the correct
 * architecture for multi-tenant production.
 */
export async function GET(_req: NextRequest) {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const isAdmin = session.role === "ADMIN";

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return NextResponse.json({ notifications: [] });
  }

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });

    // ADMIN sees the cross-tenant admin key. Everyone else sees ONLY their
    // tenant's key — strict isolation, no in-memory filter required.
    const key = isAdmin
      ? ADMIN_NOTIF_KEY
      : tenantNotifKey(session.tenantId);
    const raw = await redis.lrange(key, 0, 99);
    const notifications = raw.map((r) =>
      typeof r === "string" ? JSON.parse(r) : r,
    );

    // Defense-in-depth: for non-ADMIN, verify tenant_id on every event.
    // Notifications written by older callers (pre-G1 fix) won't have a
    // tenant_id field — those are platform-level and are NOT shown to
    // non-ADMINs at all. ADMIN reads the admin key so this filter is a
    // no-op for them.
    const filtered = isAdmin
      ? notifications
      : notifications.filter(
          (n: { tenant_id?: string | null }) => n.tenant_id === session.tenantId,
        );

    return NextResponse.json({ notifications: filtered });
  } catch (err) {
    console.error("[api/notifications] Redis error:", err);
    return NextResponse.json({ notifications: [] });
  }
}
