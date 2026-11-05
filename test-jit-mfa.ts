// MFA must reach the Go API only as a signed JIT claim derived from a verified session.
// Run: SENTINEL_JIT_SECRET=$(printf "x%.0s" {1..40}) SESSION_SECRET=$(printf "y%.0s" {1..40}) BOOTSTRAP_RESET_TOKEN=$(printf "z%.0s" {1..40}) SENTINEL_API_URL=http://localhost:1 DEMO_ADMIN_PASSWORD=synthetic-test-pass node --conditions=react-server --import tsx test-jit-mfa.ts
import { getJitToken } from "./lib/jit-token";
import { signSession, verifySession, signRefreshToken, verifyRefreshToken } from "./lib/auth";

let failed = 0;
const ok = (c: boolean, m: string) => { if (!c) { failed++; console.error("FAIL:", m); } else console.log("ok:  ", m); };
const claims = (t: string) => JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString());

(async () => {
  // No request context (tsx / cron): never MFA, whatever the caller hopes.
  ok(claims(await getJitToken({ sub: "a@x.com", tenantId: "t1", role: "ADMIN" })).mfa === undefined, "no session context => no mfa claim");
  ok(claims(await getJitToken({ sub: "a@x.com", tenantId: "t1", role: "ADMIN", mfa: false })).mfa === undefined, "mfa:false => no claim");
  ok(claims(await getJitToken({ sub: "a@x.com", tenantId: "t1", role: "ADMIN", mfa: true })).mfa === true, "explicit mfa:true => claim present");

  // Session and refresh token carry the flag through sign/verify, default false.
  const s1 = await verifySession(await signSession("a@x.com", "ADMIN", "t1", "", false, true), "", false);
  const s2 = await verifySession(await signSession("a@x.com", "ADMIN", "t1", "", false), "", false);
  ok(s1?.mfa === true, "session signed with mfa keeps mfa");
  ok(s2?.mfa === undefined, "session signed without mfa has no mfa");
  const r1 = await verifyRefreshToken(await signRefreshToken("a@x.com", "ADMIN", "t1", true));
  const r2 = await verifyRefreshToken(await signRefreshToken("a@x.com", "ADMIN", "t1"));
  ok(r1?.mfa === true && r2?.mfa === undefined, "refresh token carries mfa only when verified");

  // Tampering with the flag invalidates the session signature.
  const tok = await signSession("a@x.com", "ADMIN", "t1", "", false);
  const [p, sig] = tok.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url").toString()), mfa: true })).toString("base64url");
  ok((await verifySession(`${forged}.${sig}`, "", false)) === null, "forged mfa flag rejected");

  if (failed) { console.error(`${failed} assertion(s) failed`); process.exit(1); }
  console.log("PASS: all MFA claim assertions passed.");
})();
