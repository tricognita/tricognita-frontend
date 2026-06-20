import "server-only";
// File-backed user store. Node runtime only (NOT edge).
// Passwords stored as PBKDF2-SHA256 hashes with per-user salt.

import { promises as fs } from "node:fs";
import path from "node:path";
import { webcrypto } from "node:crypto";
import { Redis } from "@upstash/redis";
import { type Role } from "./auth";
import { type UserRole, getRoleMetadata, mockUsers } from "./role-utils";
import { getRequiredEnv } from "./env";

export type UserStatus = "active" | "invite" | "deactivated";
export type UserPlan = "free" | "starter" | "professional" | "enterprise";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  plan: UserPlan;            // Subscription / access tier
  tenantId: string;
  status: UserStatus;
  salt: string | null;       // base64; null for pending invites
  passwordHash: string | null;
  mfaSecret: string | null;  // base32 TOTP secret
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  mustReset: boolean; // Forces password change on first login
  modules?: string[]; // Dynamic RBAC module access
}

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PBKDF2_ITERATIONS = 120_000;

// Serverless hosts (Vercel, Lambda) have a read-only filesystem, so we keep
// the user store purely in memory and reseed on every cold start. Local dev
// keeps durable file-backed storage. `USERS_STORE=file` forces file mode;
// `USERS_STORE=memory` forces memory mode.
const FORCE = (process.env.USERS_STORE ?? "").toLowerCase();
const IS_SERVERLESS =
  FORCE === "memory"
    ? true
    : FORCE === "file"
      ? false
      : !!process.env.VERCEL ||
        !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.NODE_ENV === "production";

let memoryStore: User[] | null = IS_SERVERLESS ? [] : null;
let fileWriteDisabled = IS_SERVERLESS;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const REDIS_KEY = "tricognita:users:v7"; // v7 — added plan field

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromB64(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64"));
}

async function pbkdf2(password: string, saltB64: string): Promise<string> {
  const salt = fromB64(saltB64);
  const key = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return b64(new Uint8Array(bits));
}

function randomSalt(): string {
  const s = new Uint8Array(16);
  webcrypto.getRandomValues(s);
  return b64(s);
}

function randomId(): string {
  const s = new Uint8Array(8);
  webcrypto.getRandomValues(s);
  return Array.from(s).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readAll(): Promise<User[]> {
  if (redis) {
    try {
      const data = await redis.get<User[]>(REDIS_KEY);
      if (data && Array.isArray(data)) return data;
      return [];
    } catch (err) {
      console.warn("[users] Redis read failed, falling back to memory", err);
    }
  }
  if (memoryStore !== null) return memoryStore;
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(raw) as User[];
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    if (code === "EROFS" || code === "EACCES") {
      memoryStore = [];
      fileWriteDisabled = true;
      return memoryStore;
    }
    throw err;
  }
}

async function writeAll(users: User[]): Promise<void> {
  if (redis) {
    try {
      await redis.set(REDIS_KEY, users);
      return;
    } catch (err) {
      console.warn("[users] Redis write failed, falling back to memory", err);
    }
  }
  if (memoryStore !== null) {
    memoryStore = users;
    return;
  }
  if (fileWriteDisabled) {
    memoryStore = users;
    return;
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EROFS" || code === "EACCES") {
      console.warn(`[users] file store unavailable (${code}); using in-memory fallback`);
      memoryStore = users;
      fileWriteDisabled = true;
      return;
    }
    throw err;
  }
}

// Serialize all read-modify-write sequences so concurrent invites / role
// changes cannot last-write-wins each other.
let writeQueue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(fn, fn);
  // Keep the chain alive even if fn throws, but do not propagate the rejection
  // to subsequent callers.
  writeQueue = next.catch(() => undefined);
  return next;
}

let seeded = false;

