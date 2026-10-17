import Link from "next/link";
import type { ReactNode } from "react";
import { StateBadge } from "./CapabilityBadge";
import { PRODUCT_DESCRIPTOR, PRODUCT_DISPLAY_NAME } from "@/lib/marketing/capabilities";
import { ARIA_DEVELOPMENT_LABEL, ariaInDevelopment, ariaProductState, ariaStatusNote } from "@/lib/marketing/aria";
import { PLATFORM_HREF } from "@/lib/marketing/site";

/**
 * ARIA as one product with one product-level state, for every marketing page
 * except /product (which keeps the per-capability states). The state comes
 * from lib/marketing/aria.ts, derived from the registry; nothing here names one.
 */

/** Compact: "ARIA  ◐ Launching  In development". */
export function AriaStatus({ showName = true }: { showName?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs text-muted" data-aria-status="">
      {showName && <span className="font-medium text-fg">{PRODUCT_DISPLAY_NAME}</span>}
      <StateBadge state={ariaProductState()} />
      {ariaInDevelopment() && <span>{ARIA_DEVELOPMENT_LABEL}</span>}
    </span>
  );
}

/** Product card: name, descriptor, status, status note and the link to /product. */
export function AriaProductCard({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-hair bg-surface p-6 ${className}`} data-aria-card="">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-fg">{PRODUCT_DISPLAY_NAME}</h3>
          <p className="mt-0.5 text-sm text-muted">{PRODUCT_DESCRIPTOR}</p>
        </div>
        <dl className="flex items-center gap-2 text-xs">
          <dt className="text-muted">Status</dt>
          <dd>
            <AriaStatus showName={false} />
          </dd>
        </dl>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-fg">{ariaStatusNote()}</p>
      {children && <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted">{children}</div>}
      <Link
        href={PLATFORM_HREF}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        See {PRODUCT_DISPLAY_NAME} <span aria-hidden="true">&nbsp;→</span>
      </Link>
    </div>
  );
}
