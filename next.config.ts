import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// ── CSP ──────────────────────────────────────────────────────────────────────
// Production CSP — no localhost, no unsafe-eval.
// Development CSP — allows localhost:8787 for the local Go API + WS for HMR.
// SENTINEL_API_URL is set in Vercel env vars (e.g. https://api.example.com).
//
// `'unsafe-inline'` on script-src is required by Next.js for the framework's
// inline bootstrap (`__NEXT_DATA__`, RSC streaming runtime). A nonce-based
// CSP would tighten this further but requires a custom server / edge layer
// that mints a per-request nonce — non-trivial refactor; tracked.
//
// `'unsafe-inline'` on style-src is required by Tailwind v4's preflight and
// by any inline style attribute. Same nonce caveat applies.
// In production deployments, SENTINEL_API_URL MUST be set to the Go API
// host. The "must be configured" fallback string is deliberately invalid
// so an unset env var fails fast rather than connecting to a wrong host.
const apiHost = process.env.SENTINEL_API_URL ?? "https://api.must-be-configured.invalid";
const connectSrc = isProd
  ? `'self' ${apiHost} https://*.amazonaws.com https://*.fly.dev`
  : "'self' http://localhost:8787 ws://localhost:3000 https://*.amazonaws.com";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Cloudflare insights script is loaded by the Cloudflare proxy when
      // the route is served through cloudflare.com — keep allowlisted.
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://avatars.githubusercontent.com",
      `connect-src ${connectSrc}`,
      "media-src 'none'",
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "worker-src 'self' blob:",   // explicit (was inherited from script-src)
      "manifest-src 'self'",        // explicit (defaults to self but document)
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  // 2-year HSTS, includeSubDomains, preload-eligible.
  { key: "Strict-Transport-Security",    value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",              value: "DENY" },
  { key: "X-Content-Type-Options",       value: "nosniff" },
  { key: "Referrer-Policy",              value: "strict-origin-when-cross-origin" },
  // Disable browser features we don't use. interest-cohort opts out of FLoC.
  { key: "Permissions-Policy",           value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), accelerometer=(), gyroscope=(), magnetometer=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Defense-in-depth: explicit X-DNS-Prefetch-Control off and X-Permitted-
  // Cross-Domain-Policies none (Flash/PDF era but cheap and harmless).
  { key: "X-DNS-Prefetch-Control",       value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

// Cache-control: by default, every dynamic / API response should not be
// cached by intermediaries. Next.js sets sane defaults for static assets
// (immutable hashed filenames); these headers explicitly opt OUT for the
// dynamic routes. Per-route overrides (e.g. system-health's 30s cache)
// take precedence because they set the header directly on the Response.
const apiHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
  { key: "Pragma", value: "no-cache" },
];

const nextConfig: NextConfig = {
  // standalone = Docker/EC2; skip on Vercel (VERCEL=1 is set automatically there).
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  // Block TS regressions — the codebase is tsc-clean and we want builds to
  // fail on type errors instead of silently shipping a broken type contract.
  typescript: { ignoreBuildErrors: false },
  // Pin Turbopack workspace root to this directory so it doesn't traverse up
  // to the repo-root package-lock.json and pick the wrong workspace root.
  turbopack: { root: __dirname },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: apiHeaders },
    ];
  },
};

export default nextConfig;
