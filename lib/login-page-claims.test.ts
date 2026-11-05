/**
 * The sign-in page must not claim a certification Tricognita does not hold.
 * The approved position (lib/marketing/security.ts, CERTIFICATION_STATEMENT) is
 * "Tricognita does not yet hold a SOC 2 or ISO 27001 certification."; the login
 * footer used to read "... SOC 2 Type II · ISO 27001", which contradicted it.
 * The marketing tests do not cover app/login, so this one does.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const LOGIN_PAGE = join(ROOT, "app", "login", "ClientPage.tsx");

/** The approved footer wording. */
const APPROVED_FOOTER = "Protected by signed sessions · Multi-factor authentication supported";

/** Remove comments so only code and visible text are inspected. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Certification or attestation names that must never appear on the sign-in page. */
function findCertificationClaims(text: string): string[] {
  const patterns = [/SOC[\s-]?2\b/i, /ISO(?:\/IEC)?[\s-]?27001/i, /ISO[\s-]?42001/i];
  return patterns.filter((p) => p.test(text)).map((p) => p.source);
}

test("the claim detector flags the wording that was removed and accepts the approved wording", () => {
  assert.ok(
    findCertificationClaims("Protected by JIT-signed sessions · SOC 2 Type II · ISO 27001").length === 2,
    "the old footer must be flagged for both SOC 2 and ISO 27001",
  );
  assert.ok(findCertificationClaims("SOC2").length === 1);
  assert.ok(findCertificationClaims("ISO/IEC 27001").length === 1);
  assert.ok(findCertificationClaims("soc 2 type ii").length === 1);
  assert.deepEqual(findCertificationClaims(APPROVED_FOOTER), []);
});

test("the login page shows the approved footer wording", () => {
  const source = withoutComments(readFileSync(LOGIN_PAGE, "utf8"));
  assert.ok(source.includes(APPROVED_FOOTER), `login footer must read exactly: "${APPROVED_FOOTER}"`);
});

test("the login page makes no SOC 2 or ISO 27001 claim", () => {
  const source = withoutComments(readFileSync(LOGIN_PAGE, "utf8"));
  assert.deepEqual(
    findCertificationClaims(source),
    [],
    "app/login/ClientPage.tsx names a certification Tricognita does not hold (see lib/marketing/security.ts CERTIFICATION_STATEMENT)",
  );
});
