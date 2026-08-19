import type { Doc } from "./_generated/dataModel";
import type { Infer } from "convex/values";
import { publicEvent, publicMeal, timetableDoc, timetableSlot } from "./validators";

// Never return raw DB documents from public queries. `returns` validators
// reject extra fields, missing required fields, and `undefined` values.
// Production rows predate some schema fields.

function n(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function textOrNull(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function projectMeal(m: Doc<"meals">): Infer<typeof publicMeal> | null {
  const date = str(m.date);
  const mealType = str(m.mealType);
  if (!date || !mealType) return null;
  return {
    date,
    mealType,
    dishes: Array.isArray(m.dishes) ? m.dishes.filter((d) => typeof d === "string") : [],
    originInfo: str(m.originInfo),
    calories: textOrNull(m.calories),
    nutrients: textOrNull(m.nutrients),
  };
}

export function projectSchedule(e: Doc<"schedules">): Infer<typeof publicEvent> | null {
  if (e.source !== "school" && e.source !== "custom") return null;
  const date = str(e.date);
  const title = str(e.title);
  if (!date || !title) return null;
  const out: Infer<typeof publicEvent> = {
    _id: e._id,
    date,
    title,
    source: e.source,
  };
  // Optional keys must be omitted, not set to undefined — undefined is not a Convex value.
  if (typeof e.eventType === "string") out.eventType = e.eventType;
  if (typeof e.color === "string") out.color = e.color;
  return out;
}

function projectSlot(slot: Doc<"timetables">["timetable"][number][number]): Infer<typeof timetableSlot> {
  const original = slot.original;
  return {
    period: n(slot.period, 0),
    subject: str(slot.subject),
    teacher: str(slot.teacher),
    replaced: Boolean(slot.replaced),
    original:
      original && typeof original === "object"
        ? {
            period: n(original.period, 0),
            subject: str(original.subject),
            teacher: str(original.teacher),
          }
        : null,
  };
}

export function projectTimetable(t: Doc<"timetables">): Infer<typeof timetableDoc> {
  return {
    _id: t._id,
    _creationTime: t._creationTime,
    day_time: Array.isArray(t.day_time) ? t.day_time.filter((s) => typeof s === "string") : [],
    timetable: Array.isArray(t.timetable)
      ? t.timetable.map((row) => (Array.isArray(row) ? row.map(projectSlot) : []))
      : [],
    update_date: str(t.update_date),
    week: n(t.week, 0),
    editedAt: n(t.editedAt, t._creationTime),
  };
}
