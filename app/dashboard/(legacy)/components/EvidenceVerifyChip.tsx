"use client";

import { useState } from "react";
import useSWR from "swr";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { Badge, Button } from "@/lib/ui";
import { fetcher } from "@/lib/swr-fetcher";
import type { VerifyResult } from "@/lib/assurance-types";

/**
 * EvidenceVerifyChip — the "trace to evidence" control. Given an evidence content
 * hash, it recomputes the per-tenant signature server-side (GET
 * /api/assurance/verify/:id) and shows whether the signed record is intact. Lazy:
 * it fires only on click, so a table of N rows does not issue N verifications.
 */
export function EvidenceVerifyChip({ evidenceId }: { evidenceId: string }) {
  const [armed, setArmed] = useState(false);
  const { data, error, isLoading } = useSWR<VerifyResult>(
    armed ? `/api/assurance/verify/${encodeURIComponent(evidenceId)}` : null,
    (url: string) => fetcher<VerifyResult>(url),
  );

  if (!armed) {
    return (
      <Button
        size="xs"
        variant="ghost"
        onClick={() => setArmed(true)}
        aria-label={`Verify evidence ${evidenceId}`}
      >
        <ShieldCheck size={12} aria-hidden="true" /> Verify
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Badge intent="neutral" size="xs">
        <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Verifying…
      </Badge>
    );
  }

  if (error || !data) {
    return (
      <Badge intent="warning" size="xs" title={String(error ?? "no response")}>
        <ShieldAlert size={12} aria-hidden="true" /> Unverifiable
      </Badge>
    );
  }

  return data.verified ? (
    <Badge intent="success" size="xs" title={`content_hash: ${data.content_hash}`}>
      <ShieldCheck size={12} aria-hidden="true" /> Verified · {data.content_hash.slice(0, 8)}
    </Badge>
  ) : (
    <Badge intent="danger" size="xs" title={`content_hash: ${data.content_hash}`}>
      <ShieldAlert size={12} aria-hidden="true" /> Tampered
    </Badge>
  );
}
