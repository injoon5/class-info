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
    slug: v.optional(v.string()),
  }).index("by_due_date", ["dueDate"]).index("by_slug", ["slug"]),
  
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
  
  meals: defineTable({
    // YYYYMMDD string for the meal date (local KST date)
    date: v.string(),
    mealType: v.string(), // e.g., "중식"
    dishes: v.array(v.string()), // split by newline from DDISH_NM
    originInfo: v.string(), // raw ORPLC_INFO
    calories: v.union(v.string(), v.null()), // e.g., "685.4 Kcal"
    nutrients: v.union(v.string(), v.null()), // raw NTR_INFO text
    schoolCode: v.string(),
    schoolName: v.string(),
    loadedAt: v.string(), // LOAD_DTM from source (YYYYMMDD)
    editedAt: v.number(),
  })
    .index("by_date", ["date"]) // query by day/week
    .index("by_date_type", ["date", "mealType"]),
});
