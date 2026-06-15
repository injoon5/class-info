import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Resolve a school from its subdomain slug (used by the frontend layout loader).
export const getBySubdomain = query({
  args: { subdomain: v.string() },
  handler: async (ctx, { subdomain }) => {
    return await ctx.db
      .query("schools")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", subdomain.toLowerCase()))
      .first();
  },
});

export const getByCode = internalQuery({
  args: { schoolCode: v.string() },
  handler: async (ctx, { schoolCode }) => {
    return await ctx.db
      .query("schools")
      .withIndex("by_code", (q) => q.eq("schoolCode", schoolCode))
      .first();
  },
});

export const getBySubdomainInternal = internalQuery({
  args: { subdomain: v.string() },
  handler: async (ctx, { subdomain }) => {
    return await ctx.db
      .query("schools")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", subdomain.toLowerCase()))
      .first();
  },
});

// Cron / orchestrator helper: every registered school.
export const listAllSchools = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("schools").collect();
  },
});

export const createSchool = internalMutation({
  args: { subdomain: v.string(), schoolCode: v.string(), schoolName: v.string() },
  handler: async (ctx, { subdomain, schoolCode, schoolName }): Promise<Id<"schools">> => {
    return await ctx.db.insert("schools", {
      subdomain: subdomain.toLowerCase(),
      schoolCode,
      schoolName,
      createdAt: Date.now(),
    });
  },
});
