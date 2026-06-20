# Setup Troubleshooting

> First-time setup issues + their fixes. If you hit something not covered here, open an issue with the `setup` label.

## The first-time setup that works

```bash
git clone https://github.com/tricognita/tricognita-frontend.git
cd tricognita-frontend
npm install
cp .env.example .env.local
# Edit .env.local — every "change-me" must be replaced before next step
npm run dev
```

Open `http://localhost:3000`. You should see the marketing site.

Sign in with the `DEMO_ADMIN_EMAIL` + `DEMO_ADMIN_PASSWORD` you set in `.env.local`. You should land in the dashboard rendering synthetic demo data.

If anything in those four steps doesn't work, the rest of this doc covers what to do.

## Common issues

### "Cannot find module" or "Module not found" on `npm run dev`

**Cause:** dependencies weren't installed.

**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build fails with TypeScript errors after a fresh clone

**Cause:** rare, usually means your Node version is out of date.

**Fix:** verify your Node version:
```bash
node -v   # should be 20.x or later
```

If you're below 20.x, upgrade. We recommend `nvm` (Node Version Manager) for easy switching.

### "SENTINEL_JIT_SECRET must be >= 32 bytes" on startup

**Cause:** you didn't replace the `change-me-min-32-bytes-...` placeholder in `.env.local`.

**Fix:** generate a real 32-byte secret:
```bash
openssl rand -base64 48
```

Paste that as the value for `SENTINEL_JIT_SECRET` and `SESSION_SECRET` (use different values for each).

### Login redirects back to login page

**Cause:** `DEMO_ADMIN_EMAIL` or `DEMO_ADMIN_PASSWORD` not set in `.env.local`, OR the password is below 12 characters.

**Fix:** in `.env.local`:
```
DEMO_ADMIN_EMAIL=admin@example.com
DEMO_ADMIN_PASSWORD=any-strong-password-at-least-12-chars
DEMO_ADMIN_NAME=Local Admin
```

Restart `npm run dev`. The bootstrap admin is created on first request.

### Dashboard loads but shows "Service degraded" banner

**Cause:** Upstash Redis isn't configured. Many features need Redis (notifications, telemetry, feedback, incidents, webhooks).

**Fix:** for local development, either:

**Option A — use a free Upstash Redis instance:**
1. Sign up at upstash.com (free tier is fine for dev).
2. Create a Redis database.
3. Copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` from the Upstash console.
4. Paste into `.env.local`.
5. Restart `npm run dev`.

**Option B — skip Redis for now:**
Most pages still render against `lib/demo-data.ts`. The banner is informational; you can continue.

### Port 3000 already in use

**Cause:** another Next.js dev server (or anything else) is bound to port 3000.

**Fix:**
```bash
# Either kill the other process:
lsof -i :3000   # find the PID
kill <PID>

# Or run on a different port:
npm run dev -- -p 3001
```

### `next build` succeeds but `npm run lint` fails

**Cause:** stricter lint rules vs build. Build passes with warnings; lint fails on errors.

**Fix:** read the specific lint error. Common causes:
- Importing a type-only as a value (or vice versa) — use `import type {...}` for type-only imports.
- React Compiler purity violations (e.g., `Date.now()` in render) — move into `useEffect` + `useState`.
- Unused variables — remove or prefix with `_` if intentional.

### Browser shows blank page

**Cause 1:** JavaScript disabled. Enable it.

**Cause 2:** browser is too old. We target evergreen Chrome / Firefox / Safari / Edge (≤2 years old).

**Cause 3:** ad blocker is over-blocking. Check the browser console for blocked requests.

### `/api/auth/me` returns 401 immediately after login

**Cause:** cookie issue. Most commonly: third-party cookie blocking, or the `SameSite` setting doesn't match your access pattern.

**Fix:**
- Ensure you're accessing via `http://localhost:3000` (not `127.0.0.1:3000`, not a custom domain).
- Check your browser hasn't blocked the cookie (DevTools → Application → Cookies → look for `trico_session`).

### Tenant data looks wrong after switching accounts

**Cause:** SWR cache hasn't been flushed (or there's a `TenantBoundary` bug).

**Fix:** logout + login. The `TenantBoundary` component in `app/dashboard/ClientLayout.tsx` should flush on tenant change; if it doesn't, that's a bug worth reporting.

## Environment variables explained

| Variable | Required? | What happens if missing |
|---|---|---|
| `SENTINEL_JIT_SECRET` | Yes, ≥32 bytes | Startup fails |
| `SESSION_SECRET` | Yes, ≥32 bytes | Startup fails |
| `BOOTSTRAP_RESET_TOKEN` | Yes, ≥24 bytes | Startup fails |
| `SENTINEL_API_URL` | Yes | Startup fails — points to your Go API instance |
| `DEMO_ADMIN_PASSWORD` | Yes, ≥12 chars | Startup fails (no first-run admin without it) |
| `DEMO_ADMIN_EMAIL` | Yes | Bootstrap admin not created |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Recommended | Many features degrade (telemetry/feedback/notifications/webhooks/incidents fail open) |
| `DATABASE_URL` | Recommended | User accounts beyond the bootstrap admin won't persist |
| `CRON_SECRET` | Recommended for prod | Webhook retry queue can't drain |
| `DEMO_MODE` | Optional | Set to `true` to enable `/api/admin/demo-reset` (otherwise 404) |

## Debugging tips

### Server logs

```bash
npm run dev
# Server logs print to stdout — structured JSON in production, pretty in dev
```

Every request has a `request_id` — search for it across BFF logs to follow a single request end-to-end.

### Browser console

Open DevTools → Console. SWR errors include the correlation_id from the server response, useful for matching client-side errors to server logs.

### Network tab

`/api/auth/me` is hit on every page render — if it's failing, that's the first place to look.

### Type errors

```bash
npx tsc --noEmit
```

Will report every TypeScript error in the codebase. Should be 0 on a clean checkout.

### Lint errors

```bash
npm run lint
```

Should be 0 errors (warnings are OK and pre-existing).

## When you're truly stuck

1. **Search existing issues** at https://github.com/tricognita/tricognita-frontend/issues.
2. **Open a new issue** with the `setup` label, including:
   - Your OS + Node version.
   - The exact command that failed.
   - The full error output.
   - What you've already tried.
3. **For private / sensitive setup questions** (e.g., enterprise deployment), email `support@tricognita.com`.

## What we will NOT debug remotely

- Your specific cloud account's IAM policy mistakes (those are your cloud's problem, not Tricognita's).
- Custom modifications to the codebase that we haven't reviewed.
- Issues that depend on running against a private Go API (we don't ship that publicly — see `OSS_SAFE.md`).
- Issues that only reproduce with a real production deployment (raise via private security advisory if security-relevant; otherwise email support).

For everything else, we're happy to help.

Last reviewed: 2026-05-23 (Phase 24).
