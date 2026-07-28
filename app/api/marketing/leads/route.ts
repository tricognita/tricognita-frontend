import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Auth Guard
    const jar = await cookies();
    const token = jar.get(sessionCookieName())?.value;
    const session = await verifySession(token);
    
    // Allow ADMIN and SECOPS (since SecOps might evaluate risk of onboarding)
    if (!session || (session.role !== "ADMIN" && session.role !== "SECOPS")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!redisUrl || !redisToken) {
      return NextResponse.json({ leads: [] });
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    
    const leadsRaw = await redis.lrange("tricognita:marketing:leads", 0, -1);
    const leads = leadsRaw.map(l => (typeof l === 'string' ? JSON.parse(l) : l));

    return NextResponse.json({ leads });
  } catch (error) {
    console.error("Marketing leads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
