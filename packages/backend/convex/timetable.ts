import {
  internalAction,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./auth";
import { FULL_TIMETABLE_DAYS, projectFullTimetable, projectTimetable } from "./project";
import { fullTimetableDoc, timetableDoc, timetableSlot } from "./validators";

export const upsert = internalMutation({
  args: {
    week: v.number(),
    day_time: v.array(v.string()),
    timetable: v.array(v.array(timetableSlot)),
    update_date: v.string(),
  },
  returns: v.id("timetables"),
  handler: async (
    ctx,
    { week, day_time, timetable, update_date }
  ): Promise<Id<"timetables">> => {
    const existing = await ctx.db
      .query("timetables")
      .withIndex("by_week", (q) => q.eq("week", week))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { day_time, timetable, update_date, week, editedAt: now });
      console.log(`[timetable.upsert] updated week=${week}`);
      return existing._id;
    }

    const id = await ctx.db.insert("timetables", { day_time, timetable, update_date, week, editedAt: now });
    console.log(`[timetable.upsert] inserted week=${week}`);
    return id;
  },
});

export const fetchAndSave = internalAction({
  args: {
    grade: v.number(),
    classno: v.number(),
    week: v.number(),
    schoolcode: v.string(),
  },
  returns: v.id("timetables"),
  handler: async (
    ctx,
    { grade, classno, week, schoolcode }
  ): Promise<Id<"timetables">> => {
    const url = `https://api.timefor.school/timetable?grade=${encodeURIComponent(
      String(grade)
    )}&classno=${encodeURIComponent(String(classno))}&week=${encodeURIComponent(
      String(week)
    )}&schoolcode=${encodeURIComponent(schoolcode)}`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Failed to fetch timetable: ${res.status} ${res.statusText}`);
    }
    const data: {
      day_time: string[];
      timetable: Array<
        Array<{
          period: number;
          subject: string;
          teacher: string;
          replaced: boolean;
          original: null | { period: number; subject: string; teacher: string };
        }>
      >;
      update_date: string;
    } = await res.json();

    // Basic shape validation
    if (!Array.isArray(data.day_time) || !Array.isArray(data.timetable)) {
      throw new Error("Unexpected timetable payload shape");
    }

    console.log(`[timetable.fetchAndSave] grade=${grade} class=${classno} week=${week}`);
    const id = await ctx.runMutation(internal.timetable.upsert, {
      week,
      day_time: data.day_time,
      timetable: data.timetable,
      update_date: data.update_date,
    });
    return id;
  },
});

export const getByWeek = query({
  args: { week: v.union(v.literal(0), v.literal(1)) },
  returns: v.union(timetableDoc, v.null()),
  handler: async (ctx, { week }) => {
    const row = await ctx.db
      .query("timetables")
      .withIndex("by_week", (q) => q.eq("week", week))
      .first();
    return row ? projectTimetable(row) : null;
  },
});

// ── Standing ("전체") timetable ───────────────────────────────────────────────
// One row, edited by an admin. Kept apart from the fetched weeks: those are
// overwritten by the cron every few hours, and a hand-made correction there
// would not survive the next poll.

const FULL_MAX_PERIODS = 12;
const FULL_TEXT_MAX = 24;

type FullSlot = { subject: string; teacher: string };

function emptyDays(): FullSlot[][] {
  return Array.from({ length: FULL_TIMETABLE_DAYS }, () => []);
}

function cleanText(value: string): string {
  return value.trim().slice(0, FULL_TEXT_MAX);
}

function assertDay(day: number): void {
  if (!Number.isInteger(day) || day < 0 || day >= FULL_TIMETABLE_DAYS) {
    throw new Error("day must be 0–4 (Mon–Fri)");
  }
}

// Read-modify-write always goes through the projection, so a row written before
// a field existed is normalised on its way out and back in.
async function readFullDays(
  ctx: MutationCtx
): Promise<{ row: Doc<"fullTimetable"> | null; days: FullSlot[][] }> {
  const row = await ctx.db.query("fullTimetable").first();
  if (!row) return { row: null, days: emptyDays() };
  return { row, days: projectFullTimetable(row).timetable.map((day) => day.map((s) => ({ ...s }))) };
}

async function writeFullDays(
  ctx: MutationCtx,
  row: Doc<"fullTimetable"> | null,
  days: FullSlot[][],
  day_time?: string[]
): Promise<void> {
  const updatedAt = Date.now();
  if (row) {
    await ctx.db.patch(row._id, {
      timetable: days,
      updatedAt,
      ...(day_time ? { day_time } : {}),
    });
    return;
  }
  await ctx.db.insert("fullTimetable", { day_time: day_time ?? [], timetable: days, updatedAt });
}

export const getFull = query({
  args: {},
  returns: v.union(fullTimetableDoc, v.null()),
  handler: async (ctx) => {
    const row = await ctx.db.query("fullTimetable").first();
    return row ? projectFullTimetable(row) : null;
  },
});

// Seeds the standing timetable from a fetched week. A slot the feed marks as
// replaced is copied as the class it replaced — a one-off substitution is not
// part of the standing week.
export const snapshotFull = mutation({
  args: { sessionToken: v.string(), week: v.union(v.literal(0), v.literal(1)) },
  returns: v.null(),
  handler: async (ctx, { sessionToken, week }) => {
    await requireAdmin(ctx, sessionToken);
    const source = await ctx.db
      .query("timetables")
      .withIndex("by_week", (q) => q.eq("week", week))
      .first();
    if (!source) throw new Error("That week has no timetable to snapshot");

    const fetched = projectTimetable(source);
    const days = Array.from({ length: FULL_TIMETABLE_DAYS }, (_, i) =>
      (fetched.timetable[i] ?? []).slice(0, FULL_MAX_PERIODS).map((slot) => {
        const base = slot.original ?? slot;
        return { subject: cleanText(base.subject), teacher: cleanText(base.teacher) };
      })
    );

    const { row } = await readFullDays(ctx);
    await writeFullDays(ctx, row, days, fetched.day_time);
    console.log(`[timetable.snapshotFull] from week=${week}`);
    return null;
  },
});

export const setFullSlot = mutation({
  args: {
    sessionToken: v.string(),
    day: v.number(),
    period: v.number(),
    subject: v.string(),
    teacher: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { sessionToken, day, period, subject, teacher }) => {
    await requireAdmin(ctx, sessionToken);
    assertDay(day);
    if (!Number.isInteger(period) || period < 1 || period > FULL_MAX_PERIODS) {
      throw new Error(`period must be 1–${FULL_MAX_PERIODS}`);
    }
    const { row, days } = await readFullDays(ctx);
    const target = days[day]!;
    // Editing past the end of a short day extends it; the gap fills with blanks
    // rather than leaving holes the grid would have to reason about.
    while (target.length < period) target.push({ subject: "", teacher: "" });
    target[period - 1] = { subject: cleanText(subject), teacher: cleanText(teacher) };
    await writeFullDays(ctx, row, days);
    return null;
  },
});

export const setFullDayLength = mutation({
  args: { sessionToken: v.string(), day: v.number(), length: v.number() },
  returns: v.null(),
  handler: async (ctx, { sessionToken, day, length }) => {
    await requireAdmin(ctx, sessionToken);
    assertDay(day);
    if (!Number.isInteger(length) || length < 0 || length > FULL_MAX_PERIODS) {
      throw new Error(`length must be 0–${FULL_MAX_PERIODS}`);
    }
    const { row, days } = await readFullDays(ctx);
    const target = days[day]!;
    while (target.length < length) target.push({ subject: "", teacher: "" });
    days[day] = target.slice(0, length);
    await writeFullDays(ctx, row, days);
    return null;
  },
});
