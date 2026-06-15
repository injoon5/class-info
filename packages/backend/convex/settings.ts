import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

// ── Per-class admin PIN ────────────────────────────────────────────────────────

export const verifyPin = query({
  args: { classId: v.id("classes"), pin: v.string() },
  handler: async (ctx, { classId, pin }) => {
    const cls = await ctx.db.get(classId);
    const adminPin = cls?.pin || "1234"; // Default PIN
    return pin === adminPin;
  },
});

export const setClassPin = mutation({
  args: { classId: v.id("classes"), currentPin: v.string(), newPin: v.string() },
  handler: async (ctx, { classId, currentPin, newPin }) => {
    const cls = await ctx.db.get(classId);
    if (!cls) throw new Error("Class not found");
    const adminPin = cls.pin || "1234";
    if (currentPin !== adminPin) throw new Error("Invalid PIN");
    await ctx.db.patch(classId, { pin: newPin });
  },
});

// ── Global registration gate ───────────────────────────────────────────────────

const REGISTRATION_ENABLED_KEY = "registration_enabled";
const REGISTRATION_CODE_KEY = "registration_code";

async function getSetting(ctx: any, key: string): Promise<string | null> {
  const setting = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  return setting?.value ?? null;
}

async function putSetting(ctx: any, key: string, value: string): Promise<void> {
  const existing = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { value });
  } else {
    await ctx.db.insert("settings", { key, value });
  }
}

// Public: whether self-service registration is currently open (no code exposed).
export const isRegistrationEnabled = query({
  args: {},
  handler: async (ctx) => {
    const enabled = await getSetting(ctx, REGISTRATION_ENABLED_KEY);
    // Default to enabled when unset.
    return enabled === null ? true : enabled === "true";
  },
});

// Internal: read the configured signup code for validation in `register`.
export const getRegistrationConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const enabled = await getSetting(ctx, REGISTRATION_ENABLED_KEY);
    const code = await getSetting(ctx, REGISTRATION_CODE_KEY);
    return {
      enabled: enabled === null ? true : enabled === "true",
      code: code ?? "",
    };
  },
});

export const setRegistrationConfig = internalMutation({
  args: { enabled: v.boolean(), code: v.optional(v.string()) },
  handler: async (ctx, { enabled, code }) => {
    await putSetting(ctx, REGISTRATION_ENABLED_KEY, enabled ? "true" : "false");
    if (code !== undefined) {
      await putSetting(ctx, REGISTRATION_CODE_KEY, code);
    }
  },
});
