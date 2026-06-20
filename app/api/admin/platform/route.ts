import { Redis } from "@upstash/redis";
import { GO_API } from "@/lib/jit-secret";
import { authedRoute, logRoute } from "@/lib/bff-log";
import {
  peekAllTenantsQuota,
  SCAN_QUOTA,
  REMEDIATE_QUOTA,
} from "@/lib/tenant-quota";
import { RELEASE } from "@/lib/release";
import { ADMIN_NOTIF_KEY } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/platform
 *
 * Cross-tenant operational snapshot for the platform-tenant ADMIN
 * (e.g., us — the SaaS operator).
 *
 * Output shape:
 *   {
 *     release: ReleaseInfo,
 *     backend: { reachable, status, uptime_hours, error? },
 *     redis:   { reachable, error? },
 *     tenants: TenantSummary[],         // from Go /api/organizations
 *     quotas: {
 *       scan:      TenantQuotaSnapshot[],   // Redis SCAN over quota keys
 *       remediate: TenantQuotaSnapshot[],
 *     },
 *     recentEvents: AdminNotification[],     // last 30 admin-key events
 *     aggregates: {
 *       tenantCount, scanQuotaInUseTenants, remediationQuotaInUseTenants,
 *     },
 *   }
 *
 * Constraints:
 *   - ADMIN-only (BFF gate). The Go API enforces its own check.
 *   - Read-only: this endpoint NEVER mutates state. Cross-tenant
 *     observation is the entire contract.
 *   - Falls back gracefully on any component failure (Go down, Redis
 *     down, organizations endpoint missing) so a degraded subcomponent
 *     doesn't blank the entire operator surface.
 */

interface TenantSummary {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at?: string;
}

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  tenant_id: string | null;
  timestamp: string;
}

export const GET = authedRoute(async ({ ctx, session, token }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "admin.platform.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }

  const out: {
    release: typeof RELEASE;
    timestamp: string;
    backend: {
      reachable: boolean;
      status?: string;
      uptime_hours?: number;
      error?: string;
    };
    redis: { reachable: boolean; error?: string };
    tenants: TenantSummary[];
    quotas: {
      scan: Awaited<ReturnType<typeof peekAllTenantsQuota>>;
      remediate: Awaited<ReturnType<typeof peekAllTenantsQuota>>;
    };
    recentEvents: AdminNotification[];
    aggregates: {
      tenantCount: number;
      scanQuotaInUseTenants: number;
      remediationQuotaInUseTenants: number;
    };
  } = {
    release: RELEASE,
    timestamp: new Date().toISOString(),
    backend: { reachable: false },
    redis: { reachable: false },
    tenants: [],
    quotas: { scan: [], remediate: [] },
    recentEvents: [],
    aggregates: {
      tenantCount: 0,
      scanQuotaInUseTenants: 0,
      remediationQuotaInUseTenants: 0,
    },
  };

  // ─── Go backend health probe ──────────────────────────────────────────
  try {
    const res = await fetch(`${GO_API}/healthz`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        status?: string;
        uptime_seconds?: number;
      };
      out.backend = {
        reachable: true,
        status: body.status ?? "unknown",
        uptime_hours: body.uptime_seconds
          ? Math.round(body.uptime_seconds / 3600)
          : undefined,
      };
    } else {
      out.backend = { reachable: false, error: `HTTP ${res.status}` };
    }
  } catch (err) {
    out.backend = {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // ─── Redis reachability ───────────────────────────────────────────────
  let redis: Redis | null = null;
  const redisUrl =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    try {
      redis = new Redis({ url: redisUrl, token: redisToken });
      await redis.ping();
      out.redis = { reachable: true };
    } catch (err) {
      out.redis = {
        reachable: false,
        error: err instanceof Error ? err.message : String(err),
      };
      redis = null;
    }
  } else {
    out.redis = { reachable: false, error: "redis not configured" };
  }

  // ─── Tenant inventory (Go /api/organizations) ────────────────────────
  try {
    const res = await fetch(`${GO_API}/api/organizations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Initiated-By": session.email,
        "X-Request-ID": ctx.requestId,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const body = (await res.json()) as
        | TenantSummary[]
        | { organizations?: TenantSummary[]; tenants?: TenantSummary[] };
      const list = Array.isArray(body)
        ? body
        : body.organizations ?? body.tenants ?? [];
      out.tenants = list;
      out.aggregates.tenantCount = list.length;
    }
  } catch {
    // Tenant list is best-effort — Go may not have the endpoint yet.
    // Don't blank the rest of the response.
  }

  // ─── Cross-tenant quota snapshots ────────────────────────────────────
  if (redis) {
    const [scan, remediate] = await Promise.all([
      peekAllTenantsQuota(SCAN_QUOTA),
      peekAllTenantsQuota(REMEDIATE_QUOTA),
    ]);
    out.quotas.scan = scan;
    out.quotas.remediate = remediate;
    out.aggregates.scanQuotaInUseTenants = scan.filter((s) => s.current > 0).length;
    out.aggregates.remediationQuotaInUseTenants = remediate.filter(
      (r) => r.current > 0,
    ).length;
  }

  // ─── Recent cross-tenant events (admin notification feed) ────────────
  if (redis) {
    try {
      const raw = await redis.lrange(ADMIN_NOTIF_KEY, 0, 29);
      out.recentEvents = raw.map((r) =>
        typeof r === "string" ? JSON.parse(r) : r,
      );
    } catch {
      // No events is acceptable — surface stays usable.
    }
  }

  logRoute(ctx, "info", "admin.platform.snapshot", {
    tenant_count: out.aggregates.tenantCount,
    backend_reachable: out.backend.reachable,
    redis_reachable: out.redis.reachable,
  });

  return Response.json(out);
});