async function ensureSeed(): Promise<void> {
  if (seeded) return;
  // Serialize the entire seed read+write so cold-start concurrency can't
  // double-seed. Re-check the flag inside the lock.
  await withLock(async () => {
    if (seeded) return;
    const users = await readAll();
    // Single source of truth: env. No fallbacks, no hardcoded overrides.
    const bootstrapPass = getRequiredEnv("DEMO_ADMIN_PASSWORD");
    const adminEmail = (process.env.DEMO_ADMIN_EMAIL ?? "admin@example.tricognita.com").toLowerCase();

    const admin = users.find((u) => u.email === adminEmail);
    const now = new Date().toISOString();

    if (!admin) {
      const salt = randomSalt();
      users.push({
        id: randomId(),
        email: adminEmail,
        name: process.env.DEMO_ADMIN_NAME ?? "Platform Admin",
        role: "ADMIN",
        plan: "enterprise" as UserPlan,
        tenantId: "tricognita-global",
        status: "active",
        salt,
        passwordHash: await pbkdf2(bootstrapPass, salt),
        mfaSecret: null,
        mfaEnabled: false,
        lastLoginAt: null,
        createdAt: now,
        mustReset: true,
      });
      await writeAll(users);
      console.info("[auth] Bootstrap admin synced (created from env)");
    } else if (admin.mustReset) {
      // Pre-rotation: keep hash deterministically aligned with current env on
      // every cold start. Once the admin completes the forced reset
      // (mustReset=false), env stops being authoritative for that account.
      const salt = randomSalt();
      admin.salt = salt;
      admin.passwordHash = await pbkdf2(bootstrapPass, salt);
      admin.status = "active";
      await writeAll(users);
      console.info("[auth] Admin password rotated from ENV (pre-reset bootstrap)");
    }

    seeded = true;
  });
}

export async function listUsers(): Promise<User[]> {
  await ensureSeed();
  return readAll();
}

export async function findByEmail(email: string): Promise<User | null> {
  await ensureSeed();
  const users = await readAll();
  return users.find((u) => u.email === email.toLowerCase()) ?? null;
}

export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const user = await findByEmail(email);
  if (!user) return null;
  if (user.status !== "active") return null;
  if (!user.salt || !user.passwordHash) return null;
  const hash = await pbkdf2(password, user.salt);
  if (!constantTimeEqual(hash, user.passwordHash)) return null;
  // Backfill tenantId on legacy records so signSession produces a valid JWT
  if (!user.tenantId) user.tenantId = "tricognita-global";
  return user;
}

export async function touchLogin(email: string): Promise<void> {
  await withLock(async () => {
    const users = await readAll();
    const u = users.find((x) => x.email === email.toLowerCase());
    if (!u) return;
    u.lastLoginAt = new Date().toISOString();
    await writeAll(users);
  });
}

export async function findById(id: string): Promise<User | null> {
  await ensureSeed();
  const users = await readAll();
  return users.find((u) => u.id === id) ?? null;
}

export async function inviteUser(input: {
  email: string;
  name: string;
  role: Role;
  plan?: UserPlan;
  modules?: string[];
}): Promise<User> {
  await ensureSeed();
  return withLock(async () => {
    const email = input.email.trim().toLowerCase();
    const users = await readAll();
    if (users.some((u) => u.email === email)) {
      throw new Error("email_exists");
    }
    const user: User = {
      id: randomId(),
      email,
      name: input.name.trim(),
      role: input.role,
      plan: input.plan ?? "free",
      tenantId: "tricognita-global",
      status: "invite",
      salt: null,
      passwordHash: null,
      mfaSecret: null,
      mfaEnabled: false,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      mustReset: true, // Invitees must set password on first entry
      modules: input.modules,
    };
    users.push(user);
    await writeAll(users);
    return user;
  });
}

