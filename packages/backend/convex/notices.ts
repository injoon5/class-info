import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    try {
      const notices = await ctx.db.query("notices").collect();
      
      // Filter out any corrupted notices and sort safely
      const validNotices = notices.filter(notice => 
        notice.title && 
        notice.subject && 
        notice.type && 
        notice.dueDate &&
        typeof notice.description === 'string'
      );
      
      return validNotices.sort((a, b) => {
        try {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } catch (e) {
          return 0; // If date parsing fails, maintain order
        }
      });
    } catch (error) {
      console.error("Error fetching notices:", error);
      return []; // Return empty array on error
    }
  },
});

export const getById = query({
  args: { id: v.id("notices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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
    const now = Date.now();
    const noticeId = await ctx.db.insert("notices", {
      ...args,
      createdAt: now,
      updatedAt: now,
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
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("notices") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});