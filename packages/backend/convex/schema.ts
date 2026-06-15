import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  schools: defineTable({
    subdomain: v.string(), // unique slug used as the host subdomain
    schoolCode: v.string(), // NEIS school code
    schoolName: v.string(),
    createdAt: v.number(),
  })
    .index("by_subdomain", ["subdomain"])
    .index("by_code", ["schoolCode"]),

  classes: defineTable({
    schoolId: v.id("schools"),
    grade: v.number(),
    classNo: v.number(),
    pin: v.string(), // admin PIN for this class
    createdAt: v.number(),
  })
    .index("by_school", ["schoolId"])
    .index("by_school_grade_class", ["schoolId", "grade", "classNo"]),

  notices: defineTable({
    classId: v.id("classes"),
    title: v.string(),
    subject: v.string(),
    type: v.union(v.literal("수행평가"), v.literal("숙제"), v.literal("준비물"), v.literal("기타")),
    description: v.string(),
    dueDate: v.string(), // ISO date string
    createdAt: v.number(),
    updatedAt: v.number(),
    files: v.optional(v.array(v.id("files"))),
    slug: v.optional(v.string()),
  })
    .index("by_class_due_date", ["classId", "dueDate"])
    .index("by_class_slug", ["classId", "slug"]),

  files: defineTable({
    classId: v.id("classes"),
    name: v.string(),
    type: v.string(), // MIME type
    size: v.number(),
    url: v.string(), // R2 URL
    storageId: v.string(), // R2 storage ID
    uploadedAt: v.number(),
  }),


  timetables: defineTable({
    classId: v.id("classes"),
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
  }).index("by_class_week", ["classId", "week"]),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  meals: defineTable({
    schoolId: v.id("schools"),
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
    .index("by_school_date", ["schoolId", "date"]) // query by day/week
    .index("by_school_date_type", ["schoolId", "date", "mealType"]),

  schedules: defineTable({
    schoolId: v.id("schools"),
    date: v.string(), // YYYYMMDD
    title: v.string(),
    source: v.union(v.literal("school"), v.literal("custom")),
    eventType: v.optional(v.string()), // SBTR_DD_SC_NM — school only
    schoolCode: v.optional(v.string()), // school only
    color: v.optional(v.string()), // "blue"|"green"|"purple"|"orange"|"pink"|"teal" — custom only
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_school_date", ["schoolId", "date"]),
});
