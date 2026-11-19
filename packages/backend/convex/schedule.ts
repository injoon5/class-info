import { internalAction, internalMutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { adminMutation } from "./auth";
import { HOME_DDAY_LIMIT, HOME_EVENT_WINDOW_DAYS, SCHOOL } from "./config";
import {
  SCHOOL_DAY_LOOKAHEAD,
  addDays,
  assertYmd,
  closedYmdsFromSchedule,
  daysBetween,
  resolveDisplayDay,
  scheduleWindow,
  schoolClock,
  ymdFromParts,
  type SchoolClock,
} from "./dates";
import { fetchSchoolApi } from "./schoolApi";
import {
  customEventColor,
  isCustomEventColor,
  publicEvent,
  schoolClockArgs,
  type PublicEvent,
} from "./validators";

type FeedEvent = {
  AA_YMD: string; // YYYYMMDD
  EVENT_NM: string;
  SBTR_DD_SC_NM?: string;
  SD_SCHUL_CODE?: string;
};

const TITLE_MAX = 100;
const RANGE_MAX_DAYS = 400;
// NEIS marks every Saturday this way; nobody needs to be told.
const NOISE_TITLES = new Set(["토요휴업일"]);

function projectEvent(e: Doc<"schedules">): PublicEvent | null {
  if (NOISE_TITLES.has(e.title)) return null;
  return {
    _id: e._id,
    date: e.date,
    title: e.title,
    source: e.source,
    ...(e.eventType !== undefined ? { eventType: e.eventType } : {}),
    ...(isCustomEventColor(e.color) ? { color: e.color } : {}),
    ...(e.dday ? { dday: true } : {}),
  };
}

function projectEvents(rows: Doc<"schedules">[]): PublicEvent[] {
  return rows.map(projectEvent).filter((e): e is PublicEvent => e !== null);
}

// ── School feed ──────────────────────────────────────────────────────────

// \u0000 can't occur in a date or a title, so it can't be forged by one.
function ddayKey(date: string, title: string): string {
  return `${date}\u0000${title}`;
}

export const replaceSchoolEvents = internalMutation({
  args: {
    events: v.array(
      v.object({
        date: v.string(),
        title: v.string(),
        eventType: v.string(),
        schoolCode: v.string(),
      })
    ),
    start: v.string(), // YYYYMMDD — the range the events replace
    end: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { events, start, end }) => {
    // An empty payload (upstream hiccup) must not wipe the range.
    if (events.length === 0) return null;

    const existing = await ctx.db
      .query("schedules")
      .withIndex("by_date", (q) => q.gte("date", start).lte("date", end))
      .collect();
    const replaced = existing.filter((ev) => ev.source === "school");

    // The feed has no stable id, so a D-day set on a school event is carried
    // over by (date, title).
    const carriedDdays = new Set(
      replaced.filter((ev) => ev.dday === true).map((ev) => ddayKey(ev.date, ev.title))
    );
    for (const ev of replaced) await ctx.db.delete(ev._id);

    const now = Date.now();
    for (const ev of events) {
      const dday = carriedDdays.has(ddayKey(ev.date, ev.title));
      await ctx.db.insert("schedules", {
        ...ev,
        source: "school",
        ...(dday ? { dday: true } : {}),
        createdAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

// The current school year plus a month either side — the same window the
// calendar lets users page through — fetched three months per request.
export const fetchWindow = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const window = scheduleWindow(schoolClock().today);
    for (let start = window.start; start <= window.end; ) {
      const next = ymdFromParts(Number(start.slice(0, 4)), Number(start.slice(4, 6)) + 3, 1);
      const end = addDays(next, -1) < window.end ? addDays(next, -1) : window.end;
      const data = await fetchSchoolApi("schedule", { startdate: start, enddate: end });
      if (Array.isArray(data)) {
        const events = (data as FeedEvent[])
          .filter((d) => d.AA_YMD && d.EVENT_NM)
          .map((d) => ({
            date: d.AA_YMD,
            title: d.EVENT_NM,
            eventType: d.SBTR_DD_SC_NM ?? "",
            schoolCode: d.SD_SCHUL_CODE ?? SCHOOL.code,
          }));
        await ctx.runMutation(internal.schedule.replaceSchoolEvents, { events, start, end });
      }
      start = next;
    }
    return null;
  },
});

// ── Queries ──────────────────────────────────────────────────────────────

export const getEventsInRange = query({
  args: { start: v.string(), end: v.string() },
  returns: v.array(publicEvent),
  handler: async (ctx, { start, end }) => {
    assertYmd(start, "start");
    assertYmd(end, "end");
    const span = daysBetween(start, end);
    if (span < 0 || span > RANGE_MAX_DAYS) return [];
    const rows = await ctx.db
      .query("schedules")
      .withIndex("by_date", (q) => q.gte("date", start).lte("date", end))
      .collect();
    return projectEvents(rows);
  },
});

// One scan serving both home questions. It reaches a full lookahead behind
// today because a break is only marked on its first day.
async function scanSchoolDays(ctx: QueryCtx, clock: SchoolClock) {
  assertYmd(clock.today, "today");
  const scanStart = addDays(clock.today, -SCHOOL_DAY_LOOKAHEAD);
  const scanEnd = addDays(clock.today, SCHOOL_DAY_LOOKAHEAD + HOME_EVENT_WINDOW_DAYS);
  const rows = await ctx.db
    .query("schedules")
    .withIndex("by_date", (q) => q.gte("date", scanStart).lte("date", scanEnd))
    .collect();
  const closed = closedYmdsFromSchedule(rows, scanStart, scanEnd);
  return { rows, displayDay: resolveDisplayDay(clock, closed) };
}

export const schoolDisplayDay = query({
  args: schoolClockArgs,
  returns: v.string(),
  handler: async (ctx, clock) => (await scanSchoolDays(ctx, clock)).displayDay,
});

// Home needs the display day *and* the events around it, out of one scan.
export const homeSchedule = query({
  args: schoolClockArgs,
  returns: v.object({
    displayDay: v.string(),
    events: v.array(publicEvent),
    ddays: v.array(publicEvent),
  }),
  handler: async (ctx, clock) => {
    const { rows, displayDay } = await scanSchoolDays(ctx, clock);
    const windowEnd = addDays(displayDay, HOME_EVENT_WINDOW_DAYS);
    const events = projectEvents(rows.filter((row) => row.date >= clock.today && row.date <= windowEnd));
    // Forward-only countdowns, on their own index: most D-days worth pinning
    // are further out than the day scan reaches.
    const ddayRows = await ctx.db
      .query("schedules")
      .withIndex("by_dday_date", (q) => q.eq("dday", true).gte("date", clock.today))
      .take(HOME_DDAY_LIMIT);
    return { displayDay, events, ddays: projectEvents(ddayRows) };
  },
});

// ── Admin ────────────────────────────────────────────────────────────────

// Works on school rows as well as custom ones — a countdown to the exam the
// feed already knows about is the common case.
export const setEventDday = adminMutation({
  args: { id: v.id("schedules"), dday: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { id, dday }) => {
    if (!(await ctx.db.get(id))) return null;
    await ctx.db.patch(id, { dday, updatedAt: Date.now() });
    return null;
  },
});

export const createCustomEvent = adminMutation({
  args: { date: v.string(), title: v.string(), color: customEventColor },
  returns: v.id("schedules"),
  handler: async (ctx, { date, title, color }) => {
    assertYmd(date, "date");
    const trimmed = title.trim();
    if (!trimmed) throw new Error("title is required");
    if (trimmed.length > TITLE_MAX) throw new Error("title is too long");
    const now = Date.now();
    return await ctx.db.insert("schedules", {
      date,
      title: trimmed,
      color,
      source: "custom",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Synced school events are never deleted by hand; the next sync would restore them.
export const deleteCustomEvent = adminMutation({
  args: { id: v.id("schedules") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (existing?.source === "custom") await ctx.db.delete(id);
    return null;
  },
});
