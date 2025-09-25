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
    files: v.optional(v.array(v.id("files"))),
  }).index("by_due_date", ["dueDate"]),
  
  files: defineTable({
    name: v.string(),
    type: v.string(), // MIME type
    size: v.number(),
    url: v.string(), // R2 URL
    storageId: v.string(), // R2 storage ID
    uploadedAt: v.number(),
  }),


  timetables: defineTable({
    day_time: v.array(v.string()),
    timetable: v.array(
      v.array(
        v.object({
          period: v.number(),
          subject: v.string(),
          teacher: v.string(),
          replaced: v.boolean(),
          original: v.union(
            v.null(),
            v.object({
              period: v.number(),
              subject: v.string(),
              teacher: v.string(),
            })
          ),
        })
      )
    ),
    update_date: v.string(),
    week: v.number(),
    editedAt: v.number(),
  }),
  
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
