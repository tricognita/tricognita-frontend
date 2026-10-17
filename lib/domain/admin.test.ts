/**
 * Administration: ordering, capability gating, and the rules about what must
 * never be rendered.
 *
 * The last group is the point of this file. Admin pages are the only place in
 * the product where a careless field would leak a credential, so the contract
 * is asserted against the fixtures themselves rather than trusted to review.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  accountsByAttention,
  alertRoutesByStatus,
  invitedUsers,
  uncoveredAlertEvents,
  usersByName,
} from "./selectors";
import { ACCOUNT_CONNECTION, ALERT_CHANNEL_LABEL, ALERT_EVENT_LABEL, USER_STATUS } from "./status";
import { PRODUCT_ROLE_LABEL } from "./roles";
import type { AlertEvent } from "./status";
import { FIXTURE_ACCOUNTS, FIXTURE_ALERT_ROUTES, FIXTURE_ORG, FIXTURE_USERS } from "../fixtures";
import { canDo } from "@/lib/rbac";

const ALL_EVENTS: readonly AlertEvent[] = ["DRIFT", "NEW_FAILURE", "VERIFICATION_FAILED"];
const ALL_ROLES = [
  "ADMIN",
  "SECOPS",
  "AUDITOR",
  "VIEWER",
  "SOC_LEAD",
  "DEVSECOPS",
  "CLOUD_ENGINEER",
  "RED_TEAMER",
  "FINOPS_ANALYST",
  "CLIENT",
] as const;

// ─── Ordering ───────────────────────────────────────────────────────────────

test("accounts that cannot be read cleanly are listed first, then alphabetically", () => {
  const before = FIXTURE_ACCOUNTS.map((a) => a.id);
  const ordered = accountsByAttention(FIXTURE_ACCOUNTS);
  assert.equal(ordered.length, FIXTURE_ACCOUNTS.length, "none is dropped");

  const firstHealthy = ordered.findIndex((a) => a.connection === "CONNECTED");
  if (firstHealthy !== -1) {
    for (let i = firstHealthy; i < ordered.length; i += 1) {
      assert.equal(ordered[i].connection, "CONNECTED", "no broken account sits after a healthy one");
    }
  }
  const aliases = ordered.filter((a) => a.connection === "CONNECTED").map((a) => a.alias);
  assert.deepEqual(aliases, [...aliases].sort(), "healthy accounts are alphabetical");

  assert.deepEqual(
    ordered.map((a) => a.id),
    accountsByAttention([...FIXTURE_ACCOUNTS].reverse()).map((a) => a.id),
    "ordering does not depend on input order",
  );
  assert.deepEqual(FIXTURE_ACCOUNTS.map((a) => a.id), before, "input is not mutated");
  assert.deepEqual(accountsByAttention([]), [], "an empty list stays empty");
});

test("users are listed by name, deterministically", () => {
  const before = FIXTURE_USERS.map((u) => u.id);
  const ordered = usersByName(FIXTURE_USERS);
  assert.equal(ordered.length, FIXTURE_USERS.length);
  assert.deepEqual(
    ordered.map((u) => u.name),
    [...ordered.map((u) => u.name)].sort(),
    "ascending by name",
  );
  assert.deepEqual(
    ordered.map((u) => u.id),
    usersByName([...FIXTURE_USERS].reverse()).map((u) => u.id),
    "ordering does not depend on input order",
  );
  assert.deepEqual(FIXTURE_USERS.map((u) => u.id), before, "input is not mutated");
  assert.deepEqual(usersByName([]), []);
});

test("invited users are exactly those who have not signed in", () => {
  const invited = invitedUsers(FIXTURE_USERS);
  for (const u of invited) {
    assert.equal(u.status, "INVITED");
    assert.equal(u.lastActiveAt, undefined, "someone who never signed in has no last-active time");
  }
  assert.equal(invited.length, FIXTURE_USERS.filter((u) => u.status === "INVITED").length);
  assert.deepEqual(invitedUsers([]), []);
});

test("enabled alert routes lead, and a disabled route is kept, not hidden", () => {
  const ordered = alertRoutesByStatus(FIXTURE_ALERT_ROUTES);
  assert.equal(ordered.length, FIXTURE_ALERT_ROUTES.length, "nothing is filtered out");
  let seenDisabled = false;
  for (const r of ordered) {
    if (!r.enabled) seenDisabled = true;
    else assert.equal(seenDisabled, false, "no enabled route sits after a disabled one");
  }
  assert.deepEqual(
    ordered.map((r) => r.id),
    alertRoutesByStatus([...FIXTURE_ALERT_ROUTES].reverse()).map((r) => r.id),
    "ordering does not depend on input order",
  );
  assert.deepEqual(alertRoutesByStatus([]), []);
});

test("uncovered events are those no enabled route subscribes to", () => {
  const covered = new Set(
    FIXTURE_ALERT_ROUTES.filter((r) => r.enabled).flatMap((r) => r.events),
  );
  const uncovered = uncoveredAlertEvents(FIXTURE_ALERT_ROUTES, ALL_EVENTS);
  for (const e of uncovered) assert.equal(covered.has(e), false, `${e} really is uncovered`);
  assert.equal(uncovered.length, ALL_EVENTS.filter((e) => !covered.has(e)).length);

  assert.deepEqual(
    uncoveredAlertEvents([], ALL_EVENTS),
    [...ALL_EVENTS],
    "with no routes at all, every event is uncovered",
  );

  const disabledOnly = FIXTURE_ALERT_ROUTES.map((r) => ({ ...r, enabled: false }));
  assert.deepEqual(
    uncoveredAlertEvents(disabledOnly, ALL_EVENTS),
    [...ALL_EVENTS],
    "a disabled route covers nothing",
  );
});

// ─── Vocabulary ─────────────────────────────────────────────────────────────

test("every admin state has a label, and none is conveyed by colour alone", () => {
  for (const [state, p] of Object.entries(ACCOUNT_CONNECTION)) {
    assert.ok(p.label.length > 0, `${state} has a label`);
    assert.ok(p.shape.length > 0, `${state} has a shape marker as well as an intent`);
    assert.ok(p.meaning.length > 0, `${state} explains itself`);
  }
  for (const [state, p] of Object.entries(USER_STATUS)) {
    assert.ok(p.label.length > 0 && p.shape.length > 0, `${state} is labelled and shaped`);
  }
  for (const r of FIXTURE_ALERT_ROUTES) {
    assert.ok(ALERT_CHANNEL_LABEL[r.channel], `${r.channel} has a label`);
    for (const e of r.events) assert.ok(ALERT_EVENT_LABEL[e], `${e} has a label`);
  }
  for (const u of FIXTURE_USERS) {
    assert.ok(PRODUCT_ROLE_LABEL[u.role], `${u.role} has a customer-facing label`);
    assert.ok(USER_STATUS[u.status], `${u.status} has a presentation`);
  }
  for (const a of FIXTURE_ACCOUNTS) {
    assert.ok(ACCOUNT_CONNECTION[a.connection], `${a.connection} has a presentation`);
  }
});

test("a permission failure never presents as a healthy connection", () => {
  assert.notEqual(
    ACCOUNT_CONNECTION.PERMISSION_FAILURE.intent,
    ACCOUNT_CONNECTION.CONNECTED.intent,
    "the two must not share a visual intent",
  );
  assert.notEqual(
    ACCOUNT_CONNECTION.PERMISSION_FAILURE.shape,
    ACCOUNT_CONNECTION.CONNECTED.shape,
    "nor a shape marker",
  );
  assert.match(
    ACCOUNT_CONNECTION.PERMISSION_FAILURE.meaning,
    /Not assessed/,
    "it says what it does to the customer's results",
  );
});

// ─── Capability gating ──────────────────────────────────────────────────────

test("administration capabilities stay with the administrator", () => {
  const adminOnly = ["manageUsers", "manageAlertRoutes", "manageApiKeys", "manageSettings", "manageCloudAccounts"] as const;
  for (const cap of adminOnly) {
    for (const role of ALL_ROLES) {
      assert.equal(
        canDo(role, cap),
        role === "ADMIN",
        `${cap} is ${role === "ADMIN" ? "granted to" : "withheld from"} ${role}`,
      );
    }
  }
});

test("reading is broader than changing, and the audit trail is narrower than reading", () => {
  for (const role of ALL_ROLES) {
    if (canDo(role, "manageCloudAccounts")) {
      assert.equal(canDo(role, "viewCloudResources"), true, `${role} can read what it may change`);
    }
    if (canDo(role, "viewAuditTrail")) {
      assert.equal(canDo(role, "viewCloudResources"), true, `${role} reading the trail can read the product`);
    }
  }
  assert.equal(canDo("VIEWER", "viewCloudResources"), true, "a viewer may see connected accounts");
  assert.equal(canDo("VIEWER", "viewAuditTrail"), false, "a viewer may not read the audit trail");
  assert.equal(canDo(null, "manageUsers"), false, "no session, no capability");
});

// ─── Nothing secret is rendered ─────────────────────────────────────────────

test("no admin fixture carries a credential for a page to render by accident", () => {
  const SECRET_KEY = /secret|token|password|credential|privatekey|private_key|apikey|api_key|accesskey|access_key/i;
  const SECRET_VALUE = /^(AKIA|ASIA|xox[baprs]-|ghp_|sk-|-----BEGIN)/;

  const records: Record<string, unknown>[] = [
    ...(FIXTURE_ACCOUNTS as unknown as Record<string, unknown>[]),
    ...(FIXTURE_ALERT_ROUTES as unknown as Record<string, unknown>[]),
    ...(FIXTURE_USERS as unknown as Record<string, unknown>[]),
    FIXTURE_ORG as unknown as Record<string, unknown>,
  ];

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      assert.ok(!SECRET_KEY.test(key), `${key} must not exist on an admin record`);
      if (typeof value === "string") {
        assert.ok(!SECRET_VALUE.test(value), `${key} must not hold a credential-shaped value`);
      }
    }
  }
});

test("an account identifier exists only in its masked form", () => {
  for (const a of FIXTURE_ACCOUNTS) {
    assert.ok(a.accountIdMasked.length > 0, `${a.id} has a masked identifier`);
    assert.match(a.accountIdMasked, /•/, `${a.id} is actually masked`);
    assert.ok(
      !/\b\d{12}\b/.test(a.accountIdMasked),
      `${a.id} does not reveal a full 12-digit account number`,
    );
    assert.equal(
      "accountId" in (a as unknown as Record<string, unknown>),
      false,
      `${a.id} carries no unmasked identifier for a page to reach for`,
    );
  }
});

test("an alert destination exists only in its masked form", () => {
  for (const r of FIXTURE_ALERT_ROUTES) {
    assert.ok(r.destinationMasked.length > 0, `${r.id} has a masked destination`);
    assert.ok(
      !/^https?:\/\//i.test(r.destinationMasked),
      `${r.id} does not expose a webhook URL`,
    );
    assert.equal(
      "destination" in (r as unknown as Record<string, unknown>),
      false,
      `${r.id} carries no unmasked destination`,
    );
  }
});

test("no admin derivation produces a score, rating or grade", () => {
  const derived = [
    ...accountsByAttention(FIXTURE_ACCOUNTS),
    ...usersByName(FIXTURE_USERS),
    ...alertRoutesByStatus(FIXTURE_ALERT_ROUTES),
  ] as unknown as Record<string, unknown>[];
  for (const record of derived) {
    for (const key of Object.keys(record)) {
      assert.ok(
        !/score|percent|rating|grade|maturity|risk|priority|rank/i.test(key),
        `${key} must not exist`,
      );
    }
  }
});
