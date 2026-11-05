import Link from "next/link";
import type { Capability, CloudId } from "@/lib/marketing/capabilities";
import { renderedState } from "@/lib/marketing/capabilities";
import { CapabilityBadge } from "./CapabilityBadge";

const CLOUD_NAME: Record<CloudId, string> = { aws: "AWS", azure: "Azure", gcp: "Google Cloud" };

/**
 * A list of registry capabilities with their public state. Never pass a state
 * in: the badge reads it from the registry. The internal implementation status
 * is never rendered.
 */
export function CapabilityList({
  items,
  showClouds = false,
  interestHref,
}: {
  items: readonly Capability[];
  /** Show which clouds each capability applies to. */
  showClouds?: boolean;
  /** Where "Register interest" leads for Launching capabilities. Omit for no link. */
  interestHref?: string;
}) {
  return (
    <ul className="rounded-2xl border border-hair bg-surface px-5 sm:px-6">
      {items.map((c) => (
        <li
          key={c.id}
          id={`capability-${c.id}`}
          className="flex scroll-mt-24 flex-col gap-2 border-b border-hair py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
        >
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-fg">{c.name}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{c.summary}</p>
            {c.enablementWording && <p className="mt-1 text-xs leading-relaxed text-muted">{c.enablementWording}</p>}
            {(showClouds && c.clouds) || (interestHref && renderedState(c) === "launching") ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                {showClouds && c.clouds && <span>{c.clouds.map((id) => CLOUD_NAME[id]).join(" · ")}</span>}
                {interestHref && renderedState(c) === "launching" && (
                  <Link href={interestHref} className="font-medium text-accent underline-offset-4 hover:underline">
                    Register interest <span aria-hidden="true">→</span>
                  </Link>
                )}
              </p>
            ) : null}
          </div>
          <CapabilityBadge capability={c} />
        </li>
      ))}
    </ul>
  );
}
