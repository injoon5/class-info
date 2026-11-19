// The contract between the database, the Convex functions and the web app:
// table fields, public shapes, and the limits both sides check against.
// Defines no Convex functions, so the web app imports it at runtime.

import { v, type Infer } from "convex/values";

// ── Admin ────────────────────────────────────────────────────────────────

// Sent as a ConvexError: production redacts plain Error messages, and the
// admin UI must tell an expired session apart from any other failure.
export const UNAUTHORIZED = "Unauthorized";
export const PIN_PATTERN = /^\d{4,8}$/;
export const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// ── Clock ────────────────────────────────────────────────────────────────

// The client's school-zone clock, as every date-dependent query takes it.
export const schoolClockArgs = {
  today: v.string(), // YYYYMMDD
  afterRollover: v.boolean(),
};

// ── Notices ──────────────────────────────────────────────────────────────

export const noticeType = v.union(
  v.literal("수행평가"),
  v.literal("숙제"),
  v.literal("준비물"),
  v.literal("기타")
);
export const NOTICE_TYPES = noticeType.members.map((member) => member.value);

export const noticeFields = {
  title: v.string(),
  subject: v.string(),
  type: noticeType,
  description: v.string(),
  dueDate: v.string(), // YYYY-MM-DD, as <input type="date"> gives it
  createdAt: v.number(),
  updatedAt: v.number(),
  files: v.optional(v.array(v.id("files"))),
  slug: v.optional(v.string()),
};

export const noticeDoc = v.object({
  _id: v.id("notices"),
  _creationTime: v.number(),
  ...noticeFields,
});

export const minimalNotice = v.object({
  _id: v.id("notices"),
  title: v.string(),
  subject: v.string(),
  type: noticeType,
  dueDate: v.string(),
  updatedAt: v.number(),
  hasFiles: v.boolean(),
  summary: v.string(),
  slug: v.optional(v.string()),
});

export const dayGroup = v.object({
  date: v.string(),
  displayDate: v.string(),
  isToday: v.boolean(),
  notices: v.array(minimalNotice),
});

export const monthSummary = v.object({
  monthKey: v.string(), // YYYY-MM
  monthName: v.string(),
  total: v.number(),
});

// ── Files ────────────────────────────────────────────────────────────────

export const MAX_ATTACHMENTS = 16;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = "image/*,application/pdf"; // for <input accept>

export function isAttachmentType(mime: string): boolean {
  return mime.startsWith("image/") || mime === "application/pdf";
}

export const fileFields = {
  name: v.string(),
  type: v.string(), // MIME type
  size: v.number(),
  // Older rows stored the public URL; it is derived from storageId now.
  url: v.optional(v.string()),
  storageId: v.string(), // R2 object key
  uploadedAt: v.number(),
};

export const publicFile = v.object({
  _id: v.id("files"),
  name: v.string(),
  type: v.string(),
  size: v.number(),
  url: v.string(),
});

// ── Timetables ───────────────────────────────────────────────────────────

const classSlot = { subject: v.string(), teacher: v.string() };

export const timetableSlot = v.object({
  period: v.number(),
  ...classSlot,
  replaced: v.boolean(),
  original: v.union(v.null(), v.object({ period: v.number(), ...classSlot })),
});

// One fetched week, as stored and as served. `weekStart` is its Monday.
export const timetableWeek = v.object({
  weekStart: v.string(), // YYYYMMDD
  day_time: v.array(v.string()),
  timetable: v.array(v.array(timetableSlot)),
  update_date: v.string(),
  editedAt: v.number(),
});

export const timetableFields = {
  ...timetableWeek.fields,
  // Old rows were keyed by `week`, the fetch-time offset, and some predate
  // `weekStart`; both stay in the schema only so those rows still validate.
  weekStart: v.optional(v.string()),
  week: v.optional(v.number()),
};

// The standing Mon–Fri timetable carries no substitutions: it *is* the
// baseline a substitution is measured against. Each day has its own length.
export const FULL_TIMETABLE_DAYS = 5;
export const MAX_PERIODS = 12;

export const fullTimetableSlot = v.object(classSlot);

export const fullTimetableFields = {
  day_time: v.array(v.string()),
  timetable: v.array(v.array(fullTimetableSlot)),
  updatedAt: v.number(),
};

export const fullTimetable = v.object(fullTimetableFields);

// ── Meals ────────────────────────────────────────────────────────────────

export const mealFields = {
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
};

// The two meals the app shows, by the feed's names for them.
export const LUNCH = "중식";
export const DINNER = "석식";
export const servedMealType = v.union(v.literal(LUNCH), v.literal(DINNER));

export const publicMeal = v
  .object(mealFields)
  .pick("date", "mealType", "dishes", "calories", "nutrients");

export const mealDay = v.object({
  date: v.string(),
  lunch: v.union(publicMeal, v.null()),
  dinner: v.union(publicMeal, v.null()),
});

export const mealWeek = v.object({
  startdate: v.string(),
  enddate: v.string(),
  days: v.array(mealDay),
});

// ── Schedule ─────────────────────────────────────────────────────────────

export const customEventColor = v.union(
  v.literal("blue"),
  v.literal("green"),
  v.literal("purple"),
  v.literal("orange"),
  v.literal("pink"),
  v.literal("teal")
);
export const CUSTOM_EVENT_COLORS = customEventColor.members.map((member) => member.value);

export function isCustomEventColor(color: unknown): color is CustomEventColor {
  return (CUSTOM_EVENT_COLORS as unknown[]).includes(color);
}

export const eventSource = v.union(v.literal("school"), v.literal("custom"));

export const publicEvent = v.object({
  _id: v.id("schedules"),
  date: v.string(),
  title: v.string(),
  source: eventSource,
  eventType: v.optional(v.string()),
  color: v.optional(customEventColor),
  dday: v.optional(v.boolean()),
});

export type NoticeType = Infer<typeof noticeType>;
export type MinimalNotice = Infer<typeof minimalNotice>;
export type DayGroup = Infer<typeof dayGroup>;
export type MonthSummary = Infer<typeof monthSummary>;
export type PublicFile = Infer<typeof publicFile>;
export type TimetableWeek = Infer<typeof timetableWeek>;
export type FullTimetable = Infer<typeof fullTimetable>;
export type PublicMeal = Infer<typeof publicMeal>;
export type ServedMealType = Infer<typeof servedMealType>;
export type MealDay = Infer<typeof mealDay>;
export type CustomEventColor = Infer<typeof customEventColor>;
export type PublicEvent = Infer<typeof publicEvent>;
