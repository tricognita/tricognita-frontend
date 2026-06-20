import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notifyNewLead } from "@/lib/notify";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contactSchema = z.object({
  company: z.string().min(1, "Company is required"),
  provider: z.string().min(1, "Provider is required"),
  size: z.string().min(1, "Team size is required"),
  email: z.string().email("Valid email is required").optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = contactSchema.parse(body);
    const email = data.email || "unknown@prospect.com";

    const lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      company: data.company,
      provider: data.provider,
      size: data.size,
      email,
      status: "pending",
      timestamp: new Date().toISOString(),
    };

    // Persist in Upstash Redis for the dashboard leads list
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (redisUrl && redisToken) {
      const redis = new Redis({ url: redisUrl, token: redisToken });
      await redis.lpush("tricognita:marketing:leads", JSON.stringify(lead));
      await redis.ltrim("tricognita:marketing:leads", 0, 49);
    }

    // In-app notification (admin dashboard bell) + email via centralized dispatcher
    notifyNewLead(data.company, email, data.provider, data.size).catch((err) =>
      console.error("[marketing/contact] notify failed:", err)
    );

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (error) {
    console.error("[marketing/contact] error:", error);
    if (error && typeof error === "object" && "issues" in error && Array.isArray((error as any).issues)) {
      return NextResponse.json({ error: (error as any).issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
