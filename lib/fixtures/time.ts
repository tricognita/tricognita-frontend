/**
 * Fixture time anchor.
 *
 * Every fixture timestamp derives from this constant. No Date.now(), no
 * randomness, no per-render generation — the dataset must be byte-identical on
 * every machine and every render so screenshots, tests and review conversations
 * all describe the same data.
 *
 * Anchored to the Phase 0 review date.
 */
export const FIXTURE_NOW = "2026-09-17T09:00:00.000Z";

const MS_HOUR = 3_600_000;
const MS_DAY = 24 * MS_HOUR;

function shift(ms: number): string {
  return new Date(Date.parse(FIXTURE_NOW) + ms).toISOString();
}

export function hoursBefore(h: number): string {
  return shift(-h * MS_HOUR);
}

export function daysBefore(d: number, atHour = 6): string {
  const base = new Date(Date.parse(FIXTURE_NOW) - d * MS_DAY);
  base.setUTCHours(atHour, 0, 0, 0);
  return base.toISOString();
}

export function daysAfter(d: number, atHour = 6): string {
  const base = new Date(Date.parse(FIXTURE_NOW) + d * MS_DAY);
  base.setUTCHours(atHour, 0, 0, 0);
  return base.toISOString();
}

export function minutesAfter(iso: string, m: number): string {
  return new Date(Date.parse(iso) + m * 60_000).toISOString();
}
