import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  ADMIN_SESSION_TTL_MS as SESSION_TTL_MS,
  DEFAULT_ADMIN_PIN as DEFAULT_PIN,
  LOGIN_LOCKOUT_MS as LOCKOUT_MS,
  LOGIN_MAX_FAILS as MAX_FAILS,
  LOGIN_WINDOW_MS as WINDOW_MS,
} from "./config";

// Brute-force throttle: after MAX_FAILS failed attempts within the window, the
// login endpoint locks out for LOCKOUT_MS. Stored as a JSON blob in `settings`.
const THROTTLE_KEY = "login_throttle";
const PIN_RE = /^\d{4,8}$/;
const PBKDF2_ITERS = 100_000;
const PBKDF2_PREFIX = "pbkdf2$";

type ThrottleState = { fails: number; windowStart: number; lockedUntil: number };

function generateToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i]! ^ b[i]!;
  return out === 0;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function pbkdf2(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(salt), iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(pin, salt, PBKDF2_ITERS);
  return `${PBKDF2_PREFIX}${PBKDF2_ITERS}$${bytesToB64(salt)}$${bytesToB64(hash)}`;
}

async function verifyHashedPin(stored: string, pin: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) {
    return false;
  }
  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = b64ToBytes(parts[2] ?? "");
    expected = b64ToBytes(parts[3] ?? "");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const hash = await pbkdf2(pin, salt, iterations);
  return timingSafeEqualBytes(hash, expected);
}

async function verifyPin(stored: string, pin: string): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (stored.startsWith(PBKDF2_PREFIX)) {
    return { ok: await verifyHashedPin(stored, pin), needsRehash: false };
  }
  const a = new TextEncoder().encode(stored);
  const b = new TextEncoder().encode(pin);
  if (a.length !== b.length) {
    // Still run a dummy compare so wrong-length guesses aren't a timing oracle.
    timingSafeEqualBytes(a, a);
    return { ok: false, needsRehash: false };
  }
  return { ok: timingSafeEqualBytes(a, b), needsRehash: true };
}

type SettingsCtx = QueryCtx | MutationCtx;

async function readSetting(ctx: SettingsCtx, key: string): Promise<Doc<"settings"> | null> {
  return await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
}

async function writeSetting(ctx: MutationCtx, key: string, value: string): Promise<void> {
  const existing = await readSetting(ctx, key);
  if (existing) {
    await ctx.db.patch(existing._id, { value });
  } else {
    await ctx.db.insert("settings", { key, value });
  }
}

function nextFailure(throttle: ThrottleState, now: number): ThrottleState {
  const next =
    now - throttle.windowStart > WINDOW_MS
      ? { fails: 0, windowStart: now, lockedUntil: 0 }
      : { ...throttle };
  next.fails += 1;
  if (next.fails >= MAX_FAILS) {
    next.lockedUntil = now + LOCKOUT_MS;
    next.fails = 0;
    next.windowStart = now;
  }
  return next;
}

async function recordFailure(ctx: MutationCtx, throttle: ThrottleState, now: number): Promise<void> {
  await writeSetting(ctx, THROTTLE_KEY, JSON.stringify(nextFailure(throttle, now)));
}

export const setPin = internalMutation({
  args: { newPin: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!PIN_RE.test(args.newPin)) {
      throw new Error("PIN must be 4–8 digits");
    }
    await writeSetting(ctx, "admin_pin", await hashPin(args.newPin));
    return null;
  },
});

/**
 * Verify the admin PIN and, on success, issue a session token.
 *
 * Rate-limited to blunt brute-force against the 4-digit PIN. Returns
 * `{ ok: false }` on wrong PIN or while locked out (indistinguishable on
 * purpose), and never echoes the PIN back.
 */
export const login = mutation({
  args: { pin: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true), token: v.string(), expiresAt: v.number() }),
    v.object({ ok: v.literal(false) })
  ),
  handler: async (ctx, { pin }) => {
    const now = Date.now();

    const throttleRow = await readSetting(ctx, THROTTLE_KEY);
    let throttle: ThrottleState = { fails: 0, windowStart: now, lockedUntil: 0 };
    if (throttleRow?.value) {
      try {
        throttle = JSON.parse(throttleRow.value) as ThrottleState;
      } catch {
        /* corrupt row — reset below */
      }
    }

    if (throttle.lockedUntil > now) {
      return { ok: false as const };
    }

    // Reject malformed PINs as a failed attempt so an attacker can't probe
    // the hasher with arbitrary-length strings for free.
    if (!PIN_RE.test(pin)) {
      await recordFailure(ctx, throttle, now);
      return { ok: false as const };
    }

    const pinRow = await readSetting(ctx, "admin_pin");
    const storedPin = pinRow?.value || DEFAULT_PIN;
    if (!pinRow?.value) {
      console.warn("[settings.login] admin_pin is unset; using the default PIN. Set one via settings.setPin.");
    }

    const { ok, needsRehash } = await verifyPin(storedPin, pin);
    if (!ok) {
      await recordFailure(ctx, throttle, now);
      return { ok: false as const };
    }

    if (needsRehash || !pinRow?.value) {
      await writeSetting(ctx, "admin_pin", await hashPin(pin));
    }

    if (throttleRow) {
      await writeSetting(
        ctx,
        THROTTLE_KEY,
        JSON.stringify({ fails: 0, windowStart: now, lockedUntil: 0 })
      );
    }

    const token = generateToken();
    const expiresAt = now + SESSION_TTL_MS;
    await ctx.db.insert("sessions", { token, createdAt: now, expiresAt });
    return { ok: true as const, token, expiresAt };
  },
});

export const verifySession = mutation({
  args: { token: v.string() },
  returns: v.boolean(),
  // Mutation on purpose: a query that calls Date.now() can keep returning
  // a cached `true` after expiresAt. Mutations always re-run.
  handler: async (ctx, { token }) => {
    if (!token) return false;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!session) return false;
    if (session.expiresAt <= Date.now()) {
      await ctx.db.delete(session._id);
      return false;
    }
    return true;
  },
});

export const logout = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (session) await ctx.db.delete(session._id);
    return null;
  },
});

export const purgeExpiredSessions = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("sessions")
      .withIndex("by_expires_at", (q) => q.lte("expiresAt", now))
      .take(256);
    for (const session of expired) {
      await ctx.db.delete(session._id);
    }
    return { deleted: expired.length };
  },
});
