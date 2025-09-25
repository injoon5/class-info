import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

export const getPin = internalQuery({
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "admin_pin"))
      .first();
    return setting?.value || "1234"; // Default PIN
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

export const verifyPin = query({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "admin_pin"))
      .first();
    const adminPin = setting?.value || "1234";
    return args.pin === adminPin;
  },
});