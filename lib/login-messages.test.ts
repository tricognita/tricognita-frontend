import { test } from "node:test";
import assert from "node:assert/strict";
import { loginErrorMessage } from "./login-messages";

test("every sign-in failure is in plain language, never a machine code", () => {
  for (const code of ["invalid_credentials", "invalid_mfa_code", "rate_limited", "invalid_email", "invalid_password", "internal_error", "payload_too_large", undefined, 42]) {
    const m = loginErrorMessage(code, null);
    assert.ok(m.length > 10 && !/[a-z]+_[a-z_]+/.test(m), `${String(code)} -> ${m}`);
  }
});

test("a wrong password reads the same whatever the account", () => {
  assert.equal(loginErrorMessage("invalid_credentials", null), "The email or password is incorrect.");
});

test("a lockout says how long", () => {
  assert.match(loginErrorMessage("rate_limited", "45"), /45 seconds/);
  assert.match(loginErrorMessage("rate_limited", "300"), /5 minutes/);
  assert.match(loginErrorMessage("rate_limited", null), /few minutes/);
});
