"use client";

import { useState } from "react";
import { ExternalLink, Search, Copy } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  HStack,
  PageShell,
  Timeline,
  TimelineItem,
  VStack,
} from "@/lib/ui";
import { PageRestrictedGuard } from "../../components/PageRestrictedGuard";

/**
 * /dashboard/admin/trace
 *
 * Request-ID lookup tool. The operator pastes a correlation id from a
 * customer's error banner; the tool surfaces the canonical lookup paths
 * across BFF + Go + audit logs.
 *
 * This is intentionally a "links + filter snippets" surface, NOT a live
 * log aggregator — Vercel + Fly logs aren't queryable from the BFF, and
 * proxying their APIs from here would expose ops tokens to the browser.
 * The tool generates the EXACT search queries the operator should run
 * in each system, so triage is consistent + fast.
 *
 * Lookup steps:
 *   1. Vercel logs    — request_id=…       (BFF trace)
 *   2. Fly logs        — X-Request-ID:…    (Go API trace)
 *   3. audit_logs query — find any audit row referencing this id
 *      (writers include the request_id in their metadata bag, e.g.,
 *       client-event POST).
 *   4. Telemetry table — client-side error boundary triggers
 */
export default function TraceLookupPage() {
  return (
    <PageRestrictedGuard
      capability="manageSettings"
      title="Request Trace Lookup"
      description="Trace a customer-reported request id across BFF + Go + audit + telemetry."
      subtitle="Trace"
    >
      <TraceView />
    </PageRestrictedGuard>
  );
}

