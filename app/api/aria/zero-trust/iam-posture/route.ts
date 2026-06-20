import { proxyRoute } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = proxyRoute("/api/aria/zero-trust/iam-posture");
