import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notices: defineTable({
    title: v.string(),
    subject: v.string(),
    type: v.union(v.literal("수행평가"), v.literal("숙제"), v.literal("준비물"), v.literal("기타")),
    description: v.string(),
    dueDate: v.string(), // ISO date string
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_due_date", ["dueDate"]),
  
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
