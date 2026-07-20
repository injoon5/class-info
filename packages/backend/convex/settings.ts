import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

const DEFAULT_PIN = "1234";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Brute-force throttle: after MAX_FAILS failed attempts within the window, the
// login endpoint locks out for LOCKOUT_MS. Stored as a JSON blob in `settings`.
const THROTTLE_KEY = "login_throttle";
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

type ThrottleState = { fails: number; windowStart: number; lockedUntil: number };

function generateToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

export const getPin = internalQuery({
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "admin_pin"))
      .first();
    return setting?.value || DEFAULT_PIN;
  },
});

export const setPin = internalMutation({
  args: { newPin: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "admin_pin"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.newPin });
    } else {
      await ctx.db.insert("settings", {
        key: "admin_pin",
        value: args.newPin,
      });
    }
  },
});

async function readSetting(ctx: any, key: string) {
  return await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
}

async function writeSetting(ctx: any, key: string, value: string) {
  const existing = await readSetting(ctx, key);
  if (existing) {
    await ctx.db.patch(existing._id, { value });
  } else {
    await ctx.db.insert("settings", { key, value });
  }
}

/**
 * Verify the admin PIN and, on success, issue a session token.
 *
 * Rate-limited to blunt brute-force against the 4-digit PIN. Returns
 * `{ ok: false }` on wrong PIN or while locked out (indistinguishable on
 * purpose), and never echoes the PIN back.
 */
export const login = mutation({
  args: { pin: v.string() },
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

    const pinRow = await readSetting(ctx, "admin_pin");
    const adminPin = pinRow?.value || DEFAULT_PIN;

    if (pin !== adminPin) {
      // Reset the counting window if it has elapsed.
      if (now - throttle.windowStart > WINDOW_MS) {
        throttle = { fails: 0, windowStart: now, lockedUntil: 0 };
      }
      throttle.fails += 1;
      if (throttle.fails >= MAX_FAILS) {
        throttle.lockedUntil = now + LOCKOUT_MS;
        throttle.fails = 0;
        throttle.windowStart = now;
      }
      await writeSetting(ctx, THROTTLE_KEY, JSON.stringify(throttle));
      return { ok: false as const };
    }

    // Success — clear the throttle and mint a token.
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

export const verifySession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return false;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    return Boolean(session && session.expiresAt > Date.now());
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (session) await ctx.db.delete(session._id);
  },
});
