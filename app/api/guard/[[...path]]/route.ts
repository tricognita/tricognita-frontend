import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { getJitToken } from "@/lib/jit-token";
import { GO_API } from "@/lib/jit-secret";

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, (await ctx.params).path);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, (await ctx.params).path);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, (await ctx.params).path);
}

async function handleProxy(req: NextRequest, path?: string[]) {
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });
  const endpoint = path ? path.join("/") : "";
  const fullPath = `/api/guard/${endpoint}`;
  const targetUrl = `${GO_API}${fullPath}`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Initiated-By", session.email);
  headers.set("X-User-Role", session.role);
  headers.set("Content-Type", req.headers.get("Content-Type") || "application/json");

  for (const h of ["X-User-ID", "X-Session-ID", "X-Provider"]) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }

  let body = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(res.headers);
    responseHeaders.set("Content-Type", res.headers.get("Content-Type") || "application/json");

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Guard Proxy Error] ${targetUrl}:`, error);
    return new Response(JSON.stringify({ error: "Backend unreachable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
