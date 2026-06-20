/**
 * lib/release — release / deployment metadata.
 *
 * Provides the canonical answer to "which version is this?" for:
 *   - support flows: customer reports an issue → know exactly which deploy
 *   - dashboard footer + ops console: visible version pin
 *   - /api/version: pluggable health endpoint
 *
 * Build-time provenance is read from environment variables that Vercel
 * (and Fly) inject automatically:
 *   - NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA      — git SHA of the deploy
 *   - NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF      — branch name
 *   - NEXT_PUBLIC_VERCEL_ENV                 — production | preview | development
 *   - NEXT_PUBLIC_DEPLOY_TIMESTAMP           — optional; set via CI
 *
 * NEXT_PUBLIC_* prefix makes them safe to expose to the browser (Next.js
 * inlines at build time). They are non-sensitive — git SHA + branch +
 * env names are public on GitHub already.
 *
 * Falls back to "dev" / "unknown" when not set so local dev works without
 * configuration.
 */

import packageJson from "../package.json";

export interface ReleaseInfo {
  /** Semver from package.json — bump on user-visible changes. */
  version: string;
  /** Short git SHA (8 chars). "unknown" if not injected. */
  sha: string;
  /** Branch name. "main" in production by convention. */
  branch: string;
  /** Deployment environment label: production | preview | development | dev. */
  env: "production" | "preview" | "development" | "dev";
  /** ISO timestamp of the deploy. Best-effort. */
  deployedAt: string | null;
  /** Pretty display string: "v0.1.0 · a1b2c3d4 · production". */
  label: string;
}

function pickEnv(raw: string | undefined): ReleaseInfo["env"] {
  if (raw === "production") return "production";
  if (raw === "preview") return "preview";
  if (raw === "development") return "development";
  return "dev";
}

function shortSha(s: string | undefined): string {
  if (!s) return "unknown";
  return s.slice(0, 8);
}

/**
 * getReleaseInfo — call at module load on either client or server. Values
 * are static (build-time-frozen) so this is safe to call from any context.
 */
export function getReleaseInfo(): ReleaseInfo {
  const version =
    (typeof packageJson === "object" && packageJson !== null && "version" in packageJson
      ? String(packageJson.version)
      : null) ?? "0.0.0";
  const sha = shortSha(
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA,
  );
  const branch =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ??
    process.env.VERCEL_GIT_COMMIT_REF ??
    "local";
  const env = pickEnv(process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV);
  const deployedAt =
    process.env.NEXT_PUBLIC_DEPLOY_TIMESTAMP ?? process.env.DEPLOY_TIMESTAMP ?? null;

  const label = `v${version} · ${sha} · ${env}`;
  return { version, sha, branch, env, deployedAt, label };
}

/**
 * Module-level singleton — release info doesn't change during a process
 * lifetime, so callers can read this directly without invoking the function.
 */
export const RELEASE = getReleaseInfo();
