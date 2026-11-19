import { internalAction, internalMutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ConvexError, v, type Infer } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { adminMutation } from "./auth";
import { SCHOOL } from "./config";
import { assertYmd, weekStartFor } from "./dates";
import { fetchSchoolApi, SchoolApiError } from "./schoolApi";
import {
  FULL_TIMETABLE_DAYS,
  MAX_PERIODS,
  fullTimetable,
  timetableSlot,
  timetableWeek,
  type FullTimetable,
  type TimetableWeek,
} from "./validators";

type Slot = Infer<typeof timetableSlot>;
type FullSlot = FullTimetable["timetable"][number][number];

// ── Fetched weeks ────────────────────────────────────────────────────────

// `auto` merges Comcigan (bell times, teachers, short names) with NEIS. It is
// the upstream default, but pinned so a change there can't reshape the grid.
const SOURCE = "auto";

// A NEIS-only week has the same keys with empty values; that is valid data.
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeSlot(raw: unknown): Slot | null {
  if (!raw || typeof raw !== "object") return null;
  const slot = raw as Record<string, unknown>;
  const period = num(slot.period);
  if (period <= 0) return null;
  const original = slot.original as Record<string, unknown> | null | undefined;
  return {
    period,
    subject: str(slot.subject),
    teacher: str(slot.teacher),
    replaced: slot.replaced === true,
    original:
      original && typeof original === "object"
        ? { period: num(original.period), subject: str(original.subject), teacher: str(original.teacher) }
        : null,
  };
}

function normalizeWeek(raw: unknown[]): Slot[][] {
  return raw.map((day) =>
    Array.isArray(day) ? day.map(normalizeSlot).filter((slot): slot is Slot => slot !== null) : []
  );
}

async function readWeek(ctx: QueryCtx, weekStart: string): Promise<Doc<"timetables"> | null> {
  return await ctx.db
    .query("timetables")
    .withIndex("by_week_start", (q) => q.eq("weekStart", weekStart))
    .first();
}

