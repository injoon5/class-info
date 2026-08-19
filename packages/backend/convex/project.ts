import type { Doc } from "./_generated/dataModel";
import type { Infer } from "convex/values";
import { mealDoc, scheduleDoc, timetableDoc } from "./validators";

// `returns` validators reject extra fields and missing required ones.
// Production docs predate some schema fields (and a reverted tenant branch
// may have left extras), so always project to the declared shape.

function n(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function projectMeal(m: Doc<"meals">): Infer<typeof mealDoc> {
  return {
    _id: m._id,
    _creationTime: m._creationTime,
    date: m.date,
    mealType: m.mealType,
    dishes: Array.isArray(m.dishes) ? m.dishes.filter((d) => typeof d === "string") : [],
    originInfo: str(m.originInfo),
    calories: typeof m.calories === "string" ? m.calories : null,
    nutrients: typeof m.nutrients === "string" ? m.nutrients : null,
    schoolCode: str(m.schoolCode),
    schoolName: str(m.schoolName),
    loadedAt: str(m.loadedAt),
    editedAt: n(m.editedAt, m._creationTime),
  };
}

export function projectSchedule(e: Doc<"schedules">): Infer<typeof scheduleDoc> | null {
  if (e.source !== "school" && e.source !== "custom") return null;
  return {
    _id: e._id,
    _creationTime: e._creationTime,
    date: e.date,
    title: str(e.title),
    source: e.source,
    eventType: typeof e.eventType === "string" ? e.eventType : undefined,
    schoolCode: typeof e.schoolCode === "string" ? e.schoolCode : undefined,
    color: typeof e.color === "string" ? e.color : undefined,
    createdAt: n(e.createdAt, e._creationTime),
    updatedAt: n(e.updatedAt, e._creationTime),
  };
}

export function projectTimetable(t: Doc<"timetables">): Infer<typeof timetableDoc> {
  return {
    _id: t._id,
    _creationTime: t._creationTime,
    day_time: Array.isArray(t.day_time) ? t.day_time : [],
    timetable: t.timetable,
    update_date: str(t.update_date),
    week: n(t.week, 0),
    editedAt: n(t.editedAt, t._creationTime),
  };
}