export async function updateRole(id: string, role: Role): Promise<User | null> {
  return withLock(async () => {
    const users = await readAll();
    const u = users.find((x) => x.id === id);
    if (!u) return null;
    // Enforce "cannot remove last admin" invariant inside the lock so the
    // count cannot change between check and write.
    if (u.role === "ADMIN" && role !== "ADMIN") {
      const remainingAdmins = users.filter((x) => x.role === "ADMIN" && x.status === "active" && x.id !== id).length;
      if (remainingAdmins === 0) throw new Error("last_admin");
    }
    u.role = role;
    await writeAll(users);
    return u;
  });
}

export async function updateModules(id: string, modules: string[]): Promise<User | null> {
  return withLock(async () => {
    const users = await readAll();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx].modules = modules;
    await writeAll(users);
    return users[idx];
  });
}

export async function updatePlan(id: string, plan: UserPlan): Promise<User | null> {
  return withLock(async () => {
    const users = await readAll();
    const u = users.find((x) => x.id === id);
    if (!u) return null;
    u.plan = plan;
    await writeAll(users);
    return u;
  });
}

/** Admin-forced password reset: sets a new hashed password + mustReset=true so the user
 * must change it on next login. Uses PBKDF2-SHA256 identical to the rest of the store. */
export async function adminResetPassword(
  id: string,
  tempPassword: string
): Promise<User | null> {
  return withLock(async () => {
    const users = await readAll();
    const u = users.find((x) => x.id === id);
    if (!u) return null;
    const salt = randomSalt();
    u.salt = salt;
    u.passwordHash = await pbkdf2(tempPassword, salt);
    u.mustReset = true; // Force change on next login
    u.status = "active";  // Reactivate in case they were deactivated
    await writeAll(users);
    return u;
  });
}

export async function setStatus(id: string, status: UserStatus): Promise<User | null> {
  return withLock(async () => {
    const users = await readAll();
    const u = users.find((x) => x.id === id);
    if (!u) return null;
    if (u.role === "ADMIN" && u.status === "active" && status !== "active") {
      const remainingAdmins = users.filter((x) => x.role === "ADMIN" && x.status === "active" && x.id !== id).length;
      if (remainingAdmins === 0) throw new Error("last_admin");
    }
    u.status = status;
    await writeAll(users);
    return u;
  });
}

// Self-service registration — creates a VIEWER account with a password.
// No admin required. Returns the new user or throws "email_exists".
export async function registerUser(input: {
  email: string;
  name:  string;
  password: string;
}): Promise<User> {
  await ensureSeed();
  return withLock(async () => {
    const email = input.email.trim().toLowerCase();
    const users = await readAll();
    const existing = users.find((u) => u.email === email);
    
    if (existing) {
      if (existing.status === "invite") {
        // Complete the invitation process
        const salt = randomSalt();
        existing.salt = salt;
        existing.passwordHash = await pbkdf2(input.password, salt);
        existing.status = "active";
        if (input.name.trim()) existing.name = input.name.trim();
        await writeAll(users);
        return existing;
      }
      throw new Error("email_exists");
    }
    
    const salt         = randomSalt();
    const passwordHash = await pbkdf2(input.password, salt);
    const now          = new Date().toISOString();
    const user: User   = {
      id:           randomId(),
      email,
      name:         input.name.trim(),
      role:         "VIEWER",
      plan:         "free",
      tenantId:     "tricognita-global",
      status:       "active",
      salt,
      passwordHash,
      mfaSecret:    null,
      mfaEnabled:   false,
      lastLoginAt:  null,
      createdAt:    now,
      mustReset:    false, // Just set their own password during registration
    };
    users.push(user);
    await writeAll(users);
    return user;
  });
}

