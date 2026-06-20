import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const jar = await cookies();
  const sess = await verifySession(jar.get(sessionCookieName())?.value);
  if (!sess || (sess.role !== "ADMIN" && sess.role !== "SECOPS")) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { Redis } = await import("@upstash/redis");
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
    
    if (!url || !token) {
      return Response.json({ logs: [] });
    }
    
    const redis = new Redis({ url, token });
    const rawLogs = await redis.lrange("tricognita:email:logs", 0, 9); // Last 10
    
    const logs = rawLogs.map(str => {
      try {
        return typeof str === "string" ? JSON.parse(str) : str;
      } catch {
        return null;
      }
    }).filter(Boolean);

    return Response.json({ logs });
  } catch (err) {
    console.error("[api/email-logs] failed:", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
