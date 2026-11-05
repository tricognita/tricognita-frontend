/**
 * lib/aria-stream.ts — turns the Go API's /api/aria/stream response into the
 * response the browser's EventSource receives.
 *
 * Dependency-free so it can be unit-tested outside the Next.js runtime.
 */

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

/**
 * A 2xx upstream response is relayed as the event stream. Anything else (a
 * tier/role refusal, "streaming not supported", an outage) is not a stream:
 * it is passed through with its real status and content type, like
 * proxyRoute, so EventSource sees the failure and backs off instead of
 * treating an error body as an open 200 event stream.
 */
export function relayAriaStream(upstream: Response): Response {
  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(upstream.body, { headers: SSE_HEADERS });
}
