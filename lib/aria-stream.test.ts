/**
 * /api/aria/stream — the BFF relays the Go SSE feed. An upstream error must
 * reach the browser with its real status (it used to be relabelled as a 200
 * text/event-stream), and the edge boundary must keep the read-only and
 * customer roles off the stream on every method.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { relayAriaStream } from "./aria-stream";
import { roleMayCallApi } from "./api-authz";
import type { Role } from "./auth";

const STREAM = "/api/aria/stream";
const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const DENIED: Role[] = ["VIEWER", "AUDITOR", "CLIENT", "DESIGNER"];
const ALLOWED: Role[] = ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST"];

test("a 2xx upstream stream is relayed as text/event-stream with its frames", async () => {
  const frames = "event: ping\ndata: {}\n\nevent: action\ndata: {\"id\":\"a-1\"}\n\n";
  const res = relayAriaStream(new Response(frames, { status: 200, headers: { "Content-Type": "text/event-stream" } }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "text/event-stream");
  assert.equal(res.headers.get("cache-control"), "no-cache");
  assert.equal(await res.text(), frames);
});

test("an upstream error keeps its status and is never presented as a stream", async () => {
  for (const [status, body] of [
    [500, '{"error":"streaming not supported"}\n'],
    [403, '{"error":"e2_read_requires_internal_role"}\n'],
    [401, '{"error":"missing Bearer token"}\n'],
    [429, '{"error":"rate_limit_exceeded"}\n'],
    [503, '{"error":"service_unavailable"}\n'],
  ] as const) {
    const res = relayAriaStream(new Response(body, { status, headers: { "Content-Type": "application/json" } }));
    assert.equal(res.status, status, `upstream ${status} became ${res.status}`);
    assert.equal(res.headers.get("content-type"), "application/json");
    assert.notEqual(res.headers.get("content-type"), "text/event-stream");
    assert.equal(await res.text(), body);
  }
});

test("the stream route relays through relayAriaStream and exposes GET only", () => {
  const src = readFileSync(join(process.cwd(), "app", "api", "aria", "stream", "route.ts"), "utf8");
  assert.match(src, /return relayAriaStream\(res\);/);
  const methods = [...src.matchAll(/export (?:async )?function (GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b/g)].map((m) => m[1]);
  assert.deepEqual(methods, ["GET"]);
});

test("VIEWER, AUDITOR, CLIENT and DESIGNER are refused the stream on every method", () => {
  for (const role of DENIED) {
    for (const m of METHODS) assert.equal(roleMayCallApi(role, STREAM, m), false, `${role} ${m} ${STREAM}`);
    assert.equal(roleMayCallApi(role, STREAM + "/", "GET"), false, `${role} GET ${STREAM}/`);
  }
});

test("internal roles may open the stream", () => {
  for (const role of ALLOWED) assert.equal(roleMayCallApi(role, STREAM, "GET"), true, role);
});