// Force-update a user's password by email. Used by the bootstrap reset endpoint.
// Does NOT require the user to be seeded first.
export async function forceUpdatePassword(email: string, newPassword: string): Promise<boolean> {
  return withLock(async () => {
    const users = await readAll();
    const u = users.find((x) => x.email === email.trim().toLowerCase());
    if (!u) {
      // User doesn't exist yet — seed them now as admin
      const salt = randomSalt();
      const passwordHash = await pbkdf2(newPassword, salt);
      const now = new Date().toISOString();
      users.push({
        id: randomId(),
        email: email.trim().toLowerCase(),
        name: process.env.DEMO_ADMIN_NAME ?? "Platform Admin",
        role: "ADMIN",
        plan: "enterprise" as UserPlan,
        tenantId: "tricognita-global",
        status: "active",
        salt,
        passwordHash,
        mfaSecret: null,
        mfaEnabled: false,
        lastLoginAt: null,
        createdAt: now,
        mustReset: false, // Reset completed via bootstrap
      });
      await writeAll(users);
      seeded = true;
      return true;
    }
    const salt = randomSalt();
    u.salt = salt;
    u.passwordHash = await pbkdf2(newPassword, salt);
    u.status = "active";
    u.mustReset = false; // Reset completed
    await writeAll(users);
    return true;
  });
}

// Self-service account deletion — removes a user record entirely.
// Callers must ensure the user is not the last admin before calling.
export async function deleteUser(id: string): Promise<boolean> {
  return withLock(async () => {
    const users = await readAll();
    const idx   = users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    const u = users[idx];
    // Block deletion of last active admin
    if (u.role === "ADMIN" && u.status === "active") {
      const remaining = users.filter(
        (x) => x.role === "ADMIN" && x.status === "active" && x.id !== id
      ).length;
      if (remaining === 0) throw new Error("last_admin");
    }
    users.splice(idx, 1);
    await writeAll(users);
    return true;
  });
}

// Self-service password change — verifies the current password then replaces it.
export async function changePassword(email: string, currentPw: string, nextPw: string): Promise<"ok" | "wrong_password" | "not_found"> {
  return withLock(async () => {
    const users = await readAll();
    const u = users.find((x) => x.email === email.toLowerCase());
    if (!u || !u.salt || !u.passwordHash) return "not_found";
    // Verify current
    const current = await pbkdf2(currentPw, u.salt);
    if (!constantTimeEqual(current, u.passwordHash)) return "wrong_password";
    // Hash new
    const salt         = randomSalt();
    const passwordHash = await pbkdf2(nextPw, salt);
    u.salt         = salt;
    u.passwordHash = passwordHash;
    u.mustReset = false; // Reset completed
    await writeAll(users);
    return "ok";
  });
}

/**
 * resetUserPassword: Forcefully updates a user's password without checking the old one.
 * Used during the mandatory bootstrap reset flow where the user has a valid session.
 */
export async function resetUserPassword(email: string, nextPw: string): Promise<boolean> {
  return withLock(async () => {
    const users = await readAll();
    const u = users.find((x) => x.email === email.toLowerCase());
    if (!u) return false;

    const salt = randomSalt();
    const passwordHash = await pbkdf2(nextPw, salt);
    
    u.salt = salt;
    u.passwordHash = passwordHash;
    u.mustReset = false; // rotation verified
    
    await writeAll(users);
    return true;
  });
}


export async function enableMFA(email: string, secret: string): Promise<boolean> {
  return withLock(async () => {
    const users = await readAll();
    const u = users.find((x) => x.email === email.toLowerCase());
    if (!u) return false;
    u.mfaSecret = secret;
    u.mfaEnabled = true;
    await writeAll(users);
    return true;
  });
}

export async function disableMFA(email: string): Promise<boolean> {
  return withLock(async () => {
    const users = await readAll();
    const u = users.find((x) => x.email === email.toLowerCase());
    if (!u) return false;
    u.mfaSecret = null;
    u.mfaEnabled = false;
    await writeAll(users);
    return true;
  });
}

export function sanitize(u: User) {
  // Never leak password material or MFA secret to clients.
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    plan: (u.plan ?? "free") as UserPlan,
    tenantId: u.tenantId || "tricognita-global",
    status: u.status,
    mfaEnabled: u.mfaEnabled,
    mustReset: u.mustReset,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    modules: u.modules,   // dynamic RBAC module access
  };
}
export type PublicUser = ReturnType<typeof sanitize>;
