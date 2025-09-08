import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    const notices = await ctx.db.query("notices").order("asc").collect();
    return notices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    subject: v.string(),
    type: v.union(v.literal("수행평가"), v.literal("숙제"), v.literal("준비물"), v.literal("기타")),
    description: v.string(),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    const noticeId = await ctx.db.insert("notices", {
      ...args,
      createdAt: Date.now(),
    });
    return noticeId;
  },
});

export const update = mutation({
  args: {
    id: v.id("notices"),
    title: v.string(),
    subject: v.string(),
    type: v.union(v.literal("수행평가"), v.literal("숙제"), v.literal("준비물"), v.literal("기타")),
    description: v.string(),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("notices") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});