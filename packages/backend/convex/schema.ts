import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  eventSource,
  fileFields,
  fullTimetableFields,
  noticeFields,
  timetableFields,
} from "./validators";

export default defineSchema({
  notices: defineTable(noticeFields).index("by_due_date", ["dueDate"]).index("by_slug", ["slug"]),

  files: defineTable(fileFields).index("by_storage_id", ["storageId"]),

  timetables: defineTable(timetableFields).index("by_week_start", ["weekStart"]),

  // One row, snapshotted from a fetched week and corrected by hand.
  fullTimetable: defineTable(fullTimetableFields),

  // Key/value rows: the admin PIN hash and the login throttle.
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  // Admin bearer tokens issued after a successful PIN login.
  sessions: defineTable({
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_expires_at", ["expiresAt"]),

  meals: defineTable({
    date: v.string(), // YYYYMMDD
    mealType: v.string(), // "중식" | "석식" as the feed names them
    dishes: v.array(v.string()), // as the feed sends them; cleaned on read
    originInfo: v.string(),
    calories: v.union(v.string(), v.null()),
    nutrients: v.union(v.string(), v.null()),
    schoolCode: v.string(),
    schoolName: v.string(),
    loadedAt: v.string(),
    editedAt: v.number(),
  }).index("by_date_type", ["date", "mealType"]),

  schedules: defineTable({
    date: v.string(), // YYYYMMDD
    title: v.string(),
    source: eventSource,
    eventType: v.optional(v.string()), // school only
    schoolCode: v.optional(v.string()), // school only
    // Custom only; a CustomEventColor, narrowed on read.
    color: v.optional(v.string()),
    // Home page countdown. School rows are re-inserted on every sync, so the
    // flag is carried over by (date, title); see schedule.replaceSchoolEvents.
    dday: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    // D-days can be months out, past the home page's day scan.
    .index("by_dday_date", ["dday", "date"]),
});
