import {
  internalAction,
  internalMutation,
  mutation,
  query,
  type ActionCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./auth";
import { schoolDataUrl } from "./class";
import {
  addDaysYyyymmdd,
  assertYyyymmdd,
  closedYmdsFromSchedule,
  getNowKst,
  parseYyyymmdd,
  resolveSchoolDisplayYmd,
  SCHOOL_DAY_LOOKAHEAD,
} from "./dates";
import { projectSchedule } from "./project";
import { customEventColor, publicEvent, schoolClockArgs } from "./validators";

type ExternalScheduleEvent = {
  AA_YMD: string; // YYYYMMDD
  EVENT_NM: string;
  SBTR_DD_SC_NM: string;
  SD_SCHUL_CODE: string;
};

const TITLE_MAX = 100;

// \u0000 can't occur in a date or a title, so it can't be forged by one.
function ddayKey(date: string, title: string): string {
  return `${date}\u0000${title}`;
}

export const upsertManySchoolEvents = internalMutation({
  args: {
    events: v.array(
      v.object({
        date: v.string(),
        eventName: v.string(),
        eventType: v.string(),
        schoolCode: v.string(),
      })
    ),
    startdate: v.string(), // YYYYMMDD — range to clear before re-inserting
    enddate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { events, startdate, enddate }) => {
    // Never wipe the range on an empty payload — a transient upstream failure
    // (INFO-200 / network) would otherwise delete every school event in the
    // window with nothing to re-insert.
    if (events.length === 0) {
      console.log(`[schedule.upsertManySchoolEvents] range=${startdate}–${enddate} skipped (no events)`);
      return null;
    }

    const existing = await ctx.db
      .query("schedules")
      .withIndex("by_date", (q) => q.gte("date", startdate).lte("date", enddate))
      .collect();

    const toDelete = existing.filter((ev) => ev.source !== "custom");

    // A D-day an admin set on a school event has to outlive the row it was set
    // on: every sync deletes and re-inserts the whole range. The feed has no
    // stable id, so (date, title) is the identity that carries the flag over.
    const carriedDdays = new Set(
      toDelete.filter((ev) => ev.dday === true).map((ev) => ddayKey(ev.date, ev.title))
    );

    for (const ev of toDelete) {
      await ctx.db.delete(ev._id);
    }

    const now = Date.now();
    for (const ev of events) {
      const dday = carriedDdays.has(ddayKey(ev.date, ev.eventName));
      await ctx.db.insert("schedules", {
        date: ev.date,
        title: ev.eventName,
        source: "school",
        eventType: ev.eventType,
        schoolCode: ev.schoolCode,
        ...(dday ? { dday: true } : {}),
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`[schedule.upsertManySchoolEvents] range=${startdate}–${enddate} deleted=${toDelete.length} inserted=${events.length}`);
    return null;
  },
});

async function pullSchoolSchedule(
  ctx: ActionCtx,
  startdate: string,
  enddate: string,
  schoolcode: string
): Promise<void> {
  const url = schoolDataUrl("/schedule", { startdate, enddate, schoolcode });

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Failed to fetch schedule: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return;

  const events = (data as ExternalScheduleEvent[])
    .filter((d) => d.AA_YMD && d.EVENT_NM)
    .map((d) => ({
      date: d.AA_YMD,
      eventName: d.EVENT_NM,
      eventType: d.SBTR_DD_SC_NM ?? "",
      schoolCode: d.SD_SCHUL_CODE ?? schoolcode,
    }));

  console.log(`[schedule.pullSchoolSchedule] range=${startdate}–${enddate} events=${events.length}`);
  await ctx.runMutation(internal.schedule.upsertManySchoolEvents, { events, startdate, enddate });
}

function splitInto3MonthChunks(startdate: string, enddate: string) {
  const chunks: { start: string; end: string }[] = [];

  let curYear = parseInt(startdate.slice(0, 4));
  let curMonth = parseInt(startdate.slice(4, 6));
  let curStart = startdate;

  while (curStart <= enddate) {
    let endMonth = curMonth + 2;
    let endYear = curYear;
    if (endMonth > 12) {
      endMonth -= 12;
      endYear++;
    }

    const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    const chunkEnd = `${endYear}${pad(endMonth)}${pad(lastDay)}`;
    const actualEnd = chunkEnd < enddate ? chunkEnd : enddate;

    chunks.push({ start: curStart, end: actualEnd });

    if (actualEnd >= enddate) break;

    let nextMonth = endMonth + 1;
    let nextYear = endYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }

    curYear = nextYear;
    curMonth = nextMonth;
    curStart = `${nextYear}${pad(nextMonth)}01`;
  }

  return chunks;
}

// Fetches last December through next February — the window shown to users.
export const fetchScheduleWindow = internalAction({
  args: { schoolcode: v.string() },
  returns: v.null(),
  handler: async (ctx, { schoolcode }) => {
    const now = getNowKst();
    const y = now.getFullYear();
    const m = now.getMonth() + 1; // 1-12
    const startdate = `${y - 1}1201`;
    const nextFebYear = m <= 2 ? y : y + 1;
    const isLeap = (nextFebYear % 4 === 0 && nextFebYear % 100 !== 0) || nextFebYear % 400 === 0;
    const enddate = `${nextFebYear}02${isLeap ? "29" : "28"}`;

    const chunks = splitInto3MonthChunks(startdate, enddate);
    for (const chunk of chunks) {
      await pullSchoolSchedule(ctx, chunk.start, chunk.end, schoolcode);
    }
    return null;
  },
});

const RANGE_MAX_DAYS = 400;

export const getEventsInRange = query({
  args: { start: v.string(), end: v.string() },
  returns: v.array(publicEvent),
  handler: async (ctx, { start, end }) => {
    const startYmd = parseYyyymmdd(start);
    const endYmd = parseYyyymmdd(end);
    if (!startYmd || !endYmd || start > end) return [];
    const startUtc = Date.UTC(startYmd.y, startYmd.m - 1, startYmd.d);
    const endUtc = Date.UTC(endYmd.y, endYmd.m - 1, endYmd.d);
    if ((endUtc - startUtc) / 86_400_000 > RANGE_MAX_DAYS) return [];
    const rows = await ctx.db
      .query("schedules")
      .withIndex("by_date", (q) => q.gte("date", start).lte("date", end))
      .collect();
    return rows.map(projectSchedule).filter((e): e is NonNullable<typeof e> => e !== null);
  },
});

// How far past the display day the home page's event list reaches.
const HOME_EVENT_WINDOW_DAYS = 7;

// The home hero holds a couple of countdowns before it stops being a hero.
const HOME_DDAY_LIMIT = 3;

// One indexed pass over the schedule, wide enough to answer both questions the
// home page asks. It reaches a full lookahead *behind* today because a break
// already under way is only marked on its first day — see closedYmdsFromSchedule
// — and forward far enough to also cover the event window.
async function scanSchoolDays(ctx: QueryCtx, today: string, afterRollover: boolean) {
  assertYyyymmdd(today, "today");
  const scanStart = addDaysYyyymmdd(today, -SCHOOL_DAY_LOOKAHEAD);
  const scanEnd = addDaysYyyymmdd(today, SCHOOL_DAY_LOOKAHEAD + HOME_EVENT_WINDOW_DAYS);
  const rows = await ctx.db
    .query("schedules")
    .withIndex("by_date", (q) => q.gte("date", scanStart).lte("date", scanEnd))
    .collect();
  const closed = closedYmdsFromSchedule(
    rows.map((row) => ({
      date: row.date,
      title: row.title,
      eventType: row.eventType,
      source: row.source,
    })),
    scanStart,
    scanEnd,
  );
  return { rows, displayDay: resolveSchoolDisplayYmd(today, afterRollover, closed) };
}

export const schoolDisplayDay = query({
  args: schoolClockArgs,
  returns: v.string(),
  handler: async (ctx, { today, afterRollover }) => {
    const { displayDay } = await scanSchoolDays(ctx, today, afterRollover);
    return displayDay;
  },
});

// Home needs the display day *and* the events around it. Both come out of the
// same scan, so it costs one query and ships only the days actually rendered.
export const homeSchedule = query({
  args: schoolClockArgs,
  returns: v.object({
    displayDay: v.string(),
    events: v.array(publicEvent),
    ddays: v.array(publicEvent),
  }),
  handler: async (ctx, { today, afterRollover }) => {
    const { rows, displayDay } = await scanSchoolDays(ctx, today, afterRollover);
    const windowEnd = addDaysYyyymmdd(displayDay, HOME_EVENT_WINDOW_DAYS);
    const events = rows
      .filter((row) => row.date >= today && row.date <= windowEnd)
      .map(projectSchedule)
      .filter((e): e is NonNullable<typeof e> => e !== null);
    // Countdowns reach past the event window — that is the point of them — but
    // only forward: a date already gone is no longer being counted down to.
    //
    // Read on their own index rather than out of `rows`. The day scan ends a
    // fixed lookahead past today, so filtering it silently dropped every
    // countdown further out than that — which is most of the ones worth
    // pinning (수능, 기말고사, 졸업식). `by_dday_date` is already in date
    // order, so this is a bounded read of exactly the rows that render.
    const ddayRows = await ctx.db
      .query("schedules")
      .withIndex("by_dday_date", (q) => q.eq("dday", true).gte("date", today))
      .take(HOME_DDAY_LIMIT);
    const ddays = ddayRows
      .map(projectSchedule)
      .filter((e): e is NonNullable<typeof e> => e !== null);
    return { displayDay, events, ddays };
  },
});

// Sets the countdown flag. Works on school rows as well as custom ones — a
// countdown to the exam the feed already knows about is the common case.
export const setEventDday = mutation({
  args: { sessionToken: v.string(), id: v.id("schedules"), dday: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { sessionToken, id, dday }) => {
    await requireAdmin(ctx, sessionToken);
    const existing = await ctx.db.get(id);
    if (!existing) return null;
    await ctx.db.patch(id, { dday, updatedAt: Date.now() });
    return null;
  },
});

export const createCustomEvent = mutation({
  args: {
    sessionToken: v.string(),
    date: v.string(),
    title: v.string(),
    color: customEventColor,
  },
  returns: v.id("schedules"),
  handler: async (ctx, { sessionToken, date, title, color }) => {
    await requireAdmin(ctx, sessionToken);
    assertYyyymmdd(date, "date");
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

export const deleteCustomEvent = mutation({
  args: { sessionToken: v.string(), id: v.id("schedules") },
  returns: v.null(),
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdmin(ctx, sessionToken);
    const existing = await ctx.db.get(id);
    // Only allow deleting user-created events, never synced school events.
    if (!existing || existing.source !== "custom") return null;
    await ctx.db.delete(id);
    return null;
  },
});
