"use client";

import { isFixtureData } from "@/lib/data";
import { FIXTURE_ORG } from "@/lib/fixtures";

/**
 * FixtureBanner — permanent, non-dismissible marker while the product renders
 * development data.
 *
 * Fixture data must never be mistaken for a customer's cloud. In production the
 * banner cannot appear, because a production build refuses to use fixtures at
 * all (lib/data/source.ts).
 */
export function FixtureBanner() {
  if (!isFixtureData) return null;
  return (
    <div
      role="status"
      className="rounded-[var(--radius-tight)] border border-[var(--status-warning)]/40 bg-[var(--status-warning)]/10 px-3 py-2 text-[var(--text-xs)] text-[var(--fg)]"
    >
      <strong className="font-semibold">Demo data.</strong> {FIXTURE_ORG.name} is a fictional
      organisation used for development. Nothing here describes a real cloud account.
    </div>
  );
}
