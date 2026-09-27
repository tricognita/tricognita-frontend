"use client";

import { useState } from "react";
import { Button, HStack, Modal, VStack } from "@/lib/ui";
import type { RemediationOffer } from "@/lib/api/adapters/remediation";
import { useRemediationMutations } from "@/lib/data/hooks";

/**
 * RequestRemediationForm — the one place a new remediation is named.
 *
 * Tricognita never shows a resource's full identifier in this product (see
 * Resource.identifierMasked): the person requesting a fix supplies it, the
 * way they already know it from their own cloud console. The action is
 * always one of the control's allow-listed offers, never free text, so the
 * request can only ever be the bounded, server-validated kind the backend
 * already accepts.
 */

interface RequestRemediationFormProps {
  open: boolean;
  onClose: () => void;
  controlId: string;
  offers: RemediationOffer[];
}

export function RequestRemediationForm({
  open,
  onClose,
  controlId,
  offers,
}: RequestRemediationFormProps) {
  const enabledOffers = offers.filter((o) => o.enabled);
  const [actionIndex, setActionIndex] = useState(0);
  const [resourceUrn, setResourceUrn] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [requestedId, setRequestedId] = useState<string | undefined>(undefined);
  const { request, pending, error } = useRemediationMutations();

  const selected = enabledOffers[actionIndex];
  const canSubmit = Boolean(selected) && resourceUrn.trim().length > 0 && !pending;

  function reset() {
    setActionIndex(0);
    setResourceUrn("");
    setParams({});
    setRequestedId(undefined);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submit() {
    if (!selected || !resourceUrn.trim()) return;
    const id = await request({
      controlId,
      resourceUrn: resourceUrn.trim(),
      action: selected.action,
      params: selected.requiredParams.length > 0 ? params : undefined,
    });
    setRequestedId(id);
  }

  if (enabledOffers.length === 0) {
    return (
      <Modal open={open} onClose={handleClose} title="Request a fix">
        <VStack gap="xs">
          {offers.length === 0 ? (
            <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">
              No automated fix is available for this control right now.
            </p>
          ) : (
            offers.map((o) => (
              <p key={o.action} className="text-[var(--text-sm)] text-[var(--fg-muted)]">
                {o.summary || o.action}: {o.reason ?? "not available"}
              </p>
            ))
          )}
        </VStack>
      </Modal>
    );
  }

  if (requestedId) {
    return (
      <Modal open={open} onClose={handleClose} title="Fix requested">
        <VStack gap="sm">
          <p className="text-[var(--text-sm)] text-[var(--fg)]">
            The request has been recorded and is waiting for approval. It will appear in the
            remediation queue.
          </p>
          <HStack justify="end">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Done
            </Button>
          </HStack>
        </VStack>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Request a fix"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => void submit()} loading={pending} disabled={!canSubmit}>
            Request
          </Button>
        </>
      }
    >
      <VStack gap="sm">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Action</span>
          <select
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[var(--text-sm)] text-[var(--fg)]"
            value={actionIndex}
            onChange={(e) => setActionIndex(Number(e.target.value))}
            disabled={pending}
          >
            {enabledOffers.map((o, i) => (
              <option key={o.action} value={i}>
                {o.summary || o.action}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
            Resource identifier
          </span>
          <input
            type="text"
            required
            autoComplete="off"
            spellCheck={false}
            disabled={pending}
            placeholder="e.g. the bucket name or resource id from your cloud console"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[var(--text-sm)] text-[var(--fg)] font-mono"
            value={resourceUrn}
            onChange={(e) => setResourceUrn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) void submit();
            }}
          />
          <span className="text-[10px] text-[var(--fg-subtle)]">
            Tricognita does not show a resource&apos;s full identifier in this product — enter it as
            it appears in your own cloud console.
          </span>
        </label>

        {selected?.requiredParams.map((p) => (
          <label key={p} className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{p}</span>
            <input
              type="text"
              required
              disabled={pending}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[var(--text-sm)] text-[var(--fg)]"
              value={params[p] ?? ""}
              onChange={(e) => setParams((prev) => ({ ...prev, [p]: e.target.value }))}
            />
          </label>
        ))}

        {selected?.rollback && (
          <p className="text-[10px] text-[var(--fg-subtle)]">Rollback: {selected.rollback}</p>
        )}

        {error && (
          <span role="alert" className="text-[10px] text-[var(--intent-danger)]">
            {error.message}
          </span>
        )}
      </VStack>
    </Modal>
  );
}