export const upsert = internalMutation({
  args: timetableWeek.omit("editedAt").fields,
  returns: v.null(),
  handler: async (ctx, week) => {
    const existing = await readWeek(ctx, week.weekStart);
    const row = { ...week, editedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("timetables", row);
    return null;
  },
});

// The API counts weeks from the current Mon–Sun week in the school's zone.
// Null when there is nothing to store (a break or an empty grid), keeping the
// stored week rather than blanking it.
export const fetchWeek = internalAction({
  args: { offsetWeeks: v.number() },
  returns: v.null(),
  handler: async (ctx, { offsetWeeks }): Promise<null> => {
    let data: { day_time?: unknown; timetable?: unknown; update_date?: unknown };
    try {
      data = (await fetchSchoolApi("timetable", {
        grade: SCHOOL.grade,
        classno: SCHOOL.classno,
        week: offsetWeeks,
        source: SOURCE,
      })) as typeof data;
    } catch (error) {
      // No rows from either source: a break, not a fault.
      if (error instanceof SchoolApiError && error.code === "NEIS_DATA_NOT_FOUND") return null;
      throw error;
    }

    if (!Array.isArray(data.day_time) || !Array.isArray(data.timetable)) {
      throw new Error("Unexpected timetable payload shape");
    }
    const timetable = normalizeWeek(data.timetable);
    if (timetable.every((day) => day.length === 0)) {
      console.warn(`[timetable.fetchWeek] empty grid for offset ${offsetWeeks}; keeping stored week`);
      return null;
    }

    await ctx.runMutation(internal.timetable.upsert, {
      weekStart: weekStartFor(offsetWeeks),
      day_time: data.day_time.filter((s): s is string => typeof s === "string"),
      timetable,
      update_date: str(data.update_date),
    });
    return null;
  },
});

export const getWeek = query({
  args: { weekStart: v.string() },
  returns: v.union(timetableWeek, v.null()),
  handler: async (ctx, { weekStart }): Promise<TimetableWeek | null> => {
    assertYmd(weekStart, "weekStart");
    const row = await readWeek(ctx, weekStart);
    if (!row) return null;
    const { day_time, timetable, update_date, editedAt } = row;
    return { weekStart, day_time, timetable, update_date, editedAt };
  },
});

// ── Standing ("전체") timetable ──────────────────────────────────────────
// One admin-edited row, kept apart from the fetched weeks the cron overwrites.

const TEXT_MAX = 24;

function blankSlot(): FullSlot {
  return { subject: "", teacher: "" };
}

function cleanText(value: string): string {
  return value.trim().slice(0, TEXT_MAX);
}

function padTo(day: FullSlot[], length: number): void {
  while (day.length < length) day.push(blankSlot());
}

function assertDay(day: number): void {
  if (!Number.isInteger(day) || day < 0 || day >= FULL_TIMETABLE_DAYS) {
    throw new Error("day must be 0–4 (Mon–Fri)");
  }
}

function assertPeriodCount(n: number, min: number, label: string): void {
  if (!Number.isInteger(n) || n < min || n > MAX_PERIODS) {
    throw new Error(`${label} must be ${min}–${MAX_PERIODS}`);
  }
}

// Always five days: the grid renders one column per day, and a row written
// before a day existed would otherwise render four.
function projectFull(row: Doc<"fullTimetable">): FullTimetable {
  return {
    day_time: row.day_time,
    timetable: Array.from({ length: FULL_TIMETABLE_DAYS }, (_, i) =>
      (row.timetable[i] ?? []).map(({ subject, teacher }) => ({ subject, teacher }))
    ),
    updatedAt: row.updatedAt,
  };
}

async function readFull(ctx: QueryCtx): Promise<Doc<"fullTimetable"> | null> {
  return await ctx.db.query("fullTimetable").first();
}

async function writeFull(
  ctx: MutationCtx,
  edit: (days: FullSlot[][]) => FullSlot[][],
  day_time?: string[]
): Promise<void> {
  const row = await readFull(ctx);
  const current = row ? projectFull(row) : null;
  const timetable = edit(
    current?.timetable ?? Array.from({ length: FULL_TIMETABLE_DAYS }, (): FullSlot[] => [])
  );
  const next = { timetable, day_time: day_time ?? current?.day_time ?? [], updatedAt: Date.now() };
  if (row) await ctx.db.patch(row._id, next);
  else await ctx.db.insert("fullTimetable", next);
}

export const getFull = query({
  args: {},
  returns: v.union(fullTimetable, v.null()),
  handler: async (ctx) => {
    const row = await readFull(ctx);
    return row ? projectFull(row) : null;
  },
});

// Seeds the standing timetable from a fetched week, taking a substituted
// slot's original class.
export const snapshotFull = adminMutation({
  args: { weekStart: v.string() },
  returns: v.null(),
  handler: async (ctx, { weekStart }) => {
    const source = await readWeek(ctx, weekStart);
    if (!source) throw new ConvexError("가져올 시간표가 없어요.");
    // Placed by 교시, not by position: the merged feed can skip a period on
    // one day, and copying positionally moved every later subject up a row.
    const days = Array.from({ length: FULL_TIMETABLE_DAYS }, (_, i) => {
      const day: FullSlot[] = [];
      for (const slot of source.timetable[i] ?? []) {
        if (slot.period < 1 || slot.period > MAX_PERIODS) continue;
        padTo(day, slot.period);
        const base = slot.original ?? slot;
        day[slot.period - 1] = { subject: cleanText(base.subject), teacher: cleanText(base.teacher) };
      }
      return day;
    });
    await writeFull(ctx, () => days, source.day_time);
    return null;
  },
});

export const setFullSlot = adminMutation({
  args: { day: v.number(), period: v.number(), subject: v.string(), teacher: v.string() },
  returns: v.null(),
  handler: async (ctx, { day, period, subject, teacher }) => {
    assertDay(day);
    assertPeriodCount(period, 1, "period");
    await writeFull(ctx, (days) => {
      // Editing past the end of a short day extends it with blanks.
      padTo(days[day]!, period);
      days[day]![period - 1] = { subject: cleanText(subject), teacher: cleanText(teacher) };
      return days;
    });
    return null;
  },
});

export const setFullDayLength = adminMutation({
  args: { day: v.number(), length: v.number() },
  returns: v.null(),
  handler: async (ctx, { day, length }) => {
    assertDay(day);
    assertPeriodCount(length, 0, "length");
    await writeFull(ctx, (days) => {
      padTo(days[day]!, length);
      days[day] = days[day]!.slice(0, length);
      return days;
    });
    return null;
  },
});
