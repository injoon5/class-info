import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getCustomEventsByYear = query({
  args: { year: v.string() },
  handler: async (ctx, { year }) => {
    return await ctx.db
      .query("customScheduleEvents")
      .withIndex("by_date", (q) =>
        q.gte("date", `${year}0101`).lte("date", `${year}1231`)
      )
      .collect();
  },
});

export const createCustomEvent = mutation({
  args: {
    date: v.string(),
    title: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("customScheduleEvents", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteCustomEvent = mutation({
  args: { id: v.id("customScheduleEvents") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
