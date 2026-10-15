"use client";

import { useState } from "react";
import { Badge, Button, Card, ConfirmDangerous, HStack, Section, Skeleton, VStack } from "@/lib/ui";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { useRemediationOffers } from "@/lib/data";
import { setFixEnabled } from "@/lib/api/remediation";
import type { RemediationOffer } from "@/lib/api/adapters/remediation";

/**
 * Which automated fixes this organisation allows.
 *
 * Every fix is off until an administrator of the organisation switches it on, and a fix the platform has not yet
 * validated cannot be switched on by anyone. Switching one on is a change to what Tricognita may do in your cloud, so
 * it needs a typed confirmation, and the API also requires an administrator who signed in with a second factor.
 * Everyone who can see this page can see what is on; only an administrator is offered the switch.
 */
function Row({ offer, mayChange, onChanged }: { offer: RemediationOffer; mayChange: boolean; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(on: boolean) {
    setBusy(true);
    setError(null);
    try {
      await setFixEnabled(offer.action, on);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <VStack gap="sm">
        <HStack className="flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[var(--text-sm)] text-[var(--fg)] break-words">{offer.summary}</p>
            <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
              <code>{offer.action}</code> · fixes {offer.controlId}
            </p>
          </div>
          <HStack className="items-center gap-2">
            {offer.enabled ? <Badge intent="success">On</Badge> : <Badge intent="neutral">Off</Badge>}
            {mayChange && offer.available && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => (offer.enabled ? void apply(false) : setConfirming(true))}
              >
                {busy ? "Working…" : offer.enabled ? "Switch off" : "Switch on"}
              </Button>
            )}
          </HStack>
        </HStack>
        <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
          To undo it: {offer.rollback}
        </p>
        {!offer.enabled && offer.reason && <p className="text-[var(--text-xs)] text-[var(--fg-subtle)]">{offer.reason}</p>}
        {error && (
          <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)]">
            {error}
          </p>
        )}
        <ConfirmDangerous
          open={confirming}
          onClose={() => setConfirming(false)}
          title={`Switch on: ${offer.summary}`}
          description="Tricognita will be able to make this change in your cloud account once someone requests it and a second person approves it. Nothing happens until then."
          confirmPhrase="SWITCH ON"
          confirmLabel="Switch on"
          onConfirm={async () => {
            setConfirming(false);
            await apply(true);
          }}
        />
      </VStack>
    </Card>
  );
}

export function AutomatedFixSettings() {
  const { role } = useSession();
  const offers = useRemediationOffers();
  const mayChange = canDo(role, "manageSettings");

  if (offers.unavailable) return null;
  const all = offers.data ?? [];
  const validated = all.filter((o) => o.available);
  const waiting = all.length - validated.length;
  return (
    <Section
      eyebrow="Automated fixes"
      title="What Tricognita may fix for you"
      description="Each kind of automated fix is off until an administrator switches it on. A fix still needs a request and a second person's approval before anything changes."
      spacing="sm"
    >
      {offers.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : offers.error ? (
        <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)]">
          The list of automated fixes could not be loaded: {offers.error.message}
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Automated fixes">
          {validated.map((o) => (
            <li key={o.action}>
              <Row offer={o} mayChange={mayChange} onChanged={offers.refresh} />
            </li>
          ))}
        </ul>
      )}
      {!offers.isLoading && !offers.error && waiting > 0 && (
        <p className="mt-2 text-[var(--text-xs)] text-[var(--fg-subtle)]">
          {waiting} more automated {waiting === 1 ? "fix is" : "fixes are"} implemented but not yet validated for use, so {waiting === 1 ? "it" : "they"} cannot be switched on.
        </p>
      )}
    </Section>
  );
}
