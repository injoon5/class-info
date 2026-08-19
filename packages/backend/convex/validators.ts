import { v, type Infer } from "convex/values";

export const noticeType = v.union(
  v.literal("수행평가"),
  v.literal("숙제"),
  v.literal("준비물"),
  v.literal("기타")
);

export const isoDate = v.string();
export const yyyymmdd = v.string();

export const minimalNotice = v.object({
  _id: v.id("notices"),
  title: v.string(),
  subject: v.string(),
  type: noticeType,
  dueDate: v.string(),
  updatedAt: v.optional(v.number()),
  createdAt: v.optional(v.number()),
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
  monthKey: v.string(),
  monthName: v.string(),
  total: v.number(),
});

export const noticeClockArgs = {
  cutoff: isoDate,
  today: isoDate,
};

export const timetableSlot = v.object({
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
});

export const timetableDoc = v.object({
  _id: v.id("timetables"),
  _creationTime: v.number(),
  day_time: v.array(v.string()),
  timetable: v.array(v.array(timetableSlot)),
  update_date: v.string(),
  week: v.number(),
  editedAt: v.number(),
});

export const publicMeal = v.object({
  date: v.string(),
  mealType: v.string(),
  dishes: v.array(v.string()),
  originInfo: v.string(),
  calories: v.union(v.string(), v.null()),
  nutrients: v.union(v.string(), v.null()),
});

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

export const customEventColor = v.union(
  v.literal("blue"),
  v.literal("green"),
  v.literal("purple"),
  v.literal("orange"),
  v.literal("pink"),
  v.literal("teal")
);

export const publicEvent = v.object({
  _id: v.id("schedules"),
  date: v.string(),
  title: v.string(),
  source: v.union(v.literal("school"), v.literal("custom")),
  eventType: v.optional(v.string()),
  color: v.optional(customEventColor),
});

export const fileDoc = v.object({
  _id: v.id("files"),
  _creationTime: v.number(),
  name: v.string(),
  type: v.string(),
  size: v.number(),
  url: v.string(),
  storageId: v.string(),
  uploadedAt: v.number(),
});

export const noticeDoc = v.object({
  _id: v.id("notices"),
  _creationTime: v.number(),
  title: v.string(),
  subject: v.string(),
  type: noticeType,
  description: v.string(),
  dueDate: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  files: v.optional(v.array(v.id("files"))),
  slug: v.optional(v.string()),
});

export type MinimalNotice = Infer<typeof minimalNotice>;
export type DayGroup = Infer<typeof dayGroup>;
export type MonthSummary = Infer<typeof monthSummary>;
export type PublicMeal = Infer<typeof publicMeal>;
export type MealDay = Infer<typeof mealDay>;
export type PublicEvent = Infer<typeof publicEvent>;