function TraceView() {
  const [requestId, setRequestId] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const submitted = requestId.trim();
  const isValid = submitted.length >= 4 && /^[a-zA-Z0-9-]+$/.test(submitted);

  function copy(label: string, text: string) {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <PageShell
      eyebrow="Platform · Diagnostics"
      title="Request Trace Lookup"
      description="Paste a correlation id from a customer's error banner or a BFF log line. The tool generates the exact query strings for every system that holds part of the trace — no log aggregator integration required."
      width="default"
      density="tight"
    >
      {/* Input */}
      <Card variant="elevated" density="comfortable">
        <CardHeader
          eyebrow="Step 1"
          title="Paste the request id"
          description="The 12-character correlation id minted by lib/swr-fetcher.ts and propagated through every BFF + Go request. Surfaces in customer error banners as 'Reference: …'."
        />
        <HStack gap="sm" align="end" wrap>
          <div className="flex-1 min-w-[260px]">
            <label
              htmlFor="trace-input"
              className="block text-[10px] font-mono uppercase tracking-widest text-[var(--stone-500)] mb-1"
            >
              Request ID
            </label>
            <input
              id="trace-input"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              placeholder="a1b2c3d4e5f6"
              className="w-full bg-[var(--ink-deep)] border border-[var(--sage-soft)] rounded px-3 py-2 text-sm font-mono text-[var(--stone-100)] focus:outline-none focus:border-[var(--matcha-400)] focus:ring-1 focus:ring-[var(--matcha-400)]/30 transition"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <Button
            variant="ghost"
            size="md"
            icon={<Search size={12} />}
            disabled={!isValid}
            onClick={() => setRequestId(submitted)}
          >
            Generate queries
          </Button>
        </HStack>
        {requestId.length > 0 && !isValid && (
          <p className="text-xs text-[var(--ember-glow)] mt-2">
            Request ids are alphanumeric (with optional dashes), at least 4
            characters. Strip any surrounding text the customer pasted.
          </p>
        )}
      </Card>

      {/* Query generator */}
      {isValid && (
        <Card variant="elevated" density="comfortable">
          <CardHeader
            eyebrow="Step 2"
            title="Run these queries"
            description="Each row is the exact query string to paste into the matching system. Order matters — BFF logs come first because they're the most likely first signal."
          />
          <VStack gap="sm">
            {[
              {
                label: "Vercel logs (BFF)",
                href: `https://vercel.com/dashboard/logs?search=${encodeURIComponent(
                  submitted,
                )}`,
                query: `"${submitted}"`,
                hint: "Filter by the JSON field request_id. Look for request.start / request.end / upstream.* messages.",
              },
              {
                label: "Backend logs (Go API)",
                href: null,
                query: `grep "${submitted}" or filter X-Request-ID`,
                hint: "Go logs (logJSON output) carry the same request_id field. Cross-reference timestamps with the BFF logs. Open via your backend hosting console.",
              },
              {
                label: "Postgres audit_logs",
                href: null,
                query: `SELECT * FROM audit_logs WHERE metadata->>'request_id' = '${submitted}' ORDER BY ts;`,
                hint: "Audit rows attach the request id in metadata. Useful for confirming whether an operator action made it to the chain.",
              },
              {
                label: "Telemetry — error boundary",
                href: null,
                query: `Vercel logs: msg=client.error_boundary AND digest contains "${submitted}"`,
                hint: "If the customer saw a Next.js error boundary, the digest is logged with the request id in the same line. Most useful for white-screen reports.",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-md border border-[var(--sage-soft)] bg-[var(--moss)] p-3"
              >
                <HStack justify="between" align="center" wrap className="mb-1.5">
                  <p className="text-xs font-semibold text-[var(--stone-200)]">
                    {row.label}
                  </p>
                  <HStack gap="xs">
                    {row.href && (
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-[var(--matcha-200)] hover:text-[var(--matcha-100)] transition-colors"
                      >
                        Open <ExternalLink size={9} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => copy(row.label, row.query)}
                      className="inline-flex items-center gap-1 text-[10px] text-[var(--stone-400)] hover:text-[var(--stone-200)] transition-colors"
                      aria-label={`Copy ${row.label} query`}
                    >
                      {copied === row.label ? "Copied" : <Copy size={9} />}
                    </button>
                  </HStack>
                </HStack>
                <pre className="font-mono text-[11px] text-[var(--stone-300)] bg-[var(--ink-deep)] rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-all">
                  {row.query}
                </pre>
                <p className="text-[11px] text-[var(--stone-500)] mt-1.5 leading-relaxed">
                  {row.hint}
                </p>
              </div>
            ))}
          </VStack>
        </Card>
      )}

      {/* Trace path reference */}
      <Card variant="default" density="comfortable">
        <CardHeader
          eyebrow="Reference"
          title="How the correlation id flows"
          description="The full path a request id takes across the platform. If a system is missing the id in its log line, that's the bug — every layer SHOULD have it."
        />
        <Timeline density="comfortable">
          <TimelineItem
            intent="success"
            time="1"
            title="Browser mints the id"
          >
            <p className="text-[11px] text-[var(--stone-500)]">
              <code className="text-[var(--matcha-300)] font-mono">
                lib/swr-fetcher.ts:newRequestId()
              </code>{" "}
              generates a 12-hex-char id and sends it as the{" "}
              <code className="text-[var(--matcha-300)] font-mono">
                X-Request-ID
              </code>{" "}
              header on every fetch.
            </p>
          </TimelineItem>
          <TimelineItem
            intent="info"
            time="2"
            title="BFF reads / validates / logs"
          >
            <p className="text-[11px] text-[var(--stone-500)]">
              <code className="text-[var(--matcha-300)] font-mono">
                lib/bff-log.ts:withRequestContext()
              </code>{" "}
              parses the header (validates{" "}
              <code className="font-mono">/^[a-zA-Z0-9-]&#123;4,64&#125;$/</code>{" "}
              to prevent log injection), logs{" "}
              <Badge intent="info" variant="subtle" size="xs" mono>
                request.start
              </Badge>{" "}
              and{" "}
              <Badge intent="info" variant="subtle" size="xs" mono>
                request.end
              </Badge>{" "}
              with the id, and forwards to the Go API.
            </p>
          </TimelineItem>
          <TimelineItem
            intent="violet"
            time="3"
            title="Go API echoes in its own logs"
          >
            <p className="text-[11px] text-[var(--stone-500)]">
              The Go API&#39;s{" "}
              <code className="text-[var(--matcha-300)] font-mono">
                logJSON()
              </code>{" "}
              writes the id into every log line for the request lifetime, plus
              into{" "}
              <code className="text-[var(--matcha-300)] font-mono">
                audit_logs.metadata
              </code>{" "}
              for any audit-worthy action.
            </p>
          </TimelineItem>
          <TimelineItem
            intent="success"
            time="4"
            title="Response echoes id back"
          >
            <p className="text-[11px] text-[var(--stone-500)]">
              The BFF sets{" "}
              <code className="text-[var(--matcha-300)] font-mono">
                X-Request-ID
              </code>{" "}
              on every response (success + error). Error responses also include{" "}
              <code className="text-[var(--matcha-300)] font-mono">
                request_id
              </code>{" "}
              in the JSON body so the browser can render it in error banners.
            </p>
          </TimelineItem>
          <TimelineItem
            intent="warning"
            time="5"
            title="Customer surfaces the id"
          >
            <p className="text-[11px] text-[var(--stone-500)]">
              The customer sees &quot;Reference: a1b2c3d4&quot; in an error
              banner. They paste it into a support ticket. The operator pastes
              it here. End-to-end trace becomes possible in one paste.
            </p>
          </TimelineItem>
        </Timeline>
      </Card>
    </PageShell>
  );
}
