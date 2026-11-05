import { renderedState, STATE_LABEL, type Capability, type PublicState } from "@/lib/marketing/capabilities";

/**
 * Public capability state: Available ●, Launching ◐, Planned ○.
 * The state is conveyed by the word and the shape, never by colour alone.
 * Deferred renders nothing (deferred capabilities are not shown).
 */
const STYLE: Record<Exclude<PublicState, "deferred">, { mark: string; color: string }> = {
  available: { mark: "●", color: "var(--status-success)" },
  launching: { mark: "◐", color: "var(--status-info)" },
  planned: { mark: "○", color: "var(--muted)" },
};

export function StateBadge({ state, capabilityId }: { state: PublicState; capabilityId?: string }) {
  if (state === "deferred") return null;
  const s = STYLE[state];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 self-start whitespace-nowrap rounded-full border border-hair px-2.5 py-0.5 text-xs font-medium"
      style={{ color: s.color }}
      data-state={state}
      data-capability={capabilityId}
    >
      <span aria-hidden="true">{s.mark}</span>
      {STATE_LABEL[state]}
    </span>
  );
}

/** Badge for a registry capability. Always renders the gate-checked state. */
export function CapabilityBadge({ capability }: { capability: Capability }) {
  return <StateBadge state={renderedState(capability)} capabilityId={capability.id} />;
}

/** Legend explaining the states, shown once near any list that uses badges. */
export function StateLegend() {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
      <div className="flex items-center gap-2">
        <dt>
          <StateBadge state="available" />
        </dt>
        <dd>Delivering now</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt>
          <StateBadge state="launching" />
        </dt>
        <dd>Being prepared for launch — register interest</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt>
          <StateBadge state="planned" />
        </dt>
        <dd>On the roadmap</dd>
      </div>
    </dl>
  );
}
