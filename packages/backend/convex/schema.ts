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
  }).index("by_storage_id", ["storageId"]),


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
  }).index("by_week", ["week"]),

  // The standing weekly timetable, independent of the substitutions the
  // upstream feed carries. A single row: an admin snapshots a fetched week
  // into it, then corrects it by hand. Days are Mon–Fri; each day's length is
  // its own, because Friday is routinely shorter than Monday.
  fullTimetable: defineTable({
    day_time: v.array(v.string()),
    timetable: v.array(
      v.array(
        v.object({
          subject: v.string(),
          teacher: v.string(),
        })
      )
    ),
    updatedAt: v.number(),
  }),

  
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  // Admin auth sessions — bearer tokens issued after a successful PIN login.
  sessions: defineTable({
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_expires_at", ["expiresAt"]),
  
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
    // by_date_type also serves date-only range queries via its "date" prefix,
    // so a separate by_date index would be redundant write overhead.
    .index("by_date_type", ["date", "mealType"]),

  schedules: defineTable({
    date: v.string(), // YYYYMMDD
    title: v.string(),
    source: v.union(v.literal("school"), v.literal("custom")),
    eventType: v.optional(v.string()), // SBTR_DD_SC_NM — school only
    schoolCode: v.optional(v.string()), // school only
    color: v.optional(v.string()), // "blue"|"green"|"purple"|"orange"|"pink"|"teal" — custom only
    // Counted down to on the home page. Set on either source; school rows are
    // wiped and re-inserted on every sync, so the flag is carried across by
    // (date, title) — see schedule.upsertManySchoolEvents.
    dday: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"]),
});
